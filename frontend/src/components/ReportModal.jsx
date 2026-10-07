import { useEffect, useId, useRef, useState } from "react";
import {
    X,
    Sparkles,
    TrendingUp,
    TrendingDown,
    Lightbulb,
    ChevronDown,
    Download,
} from "lucide-react";

/**
 * ScoreRing — circular progress indicator for the overall score (0-100).
 * Animates from 0 on mount so the number "arrives" rather than popping in.
 */
function ScoreRing({ score = 0, size = 132 }) {
    const [animated, setAnimated] = useState(0);
    const radius = (size - 14) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.max(0, Math.min(100, score));

    useEffect(() => {
        const raf = requestAnimationFrame(() => setAnimated(clamped));
        return () => cancelAnimationFrame(raf);
    }, [clamped]);

    const offset = circumference - (animated / 100) * circumference;
    const tone =
        clamped >= 75 ? "#22D3EE" : clamped >= 45 ? "#8B5CF6" : "#FB7185";

    return (
        <div className="relative grid place-items-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth={10}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={tone}
                    strokeWidth={10}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1), stroke 0.6s" }}
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span
                    className="text-3xl font-semibold tabular-nums tracking-tight text-[var(--color-text-hi)]"
                    style={{ fontFamily: "var(--font-display)" }}
                >
                    {Math.round(animated)}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-low)]">
                    / 100
                </span>
            </div>
        </div>
    );
}

