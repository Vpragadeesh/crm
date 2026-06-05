import jwt from "jsonwebtoken";
import * as supportChatService from "./supportChat.service.js";
import { executeReadOnlyQuery } from "./assistantQuery.executor.js";
import { buildVisualization } from "./assistantVisualization.js";
import { db } from "../../config/db.js";

const SESSION_TOKEN_SECRET = process.env.SUPPORT_CHAT_SESSION_SECRET || process.env.JWT_SECRET;
const SESSION_TOKEN_TTL = process.env.SUPPORT_CHAT_SESSION_TOKEN_TTL || "8h";
const SUPPORTED_QUERY_TYPES = new Set(["sql", "mysql", "postgresql", "sqlite", "mongodb", "pandas"]);
const MAX_RESULT_ROWS = 200;
const MAX_SESSION_TITLE_LENGTH = 120;
const MAX_SESSION_PREVIEW_LENGTH = 240;

const buildGuardrailInstructions = ({ companyId, empId, role }) => {
  return [
    `Tenant isolation is mandatory: every query on contacts, employees, tasks, or other company-scoped tables MUST include company_id = ${companyId} (use table alias, e.g. c.company_id = ${companyId}).`,
    `When filtering by assigned_emp_id = ${empId}, still add company_id = ${companyId} on the same table alias.`,
    `Current user context: emp_id = ${empId}, role = ${role}.`,
    `Important schema mapping for this CRM: "customers" refers to contacts with status = 'CUSTOMER', not a separate customers table.`,
    "When querying deal_value by customer, join deals -> opportunities -> contacts and apply tenant filter on contacts.company_id.",
    "Never expose data from other companies or infer hidden records.",
    "Prefer aggregated summaries unless the user explicitly asks for row-level details.",
    `Never execute any write/DDL statements. If query would exceed ${MAX_RESULT_ROWS} rows, reduce scope or add LIMIT ${MAX_RESULT_ROWS}.`,
  ].join(" ");
};

const normalizeTitle = (value = "") => {
  const normalized = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "New chat";
  return normalized.slice(0, MAX_SESSION_TITLE_LENGTH);
};

const isDefaultSessionTitle = (value = "") => {
  return normalizeTitle(value).toLowerCase() === "new chat";
};

const buildTitleFromMessage = (message = "") => {
  return normalizeTitle(String(message || "").slice(0, MAX_SESSION_TITLE_LENGTH));
};

const buildPreviewFromMessage = (message = "") => {
  return String(message || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SESSION_PREVIEW_LENGTH);
};

const createOrRestoreSessionMeta = async ({ companyId, empId, sessionId, queryType, hasDbConnection, fallbackMode, fallbackReason }) => {
  await db.query(
    `
      INSERT INTO assistant_chat_sessions (
        company_id,
        emp_id,
        support_chat_session_id,
        query_type,
        has_db_connection,
        fallback_mode,
        fallback_reason,
        title,
        last_message_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'New chat', NOW())
      ON DUPLICATE KEY UPDATE
        deleted_at = NULL,
        query_type = VALUES(query_type),
        has_db_connection = VALUES(has_db_connection),
        fallback_mode = VALUES(fallback_mode),
        fallback_reason = VALUES(fallback_reason),
        updated_at = CURRENT_TIMESTAMP
    `,
    [companyId, empId, sessionId, queryType, hasDbConnection ? 1 : 0, fallbackMode || null, fallbackReason || null]
  );
};

