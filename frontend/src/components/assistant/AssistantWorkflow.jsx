import { CheckCircle2, Circle, Loader2, AlertCircle } from "lucide-react";

const iconFor = (status) => {
  if (status === "done") return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
  if (status === "error") return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
  if (status === "active") return <Loader2 className="w-3.5 h-3.5 text-sky-500 animate-spin" />;
  return <Circle className="w-3.5 h-3.5 text-slate-300" />;
};

const toneFor = (status) => {
  if (status === "done") return "text-slate-700";
  if (status === "error") return "text-red-700";
  if (status === "active") return "text-slate-900 font-medium";
  return "text-slate-400";
};

export default function AssistantWorkflow({ steps = [], isAdmin = false }) {
  if (!steps.length) return null;

  const accent = isAdmin ? "border-orange-200 bg-orange-50/80" : "border-sky-200 bg-sky-50/80";

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${accent}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
        Agent workflow
      </p>
      <ul className="space-y-1.5">
        {steps.map((step) => (
          <li key={step.id} className={`flex items-center gap-2 text-xs ${toneFor(step.status)}`}>
            {iconFor(step.status)}
            <span>{step.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
