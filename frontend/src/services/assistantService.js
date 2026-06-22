import api from "./api";

export const createAssistantSession = async ({ queryType = "mysql", systemInstructions = "" } = {}) => {
  const { data } = await api.post("/assistant/sessions", {
    queryType,
    systemInstructions,
  });
  return data;
};

export const getAssistantSessions = async () => {
  const { data } = await api.get("/assistant/sessions");
  return data;
};

export const getAssistantSession = async (sessionToken) => {
  const { data } = await api.get(`/assistant/sessions/${sessionToken}`);
  return data;
};

export const getAssistantHistory = async (sessionToken) => {
  const { data } = await api.get(`/assistant/sessions/${sessionToken}/history`);
  return data;
};

/**
 * Send one chat turn. The mode (ask | visualize | agent) selects how the
 * support-chat microservice handles the message. `confirmed` resumes a paused
 * destructive AGENT action returned via requires_confirmation/pending_action.
 */
export const sendAssistantMessage = async (sessionToken, { message, mode = "ask", confirmed = false }) => {
  const { data } = await api.post(`/assistant/sessions/${sessionToken}/chat`, {
    message,
    mode,
    confirmed,
  });
  return data;
};

export const deleteAssistantSession = async (sessionToken) => {
  await api.delete(`/assistant/sessions/${sessionToken}`);
};

export const renameAssistantSession = async (sessionToken, title) => {
  const { data } = await api.patch(`/assistant/sessions/${sessionToken}`, { title });
  return data;
};

export const getAssistantHealth = async () => {
  const { data } = await api.get("/assistant/health");
  return data;
};
