import { Cpu, Zap } from "lucide-react";

/**
 * Pill-style toggle to switch between standard query mode and agent mode.
 * Agent mode sends to /chat/agent which enables multi-step reasoning + CRM actions.
 */
export default function AgentModeToggle({ enabled, onChange, disabled = false, isAdmin = false }) {
  const accentOn = isAdmin
    ? "bg-orange-600 border-orange-600"
    : "bg-emerald-600 border-emerald-600";
  const accentOff = "bg-slate-200 border-slate-300";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label="Toggle agent mode"
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`group relative inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 select-none
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${enabled
          ? `${accentOn} text-white shadow-sm`
          : `${accentOff} text-slate-600 hover:border-slate-400`
        }`}
      title={
        disabled
          ? "Agent mode unavailable — support-chat service unreachable"
          : enabled
            ? "Agent mode ON — multi-step reasoning + CRM actions"
            : "Agent mode OFF — standard SQL query mode"
      }
    >
      {enabled ? (
        <Zap className="w-3.5 h-3.5" />
      ) : (
        <Cpu className="w-3.5 h-3.5" />
      )}

      <span>{enabled ? "Agent" : "Query"}</span>

      {/* Dot indicator */}
      <span
        className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
          enabled ? "bg-emerald-300 animate-pulse" : "bg-slate-400"
        }`}
      />
    </button>
  );
}
