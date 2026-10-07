import { AlertCircle, RotateCcw } from "lucide-react";

export default function ErrorBanner({ message, onRetry }) {
  if (!message) return null;

  return (
    <div className="glass flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-rose-300" style={{ animation: "fade-up 0.3s ease-out" }}>
      <AlertCircle size={16} className="shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors hover:bg-white/5"
          style={{ border: "1px solid rgba(244,63,94,0.3)" }}
        >
          <RotateCcw size={12} /> Try again
        </button>
      )}
    </div>
  );
}
