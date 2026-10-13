import React from "react";
import { ArrowRight, Mic, CheckCircle2 } from "lucide-react";

/**
 * HeroSection — Balanced, conversion-focused hero layout.
 * Emphasizes value proposition, clean SaaS aesthetics, and direct action triggers.
 */
export default function HeroSection({ onStartInterview, onTalkToVeya }) {
  return (
    <section
      id="hero"
      className="relative flex flex-col items-center justify-center px-4 sm:px-6 pt-28 pb-16 sm:pt-36 sm:pb-24 overflow-hidden"
    >
      <div className="flex flex-col items-center text-center max-w-4xl mx-auto z-10 w-full">
        {/* Category Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3.5 py-1 text-xs font-medium text-cyan-300 backdrop-blur-md mb-6">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
          </span>
          <span>AI Interview Preparation Platform</span>
        </div>

        {/* Main Headline */}
        <h1
          className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-[1.15]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Practice Interviews.{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400">
            Build Confidence.
          </span>
        </h1>

        {/* Product Description */}
        <p className="mt-5 max-w-2xl text-base sm:text-lg text-slate-300/90 leading-relaxed font-normal">
          Prepare for technical and behavioral interviews with realistic AI conversations, resume-based questions, and actionable feedback.
        </p>

        {/* Primary and Secondary CTA Button Group */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
          {/* Primary CTA: "Start an Interview" */}
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

          {/* Secondary CTA: "Talk to Veya" */}
          <button
            type="button"
            onClick={onTalkToVeya}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium text-white/90 border border-white/15 bg-white/[0.04] backdrop-blur-sm hover:bg-white/[0.08] hover:border-cyan-400/40 hover:text-white transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Mic size={16} className="text-cyan-400" />
            <span>Talk to Veya</span>
          </button>
        </div>

        {/* Truthful Platform Guarantees / Value Proof */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-slate-400 font-medium">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
            <span>Interactive Voice & Audio</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
            <span>Resume-Tailored Questions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
            <span>Actionable Scoring & Rubrics</span>
          </div>
        </div>

        {/* Hero Spotlight Card (Clean, restrained SaaS focal element) */}
        <div className="mt-12 w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6 backdrop-blur-xl shadow-2xl shadow-black/60 text-left">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Veya AI"
                className="h-10 w-10 rounded-full object-cover ring-1 ring-cyan-500/30"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">Veya Interview Session</span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/20">
                    Ready
                  </span>
                </div>
                <p className="text-xs text-slate-400">Technical & Behavioral Interview Simulation</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-[11px] font-mono text-slate-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
                Mode: Voice + Text
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Practice Type</div>
              <div className="mt-1 text-sm font-semibold text-white">Custom Mock Interview</div>
              <p className="mt-1 text-xs text-slate-400">5 to 15 questions calibrated by role</p>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Input Source</div>
              <div className="mt-1 text-sm font-semibold text-white">Resume or Role Target</div>
              <p className="mt-1 text-xs text-slate-400">Questions derived from your experience</p>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Evaluation</div>
              <div className="mt-1 text-sm font-semibold text-white">Comprehensive Report</div>
              <p className="mt-1 text-xs text-slate-400">Score breakdown with actionable notes</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
