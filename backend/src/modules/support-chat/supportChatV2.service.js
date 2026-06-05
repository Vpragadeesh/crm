import axios from "axios";

const SUPPORT_CHAT_BASE_URL = (process.env.SUPPORT_CHAT_BASE_URL || "http://localhost:8000").replace(/\/$/, "");
const SUPPORT_CHAT_API_KEY = process.env.SUPPORT_CHAT_API_KEY;

const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY_MS: 300,
  RETRYABLE_STATUSES: [408, 429, 502, 503, 504],
};

const RETRYABLE_ERRORS = [
  "fetch failed",
  "econnreset",
  "etimedout",
  "enotfound",
  "eai_again",
  "socket hang up",
];

/**
 * Check if an error is retryable based on status code or message
 */
const isRetryableError = (error) => {
  const statusCode = error?.response?.status || error?.status;
  if (statusCode && RETRY_CONFIG.RETRYABLE_STATUSES.includes(statusCode)) {
    return true;
  }

  const message = String(error?.message || "").toLowerCase();
  return RETRYABLE_ERRORS.some((needle) => message.includes(needle));
};

/**
 * Sleep for a given number of milliseconds
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Normalize error details from support-chat response
 */
const normalizeErrorDetail = (detail) => {
  if (!detail) return "Unknown error";

  if (Array.isArray(detail)) {
    const preview = detail.slice(0, 3).map((item) => {
      if (typeof item === "string") return item;
      if (item?.msg) return `${item.msg}`;
      return JSON.stringify(item).slice(0, 100);
    });
    const suffix = detail.length > 3 ? ` (+${detail.length - 3} more)` : "";
    return `${preview.join("; ")}${suffix}`;
  }

  if (typeof detail === "object") {
    return detail.message || detail.error || JSON.stringify(detail).slice(0, 200);
  }

  return String(detail);
};

/**
 * Make HTTP request to support-chat API with retry logic
 */
const supportChatFetch = async (path, options = {}) => {
  let lastError = null;

  for (let attempt = 0; attempt <= RETRY_CONFIG.MAX_RETRIES; attempt++) {
    try {
      const response = await axios({
        method: options.method || "GET",
        url: `${SUPPORT_CHAT_BASE_URL}${path}`,
        data: options.body ? JSON.parse(options.body) : undefined,
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": SUPPORT_CHAT_API_KEY,
          ...(options.headers || {}),
        },
        timeout: options.timeout || 10000,
      });

      return response.data;
    } catch (error) {
      lastError = error;

      const statusCode = error?.response?.status;
      const isRetryable = isRetryableError(error);

      if (attempt < RETRY_CONFIG.MAX_RETRIES && isRetryable) {
        const delayMs = RETRY_CONFIG.BASE_DELAY_MS * (attempt + 1);
        await sleep(delayMs);
        continue;
      }

      // Not retryable, throw immediately
      if (statusCode) {
        const detail = error.response?.data?.detail;
        const prettyDetail = normalizeErrorDetail(detail);
        const err = new Error(prettyDetail || "Support Chat API request failed");
        err.statusCode = statusCode;
        err.raw = error.response?.data;
        throw err;
      }

      // Network error after retries exhausted
      break;
    }
  }

  // All retries failed
  const err = new Error("Support Chat service is temporarily unavailable. Please retry.");
  err.statusCode = 503;
  err.cause = lastError;
  throw err;
};

/**
 * SupportChatV2 Service - Wraps support-chat v0.2.0 API
 * Handles session creation, message routing, and agent reasoning
 */
export class SupportChatV2Service {
  /**
   * Create a new chat session with schema context
   */
  async createSession(queryType, schemaContext, dbUrl, systemInstructions, agentMode = true) {
    const payload = {
      query_type: queryType,
      schema_context: schemaContext || [],
      db_url: dbUrl || null,
      system_instructions: systemInstructions || "",
      agent_mode: agentMode,
    };

    const response = await supportChatFetch("/sessions", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return {
      sessionId: response.session_id,
      queryType: response.query_type,
      createdAt: response.created_at,
      hasDbConnection: response.has_db_connection,
      fallbackMode: response.fallback_mode || null,
      fallbackReason: response.fallback_reason || null,
    };
  }

  /**
   * Get session metadata
   */
  async getSession(sessionId) {
    const response = await supportChatFetch(`/sessions/${sessionId}`, {
      method: "GET",
    });

    return {
      sessionId: response.session_id,
      queryType: response.query_type,
      messageCount: response.message_count,
      createdAt: response.created_at,
      hasDbConnection: response.has_db_connection,
    };
  }

  /**
   * Get full conversation history
   */
  async getSessionHistory(sessionId) {
    const response = await supportChatFetch(`/sessions/${sessionId}/history`, {
      method: "GET",
    });

    return {
      sessionId: response.session_id,
      messages: response.messages || [],
    };
  }

  /**
   * Send a message to the chat session
   * Supports both standard and agent modes
   */
  async sendMessage(sessionId, message, options = {}) {
    const payload = {
      message,
      agent_mode: options.agentMode || false,
      execute_query: options.executeQuery !== undefined ? options.executeQuery : true,
      generate_insight: options.generateInsight !== undefined ? options.generateInsight : false,
      query_result: options.queryResult || null,
    };

    const response = await supportChatFetch(`/sessions/${sessionId}/chat`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    // Normalize response to consistent format
    return this._normalizeResponse(response);
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId) {
    await supportChatFetch(`/sessions/${sessionId}`, {
      method: "DELETE",
    });
  }

  /**
   * Check API health status
   */
  async healthCheck() {
    try {
      const response = await supportChatFetch("/health", {
        method: "GET",
        timeout: 5000,
      });
      return { status: response.status || "ok" };
    } catch (error) {
      if (error.statusCode && error.statusCode < 500) {
        return { status: "degraded", error: error.message };
      }
      return { status: "down", error: error.message };
    }
  }

  /**
   * Normalize support-chat response to internal ChatResponse format
   * @private
   */
  _normalizeResponse(rawResponse) {
    return {
      role: "assistant",
      content: rawResponse.content || "",
      query: rawResponse.query || undefined,
      query_result: rawResponse.query_result || undefined,
      insight: rawResponse.insight || undefined,
      timestamp: rawResponse.timestamp || new Date().toISOString(),
      agent_reasoning: this._normalizeAgentReasoning(rawResponse.agent_reasoning),
    };
  }

  /**
   * Normalize and validate agent reasoning array
   * @private
   */
  _normalizeAgentReasoning(reasoning) {
    if (!reasoning || !Array.isArray(reasoning) || reasoning.length === 0) {
      return undefined;
    }

    return reasoning.map((step, index) => ({
      step: step.step || index + 1,
      node: step.node || "execute_tool",
      tool_name: step.tool_name || undefined,
      tool_input: step.tool_input || undefined,
      tool_result: step.tool_result || undefined,
      action: step.action || "",
    }));
  }
}

// Export singleton instance
export default new SupportChatV2Service();
