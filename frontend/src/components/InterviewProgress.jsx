import { TrendingUp, SkipForward, LogOut, Loader2 } from "lucide-react";

/**
 * InterviewProgress — Production telemetry bar for mock interview studio.
 * Displays:
 * - Current question number and total limit
 * - Progress percentage derived from actual progress
 * - Difficulty level badge
 * - Accessible progress bar
 * - Single, unified Skip Question and Quit Interview controls
 * - Last turn rubric feedback (when available)
 */
export default function InterviewProgress({
  questionNumber = 1,
  questionLimit = 5,
  difficulty = "medium",
  lastFeedback = null,
  onEnd = null,
  onSkip = null,
  isSkipping = false,
  isQuitting = false,
}) {
  const safeLimit = questionLimit && questionLimit > 0 ? questionLimit : 5;
  const safeNumber = questionNumber || 1;
  const pct = Math.min(100, Math.max(0, Math.round((safeNumber / safeLimit) * 100)));

  return (
    <section
      aria-label="Interview Progress"
      className="w-full rounded-2xl p-4 sm:p-5 transition-all duration-300"
      style={{
        background: "rgba(11, 11, 22, 0.75)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 12px 30px -10px rgba(0, 0, 0, 0.5), 0 0 20px rgba(139, 92, 246, 0.08)",
      }}
    >
      {/* Top Details & Unified Controls Bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Progress Numbers & Difficulty */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-semibold text-white text-sm">
            Question {safeNumber} of {questionLimit ?? "—"}
          </span>
          <span className="font-mono text-cyan-300 font-medium">
            ({pct}%)
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider border ${
              difficulty?.toLowerCase() === "easy"
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                : difficulty?.toLowerCase() === "hard"
                ? "bg-purple-500/10 text-purple-300 border-purple-500/25"
                : "bg-cyan-500/10 text-cyan-300 border-cyan-500/25"
            }`}
          >
            {difficulty || "Medium"}
          </span>
        </div>

        {/* Primary Action Controls: Skip Question & Quit Interview */}
        <div className="flex items-center gap-2">
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              disabled={isSkipping}
              aria-label="Skip this question"
              title="Skip Question"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-400/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSkipping ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  <span>Skipping...</span>
                </>
              ) : (
                <>
                  <SkipForward size={12} />
                  <span>Skip Question</span>
                </>
              )}
            </button>
          )}

          {onEnd && (
            <button
              type="button"
              onClick={onEnd}
              disabled={isQuitting}
              aria-label="Quit interview session"
              title="Quit Interview"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 hover:border-rose-400/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 transition-all cursor-pointer disabled:opacity-50"
            >
              {isQuitting ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  <span>Quitting...</span>
                </>
              ) : (
                <>
                  <LogOut size={12} />
                  <span>Quit Interview</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Accessible Progress Track */}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Interview progress: ${pct}% complete`}
        className="h-1.5 sm:h-2 w-full overflow-hidden rounded-full bg-white/10"
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400"
          style={{
            width: `${pct}%`,
            boxShadow: "0 0 10px rgba(34, 211, 238, 0.4)",
          }}
        />
      </div>

      {/* Turn-by-Turn Rubric Feedback (only rendered when available) */}
      {lastFeedback?.feedback && (
        <div
          className="mt-3.5 flex items-start gap-2.5 rounded-xl bg-purple-950/25 p-3 border border-purple-500/20"
          style={{ animation: "fade-up 0.3s ease-out" }}
        >
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
    </section>
  );
}

