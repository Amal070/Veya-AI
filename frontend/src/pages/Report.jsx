import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { fetchInterviewReport } from "../services/api";

export default function Report() {
  const { sessionId: routeSessionId } = useParams();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState(routeSessionId || "");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function loadReport(id, { updateUrl = false } = {}) {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInterviewReport(id);
      setReport(data);
      if (updateUrl) navigate(`/report/${id}`, { replace: true });
    } catch (err) {
      console.error("Failed to load report:", err);
      setError("Couldn't find a report for that session ID.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  // Fetching data in response to a route param change is exactly the kind
  // of "synchronize with an external system" use case effects are for.
  // Wrapping the async work in an IIFE (rather than calling setState
  // directly in the effect body) keeps this clear to both the linter and
  // readers, and lets us bail out via `cancelled` if the param changes
  // again before the fetch resolves.
  useEffect(() => {
    if (!routeSessionId) return undefined;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchInterviewReport(routeSessionId);
        if (!cancelled) setReport(data);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load report:", err);
        setError("Couldn't find a report for that session ID.");
        setReport(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [routeSessionId]);

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto flex max-w-md flex-col items-center gap-6">
        <header className="flex flex-col items-center gap-3 text-center" style={{ animation: "fade-up 0.4s ease-out" }}>
          <div className="relative flex items-center justify-center">
            <div
              className="absolute -inset-2 rounded-full blur-lg opacity-50"
              style={{ background: "radial-gradient(circle, rgba(139,92,246,0.6) 0%, rgba(34,211,238,0.4) 100%)" }}
            />
            <img
              src="/logo.png"
              alt="Veya AI"
              className="relative h-16 w-16 rounded-full object-cover shadow-lg ring-1 ring-white/20"
            />
          </div>
          <div>
            <h1
              className="text-3xl font-semibold tracking-tight text-[var(--color-text-hi)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Veya AI
            </h1>
            <p className="text-sm text-[var(--color-text-low)]">Interview report</p>
          </div>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadReport(sessionId.trim(), { updateUrl: true });
          }}
          className="flex w-full gap-2"
        >
          <input
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="Paste your session ID"
            className="glass flex-1 rounded-xl px-3 py-2 text-sm text-[var(--color-text-hi)] outline-none placeholder:text-[var(--color-text-low)] focus:border-[rgba(34,211,238,0.5)]"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #22D3EE)" }}
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : "Load"}
          </button>
        </form>

        {error && (
          <div className="glass flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-300">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {report && (
          <div className="glass w-full rounded-2xl p-6 text-left" style={{ animation: "fade-up 0.35s ease-out" }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium text-[var(--color-text-hi)]">Summary</h2>
              <span className="text-xs text-[var(--color-text-low)]">
                {report.questions_answered ?? report.question_count} questions · {report.difficulty}
              </span>
            </div>

            {report.report && Object.keys(report.report).length > 0 ? (
              <dl className="space-y-3 text-sm">
                {Object.entries(report.report).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between gap-4 border-b pb-3"
                    style={{ borderColor: "var(--color-border-glass)" }}
                  >
                    <dt className="capitalize text-[var(--color-text-low)]">{key.replaceAll("_", " ")}</dt>
                    <dd className="text-right text-[var(--color-text-hi)]">
                      {Array.isArray(value) ? value.join(", ") : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-[var(--color-text-low)]">
                This interview isn't finished yet, so there's no report to show.
              </p>
            )}

            {report.history?.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 text-xs font-medium text-[var(--color-text-low)]">Question by question</h3>
                <ul className="space-y-3">
                  {report.history.map((turn, i) => (
                    <li
                      key={i}
                      className="rounded-xl p-3 text-sm"
                      style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-glass)" }}
                    >
                      <p className="mb-1 text-[var(--color-text-hi)]">{turn.question}</p>
                      <p className="mb-1 text-xs text-[var(--color-text-mid)]">Score: {turn.score}/10</p>
                      <p className="text-xs text-[var(--color-text-low)]">{turn.feedback}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}