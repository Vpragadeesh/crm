import { ShieldAlert, Check, X, Loader2 } from "lucide-react";

/**
 * Confirmation gate for destructive AGENT actions.
 *
 * When the support-chat agent wants to run a destructive tool (e.g. send_email,
 * create_automation) it pauses and returns `pending_action`. This card surfaces
 * the pending tool + its inputs and lets the user Confirm (resend the same
 * message with confirmed:true) or Cancel.
 */
export default function PendingActionCard({ pendingAction, onConfirm, onCancel, confirming = false }) {
  if (!pendingAction) return null;

  const { tool, tool_input: toolInput, prompt } = pendingAction;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 shadow-sm">
      <div className="flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900">Confirmation required</p>
          <p className="mt-0.5 text-xs text-amber-800 leading-relaxed">
            {prompt || `The assistant wants to run "${tool}". Confirm to proceed.`}
          </p>

          {tool && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                {tool}
              </code>
            </div>
          )}

          {toolInput && Object.keys(toolInput).length > 0 && (
            <pre className="mt-2 p-2 rounded-md bg-white/70 border border-amber-200 text-[10px] text-amber-900 leading-relaxed font-mono overflow-x-auto max-h-40 overflow-y-auto">
              {JSON.stringify(toolInput, null, 2)}
            </pre>
          )}

          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirming}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60"
            >
              {confirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Confirm &amp; run
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={confirming}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-800 border border-amber-300 hover:bg-amber-100 disabled:opacity-60"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
