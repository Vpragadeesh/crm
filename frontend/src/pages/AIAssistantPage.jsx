import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Bot,
  Send,
  Sparkles,
  Trash2,
  MessageSquare,
  Loader2,
  ShieldCheck,
  Plus,
  PenLine,
  Check,
  X,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  createAssistantSession,
  getAssistantSessions,
  getAssistantSession,
  getAssistantHistory,
  sendAssistantMessage,
  sendAgentMessage,
  deleteAssistantSession,
  renameAssistantSession,
} from "../services/assistantService";
import AssistantMessageBubble from "../components/assistant/AssistantMessageBubble";
import AssistantWorkflow from "../components/assistant/AssistantWorkflow";
import AgentModeToggle from "../components/assistant/AgentModeToggle";
import { buildVisualization } from "../utils/assistantVisualization";

const QUICK_PROMPTS = [
  "Show me conversion rate by stage for this month",
  "Which contacts are most likely to close this week?",
  "Summarize overdue follow-ups by owner",
  "What changed in pipeline since last week?",
];

const AGENT_QUICK_PROMPTS = [
  "Find contacts with score above 80 and create follow-up tasks",
  "Show top 5 deals by value and update their status",
  "Send thank-you emails to recently closed deals",
  "Find overdue tasks and create reminders",
];

const formatTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const buildSessionTitleFromPrompt = (prompt) => {
  const normalized = String(prompt || "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized ? normalized.slice(0, 120) : "New chat";
};

const orderSessions = (list = []) => {
  return [...list].sort((a, b) => {
    const aTime = new Date(a.lastMessageAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.lastMessageAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
};

const enrichAssistantMessage = (message) => {
  if (!message || message.role !== "assistant") return message;

  const content = String(message.insight || message.content || "").trim();
  const queryResult = message.query_result ?? message.queryResult ?? null;
  const query = message.query || null;

  let visualization = message.visualization || null;
  if (!visualization && Array.isArray(queryResult) && queryResult.length > 0) {
    visualization = buildVisualization(queryResult, { query, title: "CRM data" });
  }

  return {
    ...message,
    content,
    query,
    query_result: queryResult,
    visualization,
  };
};

const normalizeMessages = (messages = []) => {
  return messages.map((m) => enrichAssistantMessage(m));
};

const SessionRow = ({
  session,
  isActive,
  renamingToken,
  renameValue,
  setRenameValue,
  onSelect,
  onBeginRename,
  onCancelRename,
  onSaveRename,
  onDelete,
  isAdmin,
}) => {
  const isRenaming = renamingToken === session.sessionToken;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const activeClass = isAdmin
    ? "border-orange-200 bg-orange-50"
    : "border-sky-200 bg-sky-50";

  return (
    <div
      className={`group relative rounded-xl border transition-colors ${isActive ? activeClass : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
        }`}
    >
      {isRenaming ? (
        <div className="flex items-center gap-1.5 px-2.5 py-2">
          <input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveRename(session.sessionToken);
              if (e.key === "Escape") onCancelRename();
            }}
            autoFocus
            className="h-7 flex-1 rounded-lg border border-slate-300 px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-300"
            maxLength={120}
          />
          <button
            onClick={() => onSaveRename(session.sessionToken)}
            className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
            title="Save (Enter)"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onCancelRename}
            className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
            title="Cancel (Escape)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 px-2.5 py-2.5">
          <button
            onClick={() => onSelect(session.sessionToken)}
            className="flex-1 min-w-0 text-left"
          >
            <p
              className={`text-sm truncate ${isActive ? "font-semibold text-slate-900" : "font-medium text-slate-700"
                }`}
            >
              {session.title || "New chat"}
            </p>
          </button>

          <div ref={menuRef} className="relative shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen((p) => !p); }}
              className={`h-6 w-6 inline-flex items-center justify-center rounded-md transition-opacity ${isActive ? "text-slate-500 hover:text-slate-700 hover:bg-slate-200/60" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
                } ${menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                }`}
              title="Options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-40 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                <button
                  onClick={() => { setMenuOpen(false); onBeginRename(session); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <PenLine className="w-3.5 h-3.5" /> Rename
                </button>
                <div className="border-t border-slate-100 mx-2" />
                <button
                  onClick={() => { setMenuOpen(false); onDelete(session.sessionToken); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AIAssistantPage = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [activeToken, setActiveToken] = useState("");
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [creatingSession, setCreatingSession] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [sending, setSending] = useState(false);
  const [agentWorkflow, setAgentWorkflow] = useState([]);
  const [hasDbConnection, setHasDbConnection] = useState(true);
  const [agentMode, setAgentMode] = useState(true);
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
  const [renamingToken, setRenamingToken] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [error, setError] = useState("");

  const endRef = useRef(null);
  const textareaRef = useRef(null);

  const sortedSessions = useMemo(() => orderSessions(sessions), [sessions]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const data = await getAssistantSessions();
      const nextSessions = orderSessions(data?.sessions || []);
      setSessions(nextSessions);
      setActiveToken((prev) => {
        if (prev && nextSessions.some((s) => s.sessionToken === prev)) {
          return prev;
        }
        return nextSessions[0]?.sessionToken || "";
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load chats.");
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const loadHistory = useCallback(async (token) => {
    setLoadingSession(true);
    setError("");
    try {
      const [historyData, sessionData] = await Promise.all([
        getAssistantHistory(token),
        getAssistantSession(token).catch(() => null),
      ]);

      const dbConnected = Boolean(sessionData?.session?.hasDbConnection ?? true);
      setHasDbConnection(dbConnected);

      const data = historyData;
      setMessages(normalizeMessages(data.messages || []));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load session history.");
      setMessages([]);
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    if (!activeToken) {
      setMessages([]);
      setHasDbConnection(true);
      return;
    }
    loadHistory(activeToken);
  }, [activeToken, loadHistory]);

  const handleCreateSession = useCallback(async () => {
    setError("");
    setCreatingSession(true);
    try {
      const data = await createAssistantSession({
        queryType: "mysql",
        systemInstructions: "Be concise and explain assumptions before final answers.",
      });

      setActiveToken(data.sessionToken);
      const dbConnected = Boolean(data?.session?.hasDbConnection ?? true);
      setHasDbConnection(dbConnected);

      setSessions((prev) =>
        orderSessions([
          {
            sessionToken: data.sessionToken,
            title: "New chat",
            queryType: data?.session?.queryType || "mysql",
            hasDbConnection: dbConnected,
            fallbackMode: data?.session?.fallbackMode || null,
            fallbackReason: data?.session?.fallbackReason || null,
            createdAt: data?.session?.createdAt || new Date().toISOString(),
            updatedAt: data?.session?.createdAt || new Date().toISOString(),
            lastMessageAt: data?.session?.createdAt || new Date().toISOString(),
            lastMessagePreview: "",
          },
          ...prev.filter((s) => s.sessionToken !== data.sessionToken),
        ])
      );

      setMessages([]);
      setSidebarOpenMobile(false);
      setTimeout(() => textareaRef.current?.focus(), 0);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not create assistant session.");
    } finally {
      setCreatingSession(false);
    }
  }, []);

  const handleDeleteSession = useCallback(async (token = activeToken) => {
    if (!token) return;

    try {
      await deleteAssistantSession(token);
    } catch {
      // Ignore delete errors and still clear local state.
    }

    let nextActive = "";
    setSessions((prev) => {
      const next = prev.filter((s) => s.sessionToken !== token);
      nextActive = next[0]?.sessionToken || "";
      return next;
    });

    if (token === activeToken) {
      setActiveToken(nextActive);
      setMessages([]);
    }

    setPrompt("");
    setHasDbConnection(true);
  }, [activeToken]);

  const beginRename = useCallback((session) => {
    setRenamingToken(session.sessionToken);
    setRenameValue(session.title || "");
  }, []);

  const cancelRename = useCallback(() => {
    setRenamingToken("");
    setRenameValue("");
  }, []);

  const saveRename = useCallback(
    async (token) => {
      const nextName = buildSessionTitleFromPrompt(renameValue);
      try {
        await renameAssistantSession(token, nextName);
        setSessions((prev) => prev.map((s) => (s.sessionToken === token ? { ...s, title: nextName } : s)));
        cancelRename();
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to rename chat.");
      }
    },
    [cancelRename, renameValue]
  );

  const handleSend = useCallback(async () => {
    if (!activeToken || !prompt.trim() || sending) return;

    const userText = prompt.trim();
    const optimistic = {
      role: "user",
      content: userText,
      query: null,
      query_result: null,
      insight: null,
      timestamp: new Date().toISOString(),
    };

    setPrompt("");
    setSending(true);
    setError("");
    setAgentWorkflow(
      agentMode
        ? [
            { id: "reason", label: "Agent reasoning about your request", status: "active" },
            { id: "tools", label: "Executing CRM actions", status: "pending" },
            { id: "finalize", label: "Preparing response", status: "pending" },
          ]
        : [
            { id: "translate", label: "Translating your question to SQL", status: "active" },
            { id: "execute", label: "Fetching data from CRM database", status: "pending" },
            { id: "visualize", label: "Building chart", status: "pending" },
            { id: "insight", label: "Summarizing with AI", status: "pending" },
          ]
    );
    setMessages((prev) => [...prev, optimistic]);

    try {
      let data;

      if (agentMode) {
        // Agent mode — POST /chat/agent
        data = await sendAgentMessage(activeToken, userText);
      } else {
        // Standard query mode — POST /chat
        data = await sendAssistantMessage(activeToken, {
          message: userText,
          executeQuery: hasDbConnection,
          generateInsight: true,
        });
      }

      setAgentWorkflow(data?.workflow || []);

      if (data?.response) {
        const assistantMessage = enrichAssistantMessage({
          ...data.response,
          query: data.executedQuery || data.response?.query,
          visualization: data.visualization || data.response.visualization,
          workflow: data.workflow,
          agent_reasoning: data.response?.agent_reasoning || null,
        });
        setMessages((prev) => [...prev, assistantMessage]);
      }

      setSessions((prev) =>
        orderSessions(
          prev.map((session) => {
            if (session.sessionToken !== activeToken) return session;

            return {
              ...session,
              title: session.title === "New chat" ? buildSessionTitleFromPrompt(userText) : session.title,
              lastMessagePreview: userText.slice(0, 240),
              lastMessageAt: new Date().toISOString(),
            };
          })
        )
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to send message.");
    } finally {
      setSending(false);
      setAgentWorkflow([]);
    }
  }, [activeToken, prompt, hasDbConnection, sending, agentMode]);

  const handleQuickPrompt = useCallback(
    (value) => {
      setPrompt(value);
      setTimeout(() => textareaRef.current?.focus(), 0);
    },
    []
  );

  return (
    <div className="h-full w-full bg-slate-50 p-0">
      <div className="h-full w-full border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden">
        <header className="px-4 sm:px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpenMobile((prev) => !prev)}
              className="md:hidden h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600"
              title="Toggle chats"
            >
              {sidebarOpenMobile ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 flex items-center gap-2">
              <Bot className={`w-6 h-6 ${isAdmin ? "text-orange-600" : "text-sky-600"}`} />
              Chat support
            </h1>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <p className="hidden sm:flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Agentic analytics · SQL via AI · charts from live CRM data
            </p>
            <button
              onClick={handleCreateSession}
              disabled={creatingSession}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl text-white disabled:opacity-60 ${isAdmin ? "bg-orange-600 hover:bg-orange-700" : "bg-sky-600 hover:bg-sky-700"}`}
            >
              {creatingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} New Chat
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 flex">
          <aside
            className={`border-r border-slate-100 bg-slate-50/70 w-full md:w-64 shrink-0 flex-col ${sidebarOpenMobile ? "flex" : "hidden"
              } md:flex`}
          >
            <div className="px-3 pt-3 pb-2">
              <button
                onClick={handleCreateSession}
                disabled={creatingSession}
                className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-xl text-white disabled:opacity-60 ${isAdmin ? "bg-orange-600 hover:bg-orange-700" : "bg-sky-600 hover:bg-sky-700"
                  }`}
              >
                {creatingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} New chat
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 space-y-1.5">
              {loadingSessions && (
                <div className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading chats...
                </div>
              )}

              {!loadingSessions && sortedSessions.length === 0 && (
                <p className="text-xs text-slate-500">No chats yet. Start a new one to begin.</p>
              )}

              {sortedSessions.map((session) => (
                <SessionRow
                  key={session.sessionToken}
                  session={session}
                  isActive={session.sessionToken === activeToken}
                  renamingToken={renamingToken}
                  renameValue={renameValue}
                  setRenameValue={setRenameValue}
                  onSelect={(token) => {
                    setActiveToken(token);
                    setSidebarOpenMobile(false);
                    setError("");
                  }}
                  onBeginRename={beginRename}
                  onCancelRename={cancelRename}
                  onSaveRename={saveRename}
                  onDelete={handleDeleteSession}
                  isAdmin={isAdmin}
                />
              ))}
            </div>


          </aside>

          <section className="flex-1 min-h-0 flex flex-col bg-white">
            <div className="px-4 sm:px-5 py-2.5 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Sparkles className="w-3.5 h-3.5" />
                {agentMode
                  ? "Agent mode — multi-step reasoning + CRM actions"
                  : "Ask in plain English → AI writes SQL → CRM runs it → chart + summary"}
              </div>
              <AgentModeToggle
                enabled={agentMode}
                onChange={setAgentMode}
                isAdmin={isAdmin}
              />
            </div>

            {!hasDbConnection && activeToken && (
              <div className="px-4 sm:px-5 py-2 border-b border-amber-100 bg-amber-50 text-xs text-amber-800">
                Database execution is unavailable for this session. Only text answers will be returned.
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/70">
              {!activeToken && (
                <div className="h-full grid place-items-center text-center">
                  <div className="max-w-md">
                    <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-700 font-medium">Start a new conversation</p>
                    <p className="text-sm text-slate-500 mt-1">Ask naturally, like you would in ChatGPT or Gemini.</p>
                    <button
                      onClick={handleCreateSession}
                      className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white ${isAdmin ? "bg-orange-600 hover:bg-orange-700" : "bg-sky-600 hover:bg-sky-700"
                        }`}
                    >
                      <Plus className="w-4 h-4" /> Start Chat
                    </button>
                  </div>
                </div>
              )}

              {activeToken && messages.length === 0 && !loadingSession && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    {agentMode ? "Try an agent workflow:" : "Try one of these:"}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(agentMode ? AGENT_QUICK_PROMPTS : QUICK_PROMPTS).map((item) => (
                      <button
                        key={item}
                        onClick={() => handleQuickPrompt(item)}
                        className={`text-left rounded-xl border p-3 text-sm transition-colors ${
                          agentMode
                            ? "border-emerald-200 bg-emerald-50/60 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-50"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {agentMode && <span className="mr-1">⚡</span>}
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loadingSession && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading conversation...
                </div>
              )}

              {messages.map((m, idx) => (
                <AssistantMessageBubble
                  key={`${m.timestamp || idx}-${idx}`}
                  message={m}
                  isLatest={idx === messages.length - 1 && !sending}
                  isAdmin={isAdmin}
                />
              ))}

              {sending && (
                <div className="max-w-md space-y-3">
                  <AssistantWorkflow steps={agentWorkflow} isAdmin={isAdmin} />
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Running agent workflow...
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>

            <footer className="p-3 sm:p-4 border-t border-slate-100 bg-white">
              {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={2}
                  placeholder={activeToken ? "Message Chat Support..." : "Select or create a chat to begin"}
                  className="flex-1 resize-none border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  disabled={!activeToken || sending}
                />
                <button
                  onClick={handleSend}
                  disabled={!activeToken || sending || !prompt.trim()}
                  className={`h-11 px-4 rounded-xl text-white inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${isAdmin ? "bg-orange-600 hover:bg-orange-700" : "bg-sky-600 hover:bg-sky-700"
                    }`}
                >
                  <Send className="w-4 h-4" /> Send
                </button>
              </div>
            </footer>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantPage;
