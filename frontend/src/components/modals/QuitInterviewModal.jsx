import React from "react";
import { AlertCircle, Award, LogOut, ArrowRight, Loader2, Play } from "lucide-react";
import Modal from "./Modal";

/**
 * QuitInterviewModal — Presents structured options when a candidate decides to exit:
 * 1. End session and generate a rubric evaluation report from answered questions
 * 2. Discard session and return to studio/overview without saving
 * 3. Cancel and resume practicing
 */
export default function QuitInterviewModal({
  open,
  onClose,
  onQuitAndReport,
  onQuitAndDiscard,
  questionNumber = 1,
  questionLimit = 5,
  isQuitting = false,
}) {
  const answeredCount = Math.max(0, questionNumber - 1);

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col">
        {/* Header Badge & Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle size={20} />
          </div>
          <div>
            <h3
              className="text-lg font-bold text-white tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Quit Mock Interview?
            </h3>
            <p className="text-xs text-white/50">
              You are on Question {questionNumber} of {questionLimit}.
            </p>
          </div>
        </div>

        <p className="text-xs text-white/70 leading-relaxed mb-5">
          Select how you would like to conclude this interview session:
        </p>

        {/* Options List */}
        <div className="flex flex-col gap-3">
          {/* Option A: End Early & Generate Evaluation */}
          <button
            type="button"
            onClick={onQuitAndReport}
            disabled={isQuitting}
            className="group relative flex items-start gap-3.5 rounded-2xl p-4 text-left transition-all duration-200 border border-purple-500/30 bg-purple-950/20 hover:bg-purple-900/30 hover:border-purple-400/50 cursor-pointer disabled:opacity-50"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 group-hover:scale-105 transition-transform">
              <Award size={16} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                  End & View Evaluation Report
                </span>
                <span className="rounded bg-purple-500/20 px-1.5 py-0.2 text-[9px] font-mono text-purple-200">
                  {answeredCount} Completed
                </span>
              </div>
              <p className="text-[11px] text-white/60 mt-1 leading-normal">
                Conclude the session early and generate a report based on the questions you answered.
              </p>
              {isQuitting && (
                <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-cyan-300">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Generating evaluation report...</span>
                </div>
              )}
            </div>
          </button>

          {/* Option B: Quit & Discard Session */}
          <button
            type="button"
            onClick={onQuitAndDiscard}
            disabled={isQuitting}
            className="group flex items-start gap-3.5 rounded-2xl p-4 text-left transition-all duration-200 border border-rose-500/20 bg-rose-950/10 hover:bg-rose-950/30 hover:border-rose-500/40 cursor-pointer disabled:opacity-50"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 group-hover:scale-105 transition-transform">
              <LogOut size={16} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">
                  Discard & Exit Session
                </span>
              </div>
              <p className="text-[11px] text-white/60 mt-1 leading-normal">
                Exit immediately without generating a report. Session progress will be cleared.
              </p>
            </div>
          </button>
        </div>

        {/* Option C: Resume / Cancel */}
        <div className="mt-5 pt-4 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isQuitting}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium text-white/80 bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:text-white transition-all cursor-pointer"
          >
            <Play size={12} className="text-cyan-400" />
            <span>Resume Interview</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
