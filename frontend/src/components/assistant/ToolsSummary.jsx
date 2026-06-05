import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

/**
 * Horizontal row of tool execution badges.
 * Shows each unique tool called with count and status color.
 */
export default function ToolsSummary({ reasoning = [] }) {
  if (!reasoning || reasoning.length === 0) return null;

  // Extract tool calls only (skip pure reasoning / finalize steps)
  const toolSteps = reasoning.filter((s) => s.tool_name);
  if (toolSteps.length === 0) return null;

  // Aggregate: { tool_name: { count, hasError } }
  const toolMap = {};
  for (const step of toolSteps) {
    const name = step.tool_name;
    if (!toolMap[name]) {
      toolMap[name] = { count: 0, hasError: false };
    }
    toolMap[name].count += 1;
    if (
      step.tool_result?.error ||
      step.tool_result?.success === false ||
      step.status === "failure"
    ) {
      toolMap[name].hasError = true;
    }
  }

  const entries = Object.entries(toolMap);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {entries.map(([tool, { count, hasError }]) => {
        // All success → green, any failure → red
        const colorClasses = hasError
          ? "bg-red-50 border-red-200 text-red-700"
          : "bg-emerald-50 border-emerald-200 text-emerald-700";

        const Icon = hasError ? XCircle : CheckCircle2;

        return (
          <span
            key={tool}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${colorClasses}`}
            title={`${tool}: ${count} call${count !== 1 ? "s" : ""}${hasError ? " (has errors)" : ""}`}
          >
            <Icon className="w-3 h-3" />
            {tool}
            {count > 1 && (
              <span className="text-[10px] opacity-70">({count})</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
