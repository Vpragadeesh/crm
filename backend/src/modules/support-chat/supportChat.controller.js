import jwt from "jsonwebtoken";
import * as supportChatService from "./supportChat.service.js";
import { validateExecutedQuery } from "./assistantQuery.executor.js";
import { db } from "../../config/db.js";
import toolAuditLog from "./toolAuditLog.service.js";
import sessionManager from "./sessionManager.service.js";

const SESSION_TOKEN_SECRET = process.env.SUPPORT_CHAT_SESSION_SECRET || process.env.JWT_SECRET;
const SESSION_TOKEN_TTL = process.env.SUPPORT_CHAT_SESSION_TOKEN_TTL || "8h";
const SUPPORTED_QUERY_TYPES = new Set(["sql", "mysql", "postgresql", "sqlite", "mongodb", "pandas"]);
const SUPPORTED_MODES = new Set(["ask", "visualize", "agent"]);
const MAX_RESULT_ROWS = 200;
const MAX_SESSION_TITLE_LENGTH = 120;
const MAX_SESSION_PREVIEW_LENGTH = 240;

/** Extract the raw Bearer token from the incoming request to forward upstream. */
const extractAuthToken = (req) => {
  const header = req.headers?.authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : null;
};

/**
 * Normalize the microservice's agent_reasoning (and tool_results) into the shape
 * the frontend AgentReasoningPanel / ToolsSummary expect:
 *   { step, node, tool_name, tool_input, tool_result, action }
 */
const normalizeAgentReasoning = (reasoning, toolResults) => {
  if (!Array.isArray(reasoning) || reasoning.length === 0) return null;

  const resultByToolName = {};
  if (Array.isArray(toolResults)) {
    for (const tr of toolResults) {
      const name = tr?.tool || tr?.tool_name;
      if (name && tr?.result !== undefined) resultByToolName[name] = tr.result;
    }
  }

  return reasoning.map((step, index) => {
    const toolName = step.tool_name || step.tool || undefined;
    return {
      step: step.step || index + 1,
      node: toolName ? "execute_tool" : "reason",
      tool_name: toolName,
      tool_input: step.tool_input || undefined,
      tool_result: step.tool_result ?? (toolName ? resultByToolName[toolName] : undefined),
      action: step.action || step.thought || (toolName ? `Called ${toolName}` : ""),
    };
  });
};

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

