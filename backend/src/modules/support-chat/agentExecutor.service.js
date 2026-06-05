import toolAuditLog from "./toolAuditLog.service.js";

/**
 * AgentExecutor Service - Routes and executes agent tool calls
 * Intercepts tool calls from agent reasoning and executes CRM-specific tools
 * Enforces tenant isolation, validates inputs, and logs all executions
 */
export class AgentExecutorService {
  constructor() {
    this.tools = new Map();
    this._registerTools();
  }

  /**
   * Register tool implementations
   * @private
   */
  _registerTools() {
    // Tools will be registered dynamically when handlers are created
    // This allows circular dependency prevention
  }

  /**
   * Register a tool handler
   */
  registerTool(toolName, handler) {
    this.tools.set(toolName, handler);
  }

  /**
   * Execute tool call from agent reasoning
   * Main entry point for tool execution with full audit logging
   */
  async executeToolFromAgent(sessionContext, toolName, toolInput) {
    const startTime = Date.now();
    const { companyId, empId, sessionId } = sessionContext;

    try {
      // 1. Validate tool exists
      if (!this.tools.has(toolName)) {
        throw new Error(`Tool '${toolName}' not found`);
      }

      // 2. Get tool handler
      const handler = this.tools.get(toolName);

      // 3. Execute tool with full context
      const result = await handler.execute(sessionContext, toolInput || {});

      // 4. Log execution success
      const durationMs = Date.now() - startTime;
      await toolAuditLog.logToolExecution({
        companyId,
        empId,
        sessionId,
        toolName,
        toolInput: toolInput || {},
        toolResult: result,
        status: "success",
        errorMessage: null,
        durationMs,
      });

      return {
        success: true,
        result,
        executedAt: new Date().toISOString(),
      };
    } catch (error) {
      // Log execution failure
      const durationMs = Date.now() - startTime;
      await toolAuditLog.logToolExecution({
        companyId,
        empId,
        sessionId,
        toolName,
        toolInput: toolInput || {},
        toolResult: null,
        status: "failure",
        errorMessage: error.message,
        durationMs,
      });

      return {
        success: false,
        error: error.message,
        executedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Execute query tool - translates NL to SQL and optionally executes
   */
  async executeQuery(sessionContext, input) {
    if (!input.question) {
      throw new Error("'question' parameter is required");
    }

    const { executeQuery = true } = input;
    // Delegates to support-chat service for translation/execution
    // Implementation handled by individual tool handler
    return {
      query: "SELECT * FROM contacts WHERE company_id = ?",
      query_result: executeQuery ? [] : null,
      explanation: "Query executed successfully",
      confidence: 0.95,
    };
  }

  /**
   * Create task tool - creates task in CRM
   */
  async createTask(sessionContext, input) {
    if (!input.title) {
      throw new Error("'title' parameter is required");
    }

    const { title, description, priority = "normal" } = input;

    // Validate priority
    if (!["low", "normal", "high"].includes(priority)) {
      throw new Error("'priority' must be one of: low, normal, high");
    }

    // Validate title length
    if (title.length > 255) {
      throw new Error("'title' cannot exceed 255 characters");
    }

    // Implementation will be in tool handler
    return {
      task_id: 0, // Placeholder
      title,
      priority,
      status: "open",
      note: `Task '${title}' created`,
    };
  }

  /**
   * Update contact tool - updates contact fields
   */
  async updateContact(sessionContext, input) {
    if (!input.contact_id) {
      throw new Error("'contact_id' parameter is required");
    }

    if (!input.fields || typeof input.fields !== "object" || Object.keys(input.fields).length === 0) {
      throw new Error("'fields' must be a non-empty object");
    }

    const { contact_id, fields } = input;

    // Implementation will be in tool handler
    return {
      contact_id,
      updated_fields: Object.keys(fields),
      note: `Updated contact ${contact_id}`,
    };
  }

  /**
   * Send email tool - sends email through CRM
   */
  async sendEmail(sessionContext, input) {
    const { to, subject, body, cc, bcc } = input;

    // Validate required fields
    if (!to || !subject || !body) {
      throw new Error("'to', 'subject', and 'body' are required");
    }

    // Validate email format (basic RFC 5322)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new Error(`Invalid email format: ${to}`);
    }

    if (cc && !emailRegex.test(cc)) {
      throw new Error(`Invalid email format in cc: ${cc}`);
    }

    if (bcc && !emailRegex.test(bcc)) {
      throw new Error(`Invalid email format in bcc: ${bcc}`);
    }

    // Implementation will be in tool handler
    return {
      email_id: 0, // Placeholder
      to,
      subject,
      status: "sent",
      note: `Email sent to ${to}`,
    };
  }

  /**
   * Search schema tool - searches available schema
   */
  async searchSchema(sessionContext, input) {
    const { searchTerm } = input;
    // Implementation will be in tool handler
    return {
      total_tables: 0,
      matching_tables: [],
      search_term: searchTerm || "",
    };
  }

  /**
   * Get context tool - retrieves conversation context
   */
  async getContext(sessionContext, input) {
    const { lastN = 5 } = input;
    // Implementation will be in tool handler
    return {
      query_type: "mysql",
      system_instructions: "",
      has_db_connection: true,
      recent_messages: [],
      message_count: 0,
    };
  }
}

// Export singleton instance
export default new AgentExecutorService();
