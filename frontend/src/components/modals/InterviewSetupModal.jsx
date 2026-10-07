import { useState } from "react";
import { Gauge, ListOrdered, Loader2 } from "lucide-react";
import Modal from "./Modal";

const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const QUESTION_PRESETS = [5, 10, 15];

export default function InterviewSetupModal({ open, onClose, onBegin }) {
  const [difficulty, setDifficulty] = useState("medium");
  const [preset, setPreset] = useState(5);
  const [customCount, setCustomCount] = useState("");
  const [starting, setStarting] = useState(false);

  const isCustom = preset === "custom";
  const resolvedCount = isCustom ? Number(customCount) || 0 : preset;
  const canStart = resolvedCount >= 1 && resolvedCount <= 15 && !starting;

  const handleBegin = async () => {
    if (!canStart) return;
    setStarting(true);
    try {
      await onBegin({ questionLimit: resolvedCount, difficulty });
    } finally {
      setStarting(false);
    }
  };

  return (
    <Modal open={open} onClose={starting ? undefined : onClose} closable={!starting}>
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text-hi)]">Interview setup</h2>
          <p className="text-xs text-[var(--color-text-low)]">Choose your difficulty and length.</p>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--color-text-low)]">
            <Gauge size={14} /> Difficulty level
          </div>
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDifficulty(d.value)}
                className="flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200"
                style={
                  difficulty === d.value
                    ? {
                        background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(34,211,238,0.3))",
                        border: "1px solid rgba(34,211,238,0.5)",
                        color: "var(--color-text-hi)",
                      }
                    : {
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border-glass)",
                        color: "var(--color-text-mid)",
                      }
                }
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--color-text-low)]">
            <ListOrdered size={14} /> Number of questions
          </div>
          <div className="flex gap-2">
            {QUESTION_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPreset(n)}
                className="flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200"
                style={
                  preset === n
                    ? {
                        background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(34,211,238,0.3))",
                        border: "1px solid rgba(34,211,238,0.5)",
                        color: "var(--color-text-hi)",
                      }
                    : {
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border-glass)",
                        color: "var(--color-text-mid)",
                      }
                }
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPreset("custom")}
              className="flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200"
              style={
                isCustom
                  ? {
                      background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(34,211,238,0.3))",
                      border: "1px solid rgba(34,211,238,0.5)",
                      color: "var(--color-text-hi)",
                    }
                  : {
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border-glass)",
                      color: "var(--color-text-mid)",
                    }
              }
            >
              Custom
            </button>
          </div>

          {isCustom && (
            <input
              type="number"
              min={1}
              max={15}
              value={customCount}
              onChange={(e) => setCustomCount(e.target.value)}
              placeholder="1–15"
              className="mt-3 w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border-glass)",
                color: "var(--color-text-hi)",
              }}
            />
          )}
        </div>

        <button
          onClick={handleBegin}
          disabled={!canStart}
          className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #8B5CF6, #22D3EE)" }}
        >
          {starting && <Loader2 className="animate-spin" size={16} />}
          {starting ? "Starting…" : "Start interview"}
        </button>
      </div>
    </Modal>
  );
}
