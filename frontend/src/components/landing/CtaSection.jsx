import React from "react";
import { ArrowRight, Mic, CheckCircle2 } from "lucide-react";

/**
 * CtaSection — Single, focused final call to action before the footer.
 * Balanced design with high-contrast copy and clean action buttons.
 */
export default function CtaSection({ onStartInterview, onTalkToVeya }) {
  return (
    <section id="cta" className="relative py-20 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 p-8 sm:p-12 text-center backdrop-blur-xl shadow-2xl">
          {/* Subtle interior glow */}
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-80 rounded-full bg-cyan-500/10 blur-3xl" />

          {/* Heading */}
          <h2
            className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white max-w-xl mx-auto"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Ready to Prepare for Your Next Interview?
          </h2>

          {/* Subtitle */}
          <p className="mt-3.5 text-sm sm:text-base text-slate-300 max-w-lg mx-auto leading-relaxed">
            Start practicing with Veya today. Build confidence with realistic voice simulations, role-specific questions, and actionable feedback.
          </p>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={onStartInterview}
              className="group relative inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              style={{
                background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 50%, #06B6D4 100%)",
                boxShadow: "0 4px 20px -2px rgba(37, 99, 235, 0.4)",
              }}
            >
              <span>Start an Interview</span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>

            <button
              type="button"
              onClick={onTalkToVeya}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium text-white/90 border border-white/15 bg-white/[0.04] backdrop-blur-sm hover:bg-white/[0.08] hover:border-cyan-400/40 hover:text-white transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <Mic size={16} className="text-cyan-400" />
              <span>Talk to Veya</span>
            </button>
          </div>

          {/* Assurances */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-5 pt-6 border-t border-white/10 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-cyan-400" />
              Instant browser access
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-cyan-400" />
              Real-time voice feedback
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-cyan-400" />
              Private interview sessions
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