const getSessionMeta = async ({ companyId, empId, sessionId }) => {
  const [rows] = await db.query(
    `
      SELECT
        support_chat_session_id,
        title,
        query_type,
        has_db_connection,
        fallback_mode,
        fallback_reason,
        created_at,
        updated_at,
        last_message_at,
        last_message_preview
      FROM assistant_chat_sessions
      WHERE company_id = ?
        AND emp_id = ?
        AND support_chat_session_id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [companyId, empId, sessionId]
  );

  return rows[0] || null;
};

const touchSessionMetaAfterMessage = async ({ companyId, empId, sessionId, message }) => {
  const current = await getSessionMeta({ companyId, empId, sessionId });
  if (!current) return;

  const preview = buildPreviewFromMessage(message);
  const nextTitle = isDefaultSessionTitle(current.title) ? buildTitleFromMessage(message) : current.title;

  await db.query(
    `
      UPDATE assistant_chat_sessions
      SET
        title = ?,
        last_message_preview = ?,
        last_message_at = NOW(),
        updated_at = CURRENT_TIMESTAMP
      WHERE company_id = ?
        AND emp_id = ?
        AND support_chat_session_id = ?
        AND deleted_at IS NULL
    `,
    [nextTitle, preview || null, companyId, empId, sessionId]
  );
};

const signSessionToken = ({ sessionId, companyId, empId, queryType }) => {
  return jwt.sign(
    {
      sid: sessionId,
      cid: companyId,
      eid: empId,
      qt: queryType,
      typ: "assistant_session",
    },
    SESSION_TOKEN_SECRET,
    { expiresIn: SESSION_TOKEN_TTL }
  );
};

const verifySessionToken = (token) => {
  try {
    const decoded = jwt.verify(token, SESSION_TOKEN_SECRET);
    if (decoded?.typ !== "assistant_session" || !decoded?.sid) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
};

const resolveSessionId = (sessionToken, reqUser) => {
  const decoded = verifySessionToken(sessionToken);
  if (!decoded) {
    const error = new Error("Invalid or expired assistant session token");
    error.statusCode = 401;
    throw error;
  }

  if (decoded.cid !== reqUser.companyId || decoded.eid !== reqUser.empId) {
    const error = new Error("Assistant session does not belong to this user");
    error.statusCode = 403;
    throw error;
  }

  return decoded.sid;
};

export const health = async (_req, res, next) => {
  try {
    const status = await supportChatService.health();
    res.json({ success: true, status });
  } catch (error) {
    next(error);
  }
};

export const listSessions = async (req, res, next) => {
  try {
    const { companyId, empId } = req.user;
    const [rows] = await db.query(
      `
        SELECT
          support_chat_session_id,
          title,
          query_type,
          has_db_connection,
          fallback_mode,
          fallback_reason,
          created_at,
          updated_at,
          last_message_at,
          last_message_preview
        FROM assistant_chat_sessions
        WHERE company_id = ?
          AND emp_id = ?
          AND deleted_at IS NULL
        ORDER BY COALESCE(last_message_at, created_at) DESC, support_chat_session_id DESC
        LIMIT 200
      `,
      [companyId, empId]
    );

    const sessions = rows.map((row) => ({
      sessionToken: signSessionToken({
        sessionId: row.support_chat_session_id,
        companyId,
        empId,
        queryType: row.query_type || "mysql",
      }),
      title: normalizeTitle(row.title),
      queryType: row.query_type,
      hasDbConnection: Boolean(row.has_db_connection),
      fallbackMode: row.fallback_mode || null,
      fallbackReason: row.fallback_reason || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastMessageAt: row.last_message_at,
      lastMessagePreview: row.last_message_preview || "",
    }));

    res.json({ success: true, sessions });
  } catch (error) {
    next(error);
  }
};

export const createSession = async (req, res, next) => {
  try {
    const { companyId, empId, role } = req.user;
    const requestedType = String(req.body?.queryType || "mysql").toLowerCase();

    if (!SUPPORTED_QUERY_TYPES.has(requestedType)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported queryType",
      });
    }

    const userInstructions = String(req.body?.systemInstructions || "").trim();
    const systemInstructions = [
      buildGuardrailInstructions({ companyId, empId, role }),
      userInstructions,
    ]
      .filter(Boolean)
      .join(" ");

    const session = await supportChatService.createSession({
      queryType: requestedType,
      systemInstructions,
      companyId,
    });

    const sessionToken = signSessionToken({
      sessionId: session.session_id,
      companyId,
      empId,
      queryType: requestedType,
    });

    await createOrRestoreSessionMeta({
      companyId,
      empId,
      sessionId: session.session_id,
      queryType: session.query_type || requestedType,
      hasDbConnection: Boolean(session.has_db_connection ?? session.execution_mode === "crm_backend"),
      fallbackMode: session.fallback_mode || null,
      fallbackReason: session.fallback_reason || null,
    });

    res.status(201).json({
      success: true,
      sessionToken,
      session: {
        queryType: session.query_type,
        createdAt: session.created_at,
        hasDbConnection: Boolean(session.has_db_connection ?? session.execution_mode === "crm_backend"),
        fallbackMode: session.fallback_mode || null,
        fallbackReason: session.fallback_reason || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getSession = async (req, res, next) => {
  try {
    const sessionId = resolveSessionId(req.params.sessionToken, req.user);
    const session = await supportChatService.getSession(sessionId);
    const meta = await getSessionMeta({
      companyId: req.user.companyId,
      empId: req.user.empId,
      sessionId,
    });

    res.json({
      success: true,
      session: {
        queryType: session.query_type,
        title: meta?.title ? normalizeTitle(meta.title) : "New chat",
        createdAt: session.created_at,
        messageCount: session.message_count,
        hasDbConnection: Boolean(session.has_db_connection ?? session.execution_mode === "crm_backend"),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const sessionId = resolveSessionId(req.params.sessionToken, req.user);
    const history = await supportChatService.getSessionHistory(sessionId);

    res.json({
      success: true,
      sessionToken: req.params.sessionToken,
      messages: history.messages || [],
    });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const sessionId = resolveSessionId(req.params.sessionToken, req.user);
    const companyId = req.user.companyId;
    const empId = req.user.empId;
    const message = String(req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({ success: false, message: "message is required" });
    }

    if (message.length > 5000) {
      return res.status(400).json({ success: false, message: "message is too long" });
    }

    const requestedExecution = req.body?.executeQuery !== false;
    const generateInsight = req.body?.generateInsight !== false;
    const externalResult = req.body?.queryResult ?? null;

    const workflow = [];

    if (externalResult !== null) {
      workflow.push(
        { id: "insight", label: "Generating insight from provided data", status: "active" },
      );

      const response = await supportChatService.insightFromResults(sessionId, {
        message,
        queryResult: externalResult,
      });

      workflow[0].status = "done";

      const visualization = buildVisualization(externalResult, { title: "Results" });

      await touchSessionMetaAfterMessage({ companyId, empId, sessionId, message });

      return res.json({
        success: true,
        response,
        visualization,
        workflow,
      });
    }

    workflow.push({ id: "translate", label: "Translating your question to SQL", status: "active" });

    const translation = await supportChatService.translateMessage(sessionId, message);
    workflow[0].status = "done";

    let generatedQuery = String(translation?.query || "").trim();
    let executedQuery = generatedQuery;
    let response = translation;
    let queryResult = null;
    let visualization = null;
    let executionError = null;
    let tenantScoped = false;

    if (!generatedQuery) {
      await touchSessionMetaAfterMessage({ companyId, empId, sessionId, message });
      return res.json({
        success: true,
        response,
        visualization: { type: "none", message: "No query was required for this answer." },
        workflow,
      });
    }

    if (requestedExecution) {
      workflow.push({ id: "execute", label: "Fetching data from CRM database", status: "active" });

      try {
        const execution = await executeReadOnlyQuery(generatedQuery, {
          companyId,
          empId,
          role: req.user.role,
        });
        queryResult = execution.rows;
        executedQuery = execution.executedQuery;
        tenantScoped = execution.wasScoped;
        workflow[workflow.length - 1].status = "done";
      } catch (error) {
        executionError = error.message || "Query execution failed";
        workflow[workflow.length - 1].status = "error";
        response = {
          ...translation,
          content: `${translation.content || translation.explanation || ""}\n\n⚠️ ${executionError}`.trim(),
          query: executedQuery || generatedQuery,
          query_result: null,
          insight: null,
        };

        await touchSessionMetaAfterMessage({ companyId, empId, sessionId, message });
        return res.json({
          success: true,
          response,
          visualization: { type: "error", message: executionError, query: generatedQuery },
          workflow,
          executionError,
        });
      }

      workflow.push({ id: "visualize", label: "Preparing chart", status: "active" });
      visualization = buildVisualization(queryResult, {
        title: "CRM data",
        query: executedQuery,
      });
      workflow[workflow.length - 1].status = "done";

      if (generateInsight && queryResult) {
        workflow.push({ id: "insight", label: "Summarizing with AI", status: "active" });
        const insightResponse = await supportChatService.insightFromResults(sessionId, {
          message,
          queryResult,
        });
        workflow[workflow.length - 1].status = "done";

        response = {
          ...insightResponse,
          query: executedQuery,
          query_result: queryResult,
          insight: insightResponse.insight || insightResponse.content,
          content: insightResponse.insight || insightResponse.content || translation.content,
        };
      } else {
        response = {
          ...translation,
          query: executedQuery,
          query_result: queryResult,
          content: translation.explanation || translation.content,
        };
      }

    }

    await touchSessionMetaAfterMessage({ companyId, empId, sessionId, message });

    res.json({
      success: true,
      response,
      visualization,
      workflow,
      executionError,
      tenantScoped,
      executedQuery,
    });
  } catch (error) {
    next(error);
  }
};

export const renameSession = async (req, res, next) => {
  try {
    const sessionId = resolveSessionId(req.params.sessionToken, req.user);
    const title = normalizeTitle(req.body?.title || "");

    const [result] = await db.query(
      `
        UPDATE assistant_chat_sessions
        SET title = ?, updated_at = CURRENT_TIMESTAMP
        WHERE support_chat_session_id = ?
          AND company_id = ?
          AND emp_id = ?
          AND deleted_at IS NULL
      `,
      [title, sessionId, req.user.companyId, req.user.empId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    res.json({ success: true, session: { title } });
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (req, res, next) => {
  try {
    const sessionId = resolveSessionId(req.params.sessionToken, req.user);

    try {
      await supportChatService.deleteSession(sessionId);
    } catch {
      // Ignore upstream delete failures so users can still clear stale sessions from CRM.
    }

    await db.query(
      `
        UPDATE assistant_chat_sessions
        SET deleted_at = NOW(), updated_at = CURRENT_TIMESTAMP
        WHERE support_chat_session_id = ?
          AND company_id = ?
          AND emp_id = ?
          AND deleted_at IS NULL
      `,
      [sessionId, req.user.companyId, req.user.empId]
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const sendAgentMessage = async (req, res, next) => {
  try {
    const { companyId, empId } = req.user;
    const sessionId = resolveSessionId(req.params.sessionToken, req.user);
    const message = String(req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({ success: false, message: "message is required" });
    }

    if (message.length > 5000) {
      return res.status(400).json({ success: false, message: "message is too long (max 5000 characters)" });
    }

    // Send message to support-chat API in agent mode
    const response = await supportChatService.sendMessage(sessionId, message, {
      executeQuery: true,
      generateInsight: false,
      agentMode: true, // Enable agent mode
    });

    // Update session metadata with agent information
    if (response.agent_reasoning && Array.isArray(response.agent_reasoning)) {
      const toolNames = response.agent_reasoning
        .filter((step) => step.tool_name)
        .map((step) => step.tool_name);

      const uniqueTools = [...new Set(toolNames)];

      const reasoningSummary = response.agent_reasoning
        .map((step) => `Step ${step.step}: ${step.action}`)
        .join(" → ");

      await db.query(
        `
          UPDATE assistant_chat_sessions
          SET
            last_agent_step_count = ?,
            agent_tools_used = ?,
            reasoning_trace_summary = ?,
            title = CASE WHEN title = 'New chat' THEN ? ELSE title END,
            last_message_preview = ?,
            last_message_at = NOW(),
            updated_at = CURRENT_TIMESTAMP
          WHERE support_chat_session_id = ?
            AND company_id = ?
            AND emp_id = ?
            AND deleted_at IS NULL
        `,
        [
          response.agent_reasoning.length,
          JSON.stringify(uniqueTools),
          reasoningSummary.slice(0, 5000),
          buildTitleFromMessage(message),
          buildPreviewFromMessage(message),
          sessionId,
          companyId,
          empId,
        ]
      );
    }

    res.json({
      success: true,
      response,
    });
  } catch (error) {
    next(error);
  }
};
