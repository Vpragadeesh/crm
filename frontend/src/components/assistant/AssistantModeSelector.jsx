import { MessageSquare, Database, Zap } from "lucide-react";

/**
 * 3-way toggle component for Assistant Mode Selection.
 * Modes:
 * - "ask": Pure conversational assistant (no DB query / no execution).
 * - "query": Natural language to SQL query translator & execution.
 * - "agent": Multi-step reasoning agent with tool execution capabilities.
 */
export default function AssistantModeSelector({ mode, onChange, disabled = false }) {
  const modes = [
    {
      id: "ask",
      label: "Ask",
      icon: MessageSquare,
      description: "Chat conversationally with the AI without database querying",
      activeClass: "bg-white text-indigo-600 shadow-sm border-slate-200/50",
      iconColor: "text-indigo-500",
    },
    {
      id: "query",
      label: "Query",
      icon: Database,
      description: "Translate questions to SQL and retrieve CRM database data",
      activeClass: "bg-white text-emerald-600 shadow-sm border-slate-200/50",
      iconColor: "text-emerald-500",
    },
    {
      id: "agent",
      label: "Agent",
      icon: Zap,
      description: "Autonomous agent for multi-step tasks and actions (contacts, tasks, emails)",
      activeClass: "bg-white text-amber-600 shadow-sm border-slate-200/50",
      iconColor: "text-amber-500",
    },
  ];

  return (
    <div 
      className={`inline-flex items-center p-1 bg-slate-100/80 backdrop-blur-sm rounded-full border border-slate-200/60 shadow-inner select-none ${
        disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
      }`}
      role="radiogroup"
      aria-label="Assistant Mode Selector"
    >
      {modes.map((m) => {
        const isActive = mode === m.id;
        const Icon = m.icon;

        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onChange(m.id)}
            title={m.description}
            className={`group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ease-out border border-transparent ${
              isActive
                ? `${m.activeClass}`
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/40"
            }`}
          >
            <Icon 
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isActive ? `${m.iconColor} scale-110` : "text-slate-400 group-hover:scale-105"
              }`} 
            />
            <span>{m.label}</span>
            {isActive && m.id === "agent" && (
              <span className="relative flex h-1.5 w-1.5 ml-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
              </span>
            )}
            {isActive && m.id === "query" && (
              <span className="relative flex h-1.5 w-1.5 ml-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
