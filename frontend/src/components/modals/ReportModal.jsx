import { Download, RotateCcw, CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react";
import Modal from "./Modal";

function ScoreRing({ label, score }) {
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 75 ? "#22D3EE" : pct >= 50 ? "#8B5CF6" : "#FBBF24";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-20 w-20">
        <svg viewBox="0 0 72 72" className="h-20 w-20 -rotate-90">
          <circle cx="36" cy="36" r={radius} fill="none" stroke="var(--color-border-glass)" strokeWidth="6" />
          <circle
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-[var(--color-text-hi)]">
          {pct}
        </div>
      </div>
      <span className="text-xs text-[var(--color-text-low)]">{label}</span>
    </div>
  );
}

function downloadReportAsText(report, sessionId) {
  const lines = [
    "Veya Interview Report",
    `Session: ${sessionId || "—"}`,
    "",
    `Overall Score: ${report.overall_score ?? "—"}/100`,
    `Technical Score: ${report.technical_score ?? "—"}/100`,
    `Communication Score: ${report.communication_score ?? "—"}/100`,
    "",
    "Summary:",
    report.summary || "—",
    "",
    "Strengths:",
    ...(report.strengths?.length ? report.strengths.map((s) => `- ${s}`) : ["- —"]),
    "",
    "Weaknesses:",
    ...(report.weaknesses?.length ? report.weaknesses.map((s) => `- ${s}`) : ["- —"]),
    "",
    "Improvement Suggestions:",
    ...(report.recommendations?.length ? report.recommendations.map((s) => `- ${s}`) : ["- —"]),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `veya-report-${sessionId || "session"}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ReportModal({ open, onClose, report, sessionId, onStartNew }) {
  if (!report) return null;

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-lg">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Veya AI"
            className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10 shadow"
          />
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-hi)]">Interview report</h2>
            <p className="text-xs text-[var(--color-text-low)]">Here's how you did with Veya.</p>
          </div>
        </div>

        <div className="flex justify-around rounded-2xl p-4" style={{ background: "var(--color-surface)" }}>
          <ScoreRing label="Overall" score={report.overall_score} />
          <ScoreRing label="Technical" score={report.technical_score} />
          <ScoreRing label="Communication" score={report.communication_score} />
        </div>

        {report.summary && (
          <div>
            <h3 className="mb-1.5 text-xs font-medium text-[var(--color-text-low)]">Summary</h3>
            <p className="text-sm leading-relaxed text-[var(--color-text-mid)]">{report.summary}</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-emerald-300">
              <CheckCircle2 size={14} /> Strengths
            </h3>
            <ul className="space-y-1.5">
              {(report.strengths?.length ? report.strengths : ["No specific strengths identified."]).map((s, i) => (
                <li key={i} className="text-sm text-[var(--color-text-mid)]">
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber-300">
              <AlertTriangle size={14} /> Weaknesses
            </h3>
            <ul className="space-y-1.5">
              {(report.weaknesses?.length ? report.weaknesses : ["No specific weaknesses identified."]).map((w, i) => (
                <li key={i} className="text-sm text-[var(--color-text-mid)]">
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {report.recommendations?.length > 0 && (
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-cyan-300">
              <Lightbulb size={14} /> Improvement suggestions
            </h3>
            <ul className="space-y-1.5">
              {report.recommendations.map((r, i) => (
                <li key={i} className="text-sm text-[var(--color-text-mid)]">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          <button
            onClick={() => downloadReportAsText(report, sessionId)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
            style={{ border: "1px solid var(--color-border-glass)", color: "var(--color-text-hi)" }}
          >
            <Download size={15} /> Download
          </button>
          <button
            onClick={onStartNew}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
            style={{ border: "1px solid var(--color-border-glass)", color: "var(--color-text-hi)" }}
          >
            <RotateCcw size={15} /> Start new
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #22D3EE)" }}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
