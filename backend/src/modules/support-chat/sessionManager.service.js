import jwt from "jsonwebtoken";
import { db } from "../../config/db.js";
import supportChatV2Service from "./supportChatV2.service.js";
import schemaBuilder from "./schemaBuilder.service.js";
import { buildCrmDbUrl } from "./supportChat.service.js";

const SESSION_TOKEN_SECRET = process.env.SUPPORT_CHAT_SESSION_SECRET || process.env.JWT_SECRET;
const SESSION_TOKEN_TTL = process.env.SUPPORT_CHAT_SESSION_TOKEN_TTL || "8h";

if (!SESSION_TOKEN_SECRET) {
  console.warn("WARNING: SUPPORT_CHAT_SESSION_SECRET not configured. Using default JWT_SECRET.");
}

/**
 * SessionManager Service - Manages session lifecycle and JWT token mapping
 * Handles schema context building, session persistence, and token verification
 */
export class SessionManagerService {
  /**
   * Initialize a new session
   * Creates both CRM database record and support-chat session
   */
  async initializeSession(companyId, empId, options = {}) {
    const {
      queryType = "mysql",
      agentMode = true,
      systemInstructions = "",
    } = options;

    // Default to the CRM's own database so the microservice can execute
    // tenant-scoped VISUALIZE queries; an explicit dbUrl (or SUPPORT_CHAT_DB_URL)
    // overrides this.
    const dbUrl = options.dbUrl || buildCrmDbUrl();

    // 1. Build schema context from CRM database
    let schemaContext = [];
    let schemaError = null;
    try {
      schemaContext = await schemaBuilder.buildSchemaContext(companyId);
    } catch (error) {
      schemaError = error.message;
      console.error("Failed to build schema context:", error.message);
      // Fall back to default schema (not critical)
    }

    // 2. Inject tenant isolation guardrails into system instructions
    const guardrailInstructions = this._buildGuardrailInstructions({
      companyId,
      empId,
      role: options.role || "user",
    });

    const fullInstructions = [guardrailInstructions, systemInstructions]
      .filter(Boolean)
      .join(" ");

    // 3. Create session in support-chat API
    let supportChatSession;
    try {
      supportChatSession = await supportChatV2Service.createSession(
        queryType,
        schemaContext,
        dbUrl,
        fullInstructions,
        agentMode
      );
    } catch (error) {
      // If support-chat API fails, still try to create session locally with fallback
      console.error("Support-chat API error:", error.message);
      if (error.statusCode === 503 || error.statusCode === 502) {
        // Service unavailable, return error
        throw new Error("Support Chat service unavailable. Cannot create session.");
      }
      throw error;
    }

    // 4. Generate JWT token encapsulating session context
    const sessionToken = this._signSessionToken({
      supportChatSessionId: supportChatSession.sessionId,
      companyId,
      empId,
      queryType,
    });

    // 5. Store session metadata in CRM database
    await this._createSessionRecord({
      companyId,
      empId,
      supportChatSessionId: supportChatSession.sessionId,
      queryType,
      agentModeEnabled: agentMode,
      hasDbConnection: supportChatSession.hasDbConnection,
      fallbackMode: supportChatSession.fallbackMode,
      fallbackReason: supportChatSession.fallbackReason,
    });

    return {
      sessionToken,
      expiresIn: SESSION_TOKEN_TTL,
      supportChatSessionId: supportChatSession.sessionId,
      schemaContext,
      schemaError: schemaError || null,
    };
  }