function ReportSection({ icon: Icon, iconColor, title, items, emptyLabel }) {
    if (!items || items.length === 0) {
        return (
            <div>
                <SectionHeading icon={Icon} iconColor={iconColor} title={title} />
                <p className="text-xs text-[var(--color-text-low)]">{emptyLabel}</p>
            </div>
        );
    }

    return (
        <div>
            <SectionHeading icon={Icon} iconColor={iconColor} title={title} />
            <ul className="flex flex-col gap-2">
                {items.map((item, i) => (
                    <li
                        key={i}
                        className="flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed text-[var(--color-text-hi)]"
                        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-glass)" }}
                    >
                        <span
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: iconColor }}
                        />
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function SectionHeading({ icon: Icon, iconColor, title }) {
    return (
        <div className="mb-2.5 flex items-center gap-2">
            <Icon size={14} style={{ color: iconColor }} />
            <h3 className="text-[12px] font-medium uppercase tracking-wide text-[var(--color-text-mid)]">
                {title}
            </h3>
        </div>
    );
}

function QuestionRow({ index, turn }) {
    const [open, setOpen] = useState(false);
    const score = Number(turn.score ?? 0);
    const tone = score >= 7 ? "#22D3EE" : score >= 4 ? "#8B5CF6" : "#FB7185";

    return (
        <li className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--color-border-glass)" }}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                style={{ background: "var(--color-surface)" }}
            >
                <span
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-[var(--color-text-low)]"
                    style={{ border: "1px solid var(--color-border-glass)" }}
                >
                    {index + 1}
                </span>
                <span className="flex-1 truncate text-[13px] text-[var(--color-text-hi)]">{turn.question}</span>
                <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums"
                    style={{ background: `${tone}1F`, color: tone }}
                >
                    {score}/10
                </span>
                <ChevronDown
                    size={15}
                    className="shrink-0 transition-transform duration-300"
                    style={{ color: "var(--color-text-low)", transform: open ? "rotate(180deg)" : "none" }}
                />
            </button>

            <div
                className="grid transition-all duration-300 ease-out"
                style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
            >
                <div className="overflow-hidden">
                    <div className="flex flex-col gap-2 px-4 pb-4 pt-1">
                        <p className="text-[12px] leading-relaxed text-[var(--color-text-mid)]">
                            <span className="text-[var(--color-text-low)]">Your answer — </span>
                            {turn.answer || "(no answer recorded)"}
                        </p>
                        {turn.feedback && (
                            <p
                                className="rounded-lg px-3 py-2 text-[12px] leading-relaxed text-[var(--color-text-hi)]"
                                style={{ background: "var(--color-surface-2)" }}
                            >
                                {turn.feedback}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </li>
    );
}

/**
 * ReportModal — the full-screen overlay shown the moment an interview
 * finishes, replacing the old separate /report route navigation. Renders
 * nothing when `open` is false (rather than just being visually hidden)
 * so its internal state resets cleanly between interviews.
 */
export default function ReportModal({ open, report, meta, onClose }) {
    const titleId = useId();
    const dialogRef = useRef(null);
    const [visible, setVisible] = useState(false);

    // Two-phase mount so the enter animation always plays (mounting straight
    // into its end state would skip the transition on fast connections).
    useEffect(() => {
        if (open) {
            const raf = requestAnimationFrame(() => setVisible(true));
            return () => cancelAnimationFrame(raf);
        }
        setVisible(false);
        return undefined;
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        const onKeyDown = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        document.addEventListener("keydown", onKeyDown);
        dialogRef.current?.focus();
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = prevOverflow;
        };
    }, [open, onClose]);

    if (!open) return null;

    const score = report?.overall_score ?? 0;
    const strengths = report?.strengths ?? [];
    const weaknesses = report?.weaknesses ?? [];
    const recommendations = report?.recommendations ?? [];
    const history = meta?.history ?? [];

    const handleDownload = () => {
        const blob = new Blob([JSON.stringify({ ...report, history }, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "veya-report.json";
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
            role="presentation"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose?.();
            }}
        >
            <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                    background: "rgba(6,6,10,0.72)",
                    backdropFilter: "blur(6px)",
                    opacity: visible ? 1 : 0,
                }}
            />

            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className="glass relative flex w-full max-w-2xl flex-col rounded-t-3xl sm:rounded-3xl"
                style={{
                    maxHeight: "92vh",
                    transform: visible ? "translateY(0) scale(1)" : "translateY(24px) scale(0.98)",
                    opacity: visible ? 1 : 0,
                    transition: "transform 0.38s cubic-bezier(0.16,1,0.3,1), opacity 0.32s ease-out",
                    boxShadow: "0 24px 80px -20px rgba(0,0,0,0.6)",
                }}
            >
                {/* Header */}
                <div
                    className="flex shrink-0 items-start justify-between gap-4 px-6 pb-4 pt-6 sm:px-7"
                    style={{ borderBottom: "1px solid var(--color-border-glass)" }}
                >
                    <div className="flex items-center gap-3">
                        <ScoreRing score={score} size={84} />
                        <div>
                            <div className="mb-1 flex items-center gap-1.5">
                                <Sparkles size={13} style={{ color: "var(--color-cyan)" }} />
                                <span className="text-[11px] uppercase tracking-wide text-[var(--color-text-low)]">
                                    Interview report
                                </span>
                            </div>
                            <h2
                                id={titleId}
                                className="text-xl font-semibold tracking-tight text-[var(--color-text-hi)]"
                                style={{ fontFamily: "var(--font-display)" }}
                            >
                                {scoreHeadline(score)}
                            </h2>
                            <p className="mt-0.5 text-xs text-[var(--color-text-mid)]">
                                {meta?.questionsAnswered ?? history.length} questions
                                {meta?.difficulty ? ` · ${meta.difficulty}` : ""}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close report"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10"
                        style={{ border: "1px solid var(--color-border-glass)" }}
                    >
                        <X size={16} className="text-[var(--color-text-mid)]" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-7">
                    <div className="flex flex-col gap-7">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <ReportSection
                                icon={TrendingUp}
                                iconColor="var(--color-cyan)"
                                title="Strengths"
                                items={strengths}
                                emptyLabel="No specific strengths were flagged this round."
                            />
                            <ReportSection
                                icon={TrendingDown}
                                iconColor="#FB7185"
                                title="Areas to improve"
                                items={weaknesses}
                                emptyLabel="No notable weaknesses were flagged this round."
                            />
                        </div>

                        <ReportSection
                            icon={Lightbulb}
                            iconColor="#FBBF24"
                            title="Recommendations"
                            items={recommendations}
                            emptyLabel="No specific recommendations were generated."
                        />

                        {history.length > 0 && (
                            <div>
                                <SectionHeading icon={Sparkles} iconColor="var(--color-violet)" title="Question breakdown" />
                                <ul className="flex flex-col gap-2">
                                    {history.map((turn, i) => (
                                        <QuestionRow key={i} index={i} turn={turn} />
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div
                    className="flex shrink-0 items-center justify-between gap-3 px-6 py-4 sm:px-7"
                    style={{ borderTop: "1px solid var(--color-border-glass)" }}
                >
                    <button
                        type="button"
                        onClick={handleDownload}
                        className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium text-[var(--color-text-mid)] transition-colors hover:text-[var(--color-text-hi)]"
                        style={{ border: "1px solid var(--color-border-glass)" }}
                    >
                        <Download size={13} /> Save JSON
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                        style={{ background: "linear-gradient(135deg, #8B5CF6, #22D3EE)" }}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

function scoreHeadline(score) {
    if (score >= 85) return "Excellent performance";
    if (score >= 70) return "Strong performance";
    if (score >= 50) return "Solid effort";
    if (score >= 30) return "Room to grow";
    return "Let's keep practicing";
}