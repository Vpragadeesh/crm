import toolAuditLog from "./toolAuditLog.service.js";
import { createCreateTaskTool } from "./tools/createTaskTool.js";
import { createUpdateContactTool } from "./tools/updateContactTool.js";
import { createSendEmailTool } from "./tools/sendEmailTool.js";
import { createExecuteQueryTool } from "./tools/executeQueryTool.js";

import * as taskService from "../tasks/task.service.js";
import * as contactService from "../contacts/contact.service.js";
import * as emailService from "../emails/email.service.js";

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
    this.registerTool("create_task", createCreateTaskTool(taskService));
    this.registerTool("update_contact", createUpdateContactTool(contactService));
    this.registerTool("send_email", createSendEmailTool(emailService));
    this.registerTool("execute_query", createExecuteQueryTool());
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
    return this.executeToolFromAgent(sessionContext, "execute_query", input);
  }

  /**
   * Create task tool - creates task in CRM
   */
  async createTask(sessionContext, input) {
    return this.executeToolFromAgent(sessionContext, "create_task", input);
  }

  /**
   * Update contact tool - updates contact fields
   */
  async updateContact(sessionContext, input) {
    return this.executeToolFromAgent(sessionContext, "update_contact", input);
  }

  /**
   * Send email tool - sends email through CRM
   */
  async sendEmail(sessionContext, input) {
    return this.executeToolFromAgent(sessionContext, "send_email", input);
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
