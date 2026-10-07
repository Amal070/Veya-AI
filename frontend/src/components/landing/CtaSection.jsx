import React from "react";
import { ArrowRight, Mic, Sparkles, ShieldCheck, Zap, Headphones } from "lucide-react";

/**
 * CtaSection — Section 4: "Ready to practice smarter?"
 * Features a glowing background AI orb element, glassmorphic card, and dual action triggers.
 */
export default function CtaSection({ onStartInterview, onTalkToVeya }) {
  return (
    <section id="cta" className="relative py-32 px-6 overflow-hidden">
      {/* Central Glowing AI Orb Element in background */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
        {/* Pulsing Outer Rings */}
        <div
          className="absolute h-[500px] w-[500px] rounded-full border border-cyan-500/20 blur-[2px]"
          style={{ animation: "orb-pulse-ring 3s ease-out infinite" }}
        />
        <div
          className="absolute h-[380px] w-[380px] rounded-full border border-purple-500/25 blur-[1px]"
          style={{ animation: "orb-pulse-ring 3s ease-out infinite 1.5s" }}
        />
        {/* Intense Ambient Glow Core */}
        <div
          className="h-[320px] w-[320px] rounded-full opacity-40 blur-[100px]"
          style={{
            background:
              "radial-gradient(circle, #8B5CF6 0%, #22D3EE 60%, transparent 80%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-4xl">
        <div
          className="relative overflow-hidden rounded-3xl p-8 sm:p-14 text-center transition-all duration-300"
          style={{
            background: "rgba(14, 14, 28, 0.7)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow:
              "0 30px 80px -20px rgba(0, 0, 0, 0.8), 0 0 50px rgba(139, 92, 246, 0.2)",
          }}
        >
          {/* Subtle Accent Glow inside Card */}
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-96 rounded-full bg-cyan-400/20 blur-3xl" />

          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs font-medium text-purple-300">
            <Sparkles size={13} className="text-cyan-400" />
            <span>START PRACTICING TODAY</span>
          </div>

          {/* Headline */}
          <h2
            className="mt-6 text-3xl sm:text-5xl font-extrabold tracking-tight text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Ready to master your next interview?
          </h2>

          {/* Subtext */}
          <p className="mx-auto mt-4 max-w-xl text-base sm:text-lg text-white/70 leading-relaxed">
            Start practicing with Veya today. Build confidence with realistic voice simulations, instant scoring, and personalized feedback.
          </p>

          {/* Action Buttons */}
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onStartInterview}
              className="group relative inline-flex w-full sm:w-auto items-center justify-center overflow-hidden rounded-full px-8 py-4 text-sm font-semibold text-white shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #22D3EE 100%)",
                boxShadow: "0 8px 30px -4px rgba(139, 92, 246, 0.6)",
              }}
            >
              {/* Shine beam sweep */}
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:animate-[shine-sweep_1s_ease-in-out]" />
              <span className="relative flex items-center gap-2 font-bold tracking-wide">
                Start Interview
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </span>
            </button>

            <button
              onClick={onTalkToVeya}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-medium text-white/90 border border-white/15 bg-white/[0.04] backdrop-blur-md hover:bg-white/[0.08] hover:border-cyan-400/40 hover:text-white transition-all duration-200"
            >
              <Mic size={16} className="text-cyan-400" />
              Talk to Veya
            </button>
          </div>

          {/* Trust Guarantees */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 pt-6 border-t border-white/10 text-xs text-white/50">
            <span className="flex items-center gap-1.5">
              <Zap size={14} className="text-cyan-400" />
              No setup required
            </span>
            <span className="flex items-center gap-1.5">
              <Headphones size={14} className="text-purple-400" />
              Real-time voice feedback
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              Private & secure sessions
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
