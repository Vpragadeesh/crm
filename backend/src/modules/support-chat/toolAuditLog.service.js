import { db } from "../../config/db.js";

/**
 * ToolAuditLog Service - Logs all agent tool executions to database
 * Provides immutable audit trail for compliance and debugging
 */
export class ToolAuditLogService {
  /**
   * Log a tool execution to audit table
   * Writes asynchronously to avoid blocking user interactions
   */
  async logToolExecution({
    companyId,
    empId,
    sessionId,
    toolName,
    toolInput = {},
    toolResult = null,
    status = "success",
    errorMessage = null,
    durationMs = 0,
  }) {
    try {
      // Write audit log asynchronously (don't await)
      this._writeAuditLog({
        companyId,
        empId,
        sessionId,
        toolName,
        toolInput,
        toolResult,
        status,
        errorMessage,
        durationMs,
      }).catch((error) => {
        console.error("Failed to write audit log:", error.message);
      });
    } catch (error) {
      // Silently fail - don't break user experience if audit logging fails
      console.error("Error queuing audit log:", error.message);
    }
  }

  /**
   * Write audit log to database
   * @private
   */
  async _writeAuditLog({
    companyId,
    empId,
    sessionId,
    toolName,
    toolInput,
    toolResult,
    status,
    errorMessage,
    durationMs,
  }) {
    await db.query(
      `
      INSERT INTO assistant_tool_executions (
        company_id,
        emp_id,
        session_id,
        tool_name,
        tool_input,
        tool_result,
        status,
        error_message,
        duration_ms,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      [
        companyId,
        empId,
        sessionId,
        toolName,
        JSON.stringify(toolInput || {}),
        JSON.stringify(toolResult || null),
        status,
        errorMessage || null,
        durationMs || 0,
      ]
    );
  }

  /**
   * Retrieve paginated audit logs for a session
   * Enforces tenant isolation - only returns user's company records
   */
  async getAuditLog(companyId, sessionId, limit = 50, offset = 0) {
    // Validate and enforce limits
    const maxLimit = 500;
    const validLimit = Math.min(Math.max(1, limit), maxLimit);
    const validOffset = Math.max(0, offset);

    // Query total count
    const [[{ total }]] = await db.query(
      `
      SELECT COUNT(*) as total
      FROM assistant_tool_executions
      WHERE company_id = ? AND session_id = ?
      `,
      [companyId, sessionId]
    );

    // Query paginated records (most recent first)
    const [records] = await db.query(
      `
      SELECT
        id,
        tool_name,
        tool_input,
        tool_result,
        status,
        error_message,
        duration_ms,
        created_at
      FROM assistant_tool_executions
      WHERE company_id = ? AND session_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
      `,
      [companyId, sessionId, validLimit, validOffset]
    );

    // Parse JSON fields
    const normalizedRecords = records.map((record) => ({
      id: record.id,
      tool_name: record.tool_name,
      tool_input: this._parseJSON(record.tool_input),
      tool_result: this._parseJSON(record.tool_result),
      status: record.status,
      error_message: record.error_message || null,
      duration_ms: record.duration_ms,
      created_at: record.created_at,
    }));

    return {
      records: normalizedRecords,
      total,
      limit: validLimit,
      offset: validOffset,
    };
  }

  /**
   * Get execution statistics by tool name
   */
  async getToolExecutionStats(companyId, toolName = null, days = 7) {
    const timeCutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let query = `
      SELECT
        tool_name,
        COUNT(*) as total_executions,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END) as failed,
        AVG(duration_ms) as avg_duration_ms,
        MAX(duration_ms) as max_duration_ms,
        MIN(duration_ms) as min_duration_ms
      FROM assistant_tool_executions
      WHERE company_id = ? AND created_at >= ?
    `;

    const params = [companyId, timeCutoff];

    if (toolName) {
      query += " AND tool_name = ?";
      params.push(toolName);
    }

    query += " GROUP BY tool_name";

    const [stats] = await db.query(query, params);

    return stats.map((row) => ({
      tool_name: row.tool_name,
      total_executions: row.total_executions,
      successful: row.successful,
      failed: row.failed,
      success_rate: (row.successful / row.total_executions * 100).toFixed(2) + "%",
      avg_duration_ms: Math.round(row.avg_duration_ms || 0),
      max_duration_ms: row.max_duration_ms,
      min_duration_ms: row.min_duration_ms,
    }));
  }

  /**
   * Parse JSON safely, returning null on error
   * @private
   */
  _parseJSON(jsonString) {
    if (!jsonString) return null;
    try {
      return typeof jsonString === "string" ? JSON.parse(jsonString) : jsonString;
    } catch (error) {
      console.error("Failed to parse JSON:", error.message);
      return null;
    }
  }
}

// Export singleton instance
export default new ToolAuditLogService();