export const healthAssistant = async (_req, res, next) => {
  try {
    let dbStatus = "ok";
    try {
      await db.query("SELECT 1");
    } catch (dbError) {
      dbStatus = `error: ${dbError.message}`;
    }

    let supportChatStatus = "ok";
    try {
      await supportChatService.health();
    } catch (scError) {
      supportChatStatus = `error: ${scError.message}`;
    }

    const overallStatus = (dbStatus === "ok" && supportChatStatus === "ok") ? "ok" : "degraded";

    res.json({
      success: true,
      status: overallStatus,
      services: {
        db: dbStatus,
        supportChat: supportChatStatus,
      },
      agentModeEnabled: process.env.AGENT_MODE_ENABLED,
    });
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
    const agentMode = req.body?.agentMode === true;
    const userInstructions = String(req.body?.systemInstructions || "").trim();

    // 1. Validate queryType
    if (!SUPPORTED_QUERY_TYPES.has(requestedType)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported queryType. Must be one of: mysql, postgresql",
      });
    }

    // 2. Use SessionManager to initialize session with full support for agent mode and schema context
    let sessionResult;
    try {
      sessionResult = await sessionManager.initializeSession(companyId, empId, {
        queryType: requestedType,
        agentMode,
        systemInstructions: userInstructions,
        role,
        dbUrl: req.body?.db_url || null,
      });
    } catch (error) {
      // Check if it's a support-chat service unavailable error
      if (error.message.includes("unavailable") || error.message.includes("Cannot create session")) {
        return res.status(503).json({
          success: false,
          message: "Cannot initialize session; support chat service unreachable",
          error: error.message,
        });
      }
      throw error;
    }

    // 3. Return response with schema context and session info
    res.status(201).json({
      success: true,
      sessionToken: sessionResult.sessionToken,
      expiresIn: sessionResult.expiresIn,
      supportChatSessionId: sessionResult.supportChatSessionId,
      schemaContext: sessionResult.schemaContext || [],
      fallback_mode: sessionResult.schemaError ? "schema-only" : null,
      fallback_reason: sessionResult.schemaError || null,
    });
  } catch (error) {
    if (error.message.includes("unavailable")) {
      return res.status(503).json({
        success: false,
        message: "Cannot initialize session; support chat service unreachable"
      });
    }
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
    const { companyId, empId } = req.user;
    const sessionId = resolveSessionId(req.params.sessionToken, req.user);
    const message = String(req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({ success: false, message: "message is required" });
    }
    if (message.length > 5000) {
      return res.status(400).json({ success: false, message: "message is too long (max 5000 characters)" });
    }

    // Resolve the interaction mode (ask | visualize | agent).
    const mode = String(req.body?.mode || "ask").toLowerCase();
    if (!SUPPORTED_MODES.has(mode)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported mode. Must be one of: ask, visualize, agent",
      });
    }

    // Agent mode is feature-flagged at the environment level.
    if (mode === "agent" && process.env.AGENT_MODE_ENABLED !== "true") {
      return res.status(403).json({
        success: false,
        message: "Agent mode is currently disabled in this environment.",
      });
    }

    const confirmed = req.body?.confirmed === true;
    const authToken = extractAuthToken(req);

    // Single mode-dispatched call. The microservice executes VISUALIZE SQL and
    // runs the AGENT ReAct loop itself; the forwarded JWT scopes both to this user.
    const raw = await supportChatService.chat(
      sessionId,
      { message, mode, confirmed },
      { authToken }
    );

    // ---- Defense-in-depth: validate any query the service reports it ran ----
    const executedQuery = raw.executed_query || raw.query || null;
    let queryResult = Array.isArray(raw.query_result) ? raw.query_result : null;
    let tenantWarning = null;

    if (executedQuery) {
      const guard = validateExecutedQuery(executedQuery, companyId);
      if (!guard.ok) {
        // The service already executed; the CRM refuses to surface the rows and warns.
        tenantWarning = guard.reason;
        queryResult = null;
        console.warn(
          `[assistant] tenant guard rejected results (company ${companyId}, emp ${empId}): ${guard.reason} :: ${executedQuery}`
        );
      }
    }

    const requiresConfirmation = raw.requires_confirmation === true;
    const pendingAction = raw.pending_action || null;
    const agentReasoning = normalizeAgentReasoning(raw.agent_reasoning, raw.tool_results);

    let content = raw.content || raw.insight || "";
    if (tenantWarning) {
      content = `${content}\n\n⚠️ ${tenantWarning}`.trim();
    }

    // Persist session metadata. Skip title/preview churn on a confirmation
    // continuation (the user is resending the same message with confirmed:true).
    if (!confirmed) {
      await touchSessionMetaAfterMessage({ companyId, empId, sessionId, message });
    }

    if (agentReasoning) {
      const uniqueTools = [...new Set(agentReasoning.filter((s) => s.tool_name).map((s) => s.tool_name))];
      const reasoningSummary = agentReasoning.map((s) => `Step ${s.step}: ${s.action}`).join(" → ");
      await db.query(
        `
          UPDATE assistant_chat_sessions
          SET last_agent_step_count = ?, agent_tools_used = ?, reasoning_trace_summary = ?, updated_at = CURRENT_TIMESTAMP
          WHERE support_chat_session_id = ? AND company_id = ? AND emp_id = ? AND deleted_at IS NULL
        `,
        [agentReasoning.length, JSON.stringify(uniqueTools), reasoningSummary.slice(0, 5000), sessionId, companyId, empId]
      );
    }

    res.json({
      success: true,
      requires_confirmation: requiresConfirmation,
      pending_action: pendingAction,
      response: {
        role: "assistant",
        mode,
        content,
        query: executedQuery,
        query_result: queryResult,
        sources: raw.sources || null,
        agent_reasoning: agentReasoning,
        tool_results: raw.tool_results || null,
        error: raw.error || null,
      },
      // Charts are built client-side from query_result; the service's chart
      // hint (chart_type / x / y / title) is passed through for reference.
      visualization: null,
      chartHint: raw.visualization || null,
      tenantWarning,
      workflow: [],
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

export const getAuditLog = async (req, res, next) => {
  try {
    const { companyId, empId } = req.user;
    const sessionId = resolveSessionId(req.params.sessionToken, req.user);

    // Parse and validate pagination parameters
    let limit = parseInt(req.query?.limit || "50", 10);
    let offset = parseInt(req.query?.offset || "0", 10);

    // Enforce limits
    if (isNaN(limit) || limit < 1) limit = 50;
    if (isNaN(offset) || offset < 0) offset = 0;
    if (limit > 500) limit = 500;

    // Retrieve audit logs with tenant isolation
    const auditData = await toolAuditLog.getAuditLog(companyId, sessionId, limit, offset);

    res.json({
      success: true,
      records: auditData.records,
      total: auditData.total,
      limit: auditData.limit,
      offset: auditData.offset,
    });
  } catch (error) {
    next(error);
  }
};
