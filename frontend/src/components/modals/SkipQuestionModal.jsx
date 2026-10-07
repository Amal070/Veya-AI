import React from "react";
import { SkipForward, AlertCircle, Loader2 } from "lucide-react";
import Modal from "./Modal";

/**
 * SkipQuestionModal — Confirmation modal before skipping an interview prompt.
 * Ensures candidates don't accidentally forfeit questions.
 */
export default function SkipQuestionModal({
  open,
  onClose,
  onConfirmSkip,
  questionNumber = 1,
  isSkipping = false,
}) {
  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-sm">
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            <SkipForward size={18} />
          </div>
          <div>
            <h3
              className="text-base font-bold text-white tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Skip Question #{questionNumber}?
            </h3>
            <p className="text-xs text-white/50">
              Move directly to the next prompt
            </p>
          </div>
        </div>

        <p className="text-xs text-white/70 leading-relaxed my-3">
          Are you sure you want to skip this question? You will not receive evaluation points for this prompt, and the interview will immediately advance to the next question.
        </p>

        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSkipping}
            className="rounded-full px-4 py-2 text-xs font-medium text-white/70 hover:text-white bg-white/[0.04] border border-white/10 transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirmSkip}
            disabled={isSkipping}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isSkipping ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Skipping...</span>
              </>
            ) : (
              <>
                <SkipForward size={13} />
                <span>Skip Question</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