  /**
   * Get session context for a given token
   */
  async getSessionContext(companyId, empId, supportChatSessionId) {
    const [rows] = await db.query(
      `
      SELECT
        support_chat_session_id,
        agent_mode_enabled,
        last_agent_step_count,
        agent_tools_used,
        reasoning_trace_summary,
        created_at,
        updated_at
      FROM assistant_chat_sessions
      WHERE company_id = ?
        AND emp_id = ?
        AND support_chat_session_id = ?
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [companyId, empId, supportChatSessionId]
    );

    if (!rows || rows.length === 0) {
      throw new Error("Session not found or expired");
    }

    const row = rows[0];
    return {
      supportChatSessionId: row.support_chat_session_id,
      agentModeEnabled: Boolean(row.agent_mode_enabled),
      lastAgentStepCount: row.last_agent_step_count,
      agentToolsUsed: row.agent_tools_used ? JSON.parse(row.agent_tools_used) : [],
      reasoningTraceSummary: row.reasoning_trace_summary,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map JWT token to support-chat session ID
   * Used to restore session context from token
   */
  mapTokenToSessionId(jwtToken) {
    try {
      const decoded = jwt.verify(jwtToken, SESSION_TOKEN_SECRET);

      if (decoded?.typ !== "assistant_session" || !decoded?.sid) {
        return null;
      }

      return {
        sessionId: decoded.sid,
        companyId: decoded.cid,
        empId: decoded.eid,
        queryType: decoded.qt,
      };
    } catch (error) {
      console.error("JWT verification failed:", error.message);
      return null;
    }
  }

  /**
   * Verify session token and extract claims
   */
  verifySessionToken(jwtToken) {
    const decoded = this.mapTokenToSessionId(jwtToken);
    if (!decoded) {
      throw new Error("Invalid or expired session token");
    }
    return decoded;
  }

  /**
   * Update session with agent metadata after request
   */
  async updateSessionMetaAfterAgentRequest(companyId, empId, supportChatSessionId, metadata) {
    const {
      lastAgentStepCount = 0,
      agentToolsUsed = [],
      reasoningTraceSummary = null,
    } = metadata;

    // Limit reasoning trace summary length
    const truncatedSummary = reasoningTraceSummary
      ? String(reasoningTraceSummary).slice(0, 5000)
      : null;

    const [result] = await db.query(
      `
      UPDATE assistant_chat_sessions
      SET
        last_agent_step_count = ?,
        agent_tools_used = ?,
        reasoning_trace_summary = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE company_id = ?
        AND emp_id = ?
        AND support_chat_session_id = ?
        AND deleted_at IS NULL
      `,
      [
        lastAgentStepCount,
        JSON.stringify(agentToolsUsed),
        truncatedSummary,
        companyId,
        empId,
        supportChatSessionId,
      ]
    );

    return result.affectedRows > 0;
  }

  /**
   * Clear schema context cache (useful after schema changes)
   */
  clearSchemaCacheForCompany(companyId) {
    schemaBuilder.clearCache(companyId);
  }

  /**
   * Build tenant isolation guardrail instructions
   * @private
   */
  _buildGuardrailInstructions({ companyId, empId, role }) {
    return [
      `You are a CRM assistant serving company_id = ${companyId}.`,
      `Tenant isolation is MANDATORY: only read/write rows where company_id = ${companyId}.`,
      `Current user: emp_id = ${empId}, role = ${role}.`,
      "Never expose data from other companies or access unauthorized records.",
      "Understand the CRM schema: LEAD → MQL → SQL → OPPORTUNITY → CUSTOMER → EVANGELIST.",
      "Important: There is NO customers table. 'Customer' means contacts with status = 'CUSTOMER'.",
      "When querying conversions, join deals → opportunities → contacts and filter by company_id.",
      "Prefer aggregated summaries unless user explicitly requests row-level details.",
      "Never execute INSERT/UPDATE/DELETE/DDL statements. Read-only access only.",
      "If results would exceed 200 rows, add LIMIT to reduce scope.",
    ].join(" ");
  }

  /**
   * Sign a JWT session token
   * @private
   */
  _signSessionToken({ supportChatSessionId, companyId, empId, queryType }) {
    return jwt.sign(
      {
        sid: supportChatSessionId, // session ID
        cid: companyId, // company ID
        eid: empId, // employee ID
        qt: queryType, // query type
        typ: "assistant_session", // token type
      },
      SESSION_TOKEN_SECRET,
      { expiresIn: SESSION_TOKEN_TTL }
    );
  }

  /**
   * Create session record in CRM database
   * @private
   */
  async _createSessionRecord({
    companyId,
    empId,
    supportChatSessionId,
    queryType,
    agentModeEnabled,
    hasDbConnection,
    fallbackMode,
    fallbackReason,
  }) {
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
        agent_mode_enabled,
        title,
        last_message_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'New chat', NOW())
      ON DUPLICATE KEY UPDATE
        deleted_at = NULL,
        query_type = VALUES(query_type),
        has_db_connection = VALUES(has_db_connection),
        fallback_mode = VALUES(fallback_mode),
        fallback_reason = VALUES(fallback_reason),
        agent_mode_enabled = VALUES(agent_mode_enabled),
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        companyId,
        empId,
        supportChatSessionId,
        queryType,
        hasDbConnection ? 1 : 0,
        fallbackMode,
        fallbackReason,
        agentModeEnabled ? 1 : 0,
      ]
    );
  }
}

// Export singleton instance
export default new SessionManagerService();
