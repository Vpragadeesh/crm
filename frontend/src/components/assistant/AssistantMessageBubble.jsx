import { useState } from "react";
import { ChevronDown, ChevronUp, Database, BookOpen } from "lucide-react";
import AssistantDataChart from "./AssistantDataChart";
import AgentReasoningPanel from "./AgentReasoningPanel";
import ToolsSummary from "./ToolsSummary";

const formatTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function AssistantMessageBubble({ message, isLatest, isAdmin }) {
  const isAssistant = message.role === "assistant";
  const [queryOpen, setQueryOpen] = useState(false);

  const accent = isAdmin ? "border-orange-200" : "border-sky-200";

  const hasReasoning =
    isAssistant &&
    Array.isArray(message.agent_reasoning) &&
    message.agent_reasoning.length > 0;

  return (
    <div className={`flex chat-message ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[min(100%,42rem)] rounded-2xl px-4 py-3 shadow-sm ${
          isAssistant ? "bg-white border border-slate-200 text-slate-800" : "bg-sky-600 text-white"
        }`}
      >
        {isAssistant && message.workflow?.length > 0 && isLatest && (
          <div className="mb-3">
            <AssistantWorkflowInline steps={message.workflow} isAdmin={isAdmin} />
          </div>
        )}

        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

        {/* Tool execution badges */}
        {hasReasoning && (
          <div className="mt-2.5">
            <ToolsSummary reasoning={message.agent_reasoning} />
          </div>
        )}

        {isAssistant && message.query && (
          <div className={`mt-3 rounded-lg border ${accent} overflow-hidden`}>
            <button
              type="button"
              onClick={() => setQueryOpen((open) => !open)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <span className="inline-flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> Generated SQL
              </span>
              {queryOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {queryOpen && (
              <pre className="px-3 pb-3 text-[11px] leading-relaxed text-slate-700 overflow-x-auto whitespace-pre-wrap font-mono">
                {message.query}
              </pre>
            )}
          </div>
        )}

        {isAssistant && message.visualization && (
          <div className="mt-3">
            <AssistantDataChart visualization={message.visualization} />
          </div>
        )}

        {/* Agent reasoning panel */}
        {hasReasoning && (
          <div className="mt-3">
            <AgentReasoningPanel
              reasoning={message.agent_reasoning}
              autoExpand={isLatest}
            />
          </div>
        )}

        {/* RAG source citations (ASK mode) */}
        {isAssistant && Array.isArray(message.sources) && message.sources.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <BookOpen className="w-3.5 h-3.5" /> Sources:
            </span>
            {message.sources.map((src, i) => (
              <span
                key={`${src.source || "src"}-${i}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-[11px] text-slate-600"
                title={src.distance != null ? `relevance distance: ${src.distance}` : undefined}
              >
                {src.source || "document"}
              </span>
            ))}
          </div>
        )}

        <p className={`mt-2 text-[11px] ${isAssistant ? "text-slate-400" : "text-sky-100"}`}>
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

function AssistantWorkflowInline({ steps, isAdmin }) {
  const accent = isAdmin ? "text-orange-700" : "text-sky-700";
  const done = steps.filter((s) => s.status === "done").length;
  const active = steps.find((s) => s.status === "active");

  return (
    <p className={`text-[11px] ${accent}`}>
      Agent: {done}/{steps.length} steps
      {active ? ` · ${active.label}…` : ""}
    </p>
  );
}
