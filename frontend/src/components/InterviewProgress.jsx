import { PhoneOff, Sparkles, TrendingUp, SkipForward, LogOut } from "lucide-react";

/**
 * InterviewProgress — Futuristic telemetry bar for live mock interviews.
 * Displays current question milestone, percentage progress bar,
 * difficulty badge, skip question trigger, last turn rubric score,
 * and quit interview trigger with options.
 */
export default function InterviewProgress({
  questionNumber,
  questionLimit,
  difficulty,
  lastFeedback,
  onEnd,
  onSkip,
  isSkipping = false,
}) {
  const pct = questionLimit ? Math.min(100, Math.round((questionNumber / questionLimit) * 100)) : 0;

  return (
    <div
      className="w-full max-w-xl rounded-2xl p-4 sm:p-5 transition-all duration-300"
      style={{
        background: "rgba(14, 14, 28, 0.75)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.6), 0 0 20px rgba(139, 92, 246, 0.15)",
        animation: "fade-up 0.35s ease-out",
      }}
    >
      {/* Top Details */}
      <div className="mb-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">
            Question {questionNumber} of {questionLimit ?? "—"}
          </span>
          <span className="text-[11px] font-mono text-cyan-300">
            ({pct}%)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono text-cyan-300 border border-cyan-500/20 uppercase tracking-wider">
            {difficulty}
          </span>

          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              disabled={isSkipping}
              aria-label="Skip question"
              title="Skip Question"
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-400/50 transition-all cursor-pointer disabled:opacity-50"
            >
              <SkipForward size={12} />
              <span>Skip</span>
            </button>
          )}

          <button
            type="button"
            onClick={onEnd}
            aria-label="Quit interview"
            title="Quit Interview"
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-rose-300 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-500/50 transition-all cursor-pointer"
          >
            <LogOut size={12} />
            <span>Quit</span>
          </button>
        </div>
      </div>

      {/* Progress Track */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 p-0.5">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #3B82F6 0%, #8B5CF6 50%, #22D3EE 100%)",
            boxShadow: "0 0 10px rgba(34, 211, 238, 0.5)",
          }}
        />
      </div>

      {/* Turn-by-Turn Real-Time Rubric Feedback */}
      {lastFeedback?.feedback && (
        <div className="mt-3.5 flex items-start gap-2.5 rounded-xl bg-purple-950/30 p-3 border border-purple-500/20">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-300 mt-0.5">
            <TrendingUp size={12} />
          </div>
          <div className="text-xs leading-relaxed text-white/80">
            <span className="font-semibold text-cyan-300">
              Last Turn Rubric ({lastFeedback.score}/10):{" "}
            </span>
            <span>{lastFeedback.feedback}</span>
          </div>
        </div>
      )}
    </div>
  );
}
