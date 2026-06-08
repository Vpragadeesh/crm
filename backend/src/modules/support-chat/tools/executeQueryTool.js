import { executeReadOnlyQuery } from "../assistantQuery.executor.js";
import supportChatV2Service from "../supportChatV2.service.js";

/**
 * Execute Query Tool - translates NL to SQL and optionally executes
 * Validates inputs and enforces tenant isolation
 */
export class ExecuteQueryTool {
  constructor() {}

  /**
   * Execute execute_query tool
   */
  async execute(sessionContext, input) {
    const { companyId, empId, sessionId } = sessionContext;
    const { question, executeQuery = true } = input;

    // 1. Validate required fields
    if (!question) {
      return {
        success: false,
        error: "'question' parameter is required",
      };
    }

    try {
      // 2. Delegate to SupportChatV2Service for SQL translation
      // The V2 service sendMessage with agentMode=false acts as a simple translation
      const response = await supportChatV2Service.sendMessage(sessionId, question, {
        execute_query: false,
        generate_insight: false,
        agent_mode: false,
      });

      const query = String(response?.query || "").trim();
      
      if (!query) {
        return {
          success: false,
          error: "No SQL query could be generated from the question.",
        };
      }

      // 3. Return early if we only need translation
      if (!executeQuery) {
        return {
          success: true,
          query,
          explanation: response.explanation || "Query generated successfully",
          confidence: response.confidence || 0.9,
          note: "Query translated but not executed.",
        };
      }

      // 4. Enforce tenant isolation and execute query against CRM database
      const execution = await executeReadOnlyQuery(query, {
        companyId,
        empId,
        // Optional role if needed, but executor relies mainly on companyId
      });

      // 5. Return tool result
      return {
        success: true,
        query: execution.executedQuery,
        query_result: execution.rows,
        explanation: response.explanation || "Query executed successfully",
        confidence: response.confidence || 0.9,
        note: `Executed query returning ${execution.rows.length} rows.`,
      };
    } catch (error) {
      // 6. Handle failures gracefully
      return {
        success: false,
        error: `Query execution failed: ${error.message}`,
      };
    }
  }
}

/**
 * Factory function to create tool instance
 */
export function createExecuteQueryTool() {
  return new ExecuteQueryTool();
}
