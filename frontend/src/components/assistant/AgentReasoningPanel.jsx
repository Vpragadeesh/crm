import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Brain,
  Wrench,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

const nodeIcon = (node) => {
  if (node === "execute_tool") return <Wrench className="w-3.5 h-3.5 text-violet-500" />;
  if (node === "finalize") return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
  return <Brain className="w-3.5 h-3.5 text-sky-500" />;
};

const nodeLabel = (node) => {
  if (node === "execute_tool") return "Tool call";
  if (node === "finalize") return "Finalize";
  return "Reasoning";
};

function ReasoningStep({ step }) {
  const [resultOpen, setResultOpen] = useState(false);
  const hasResult = step.tool_result != null;
  const hasError =
    step.tool_result?.error ||
    step.tool_result?.success === false ||
    step.status === "failure";

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 transition-colors ${
        hasError
          ? "border-red-200 bg-red-50/60"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Step number */}
        <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
          {step.step}
        </span>

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 flex-wrap">
            {nodeIcon(step.node)}
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {nodeLabel(step.node)}
            </span>
            {step.tool_name && (
              <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">
                {step.tool_name}
              </code>
            )}
            {hasError && (
              <span className="inline-flex items-center gap-1 text-[10px] text-red-600 font-medium">
                <AlertTriangle className="w-3 h-3" /> Failed
              </span>
            )}
          </div>

          {/* Action description */}
          <p className="mt-1 text-xs text-slate-700 leading-relaxed">
            {step.action}
          </p>

          {/* Collapsible tool result */}
          {hasResult && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setResultOpen((o) => !o)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-700 transition-colors"
              >
                {resultOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                {resultOpen ? "Hide result" : "Show result"}
              </button>
              {resultOpen && (
                <pre className="mt-1.5 p-2 rounded-md bg-slate-50 border border-slate-200 text-[10px] text-slate-600 leading-relaxed font-mono overflow-x-auto max-h-40 overflow-y-auto">
                  {JSON.stringify(step.tool_result, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Collapsible panel that displays agent reasoning step-by-step.
 * Auto-expands on first render if autoExpand is true.
 */
export default function AgentReasoningPanel({
  reasoning = [],
  autoExpand = false,
}) {
  const [isOpen, setIsOpen] = useState(autoExpand);

  if (!reasoning || reasoning.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <span className="inline-flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-sky-500" />
          Show Thinking ({reasoning.length} step{reasoning.length !== 1 ? "s" : ""})
        </span>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Steps list */}
      {isOpen && (
        <div className="px-3 pb-3 space-y-2 max-h-96 overflow-y-auto">
          {reasoning.map((step, idx) => (
            <ReasoningStep key={step.step || idx} step={step} />
          ))}
        </div>
      )}
    </div>
  );
}
