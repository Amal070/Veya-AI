import React from "react";
import { ArrowRight, Mic, Sparkles, Terminal, Headphones, ShieldCheck } from "lucide-react";
import Avatar3D from "./Avatar3D";

/**
 * HeroSection — The centerpiece hero section with:
 *  - 3D parallax AI robot mascot
 *  - Animated audio waveform
 *  - Staggered typography
 *  - Premium glass/neon CTA buttons ("Start Interview" and "Talk to Veya")
 */
export default function HeroSection({ onStartInterview, onTalkToVeya }) {
  return (
    <section
      id="hero"
      className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-32 pb-20 overflow-hidden"
    >
      <div className="flex flex-col items-center text-center max-w-4xl mx-auto z-10">
        {/* Top Announcement Pill */}
        <div
          className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-950/40 px-4 py-1.5 text-xs font-medium text-cyan-300 backdrop-blur-md shadow-lg shadow-cyan-950/30"
          style={{ animation: "fade-up 0.6s ease-out" }}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
          </span>
          <span>AI Voice Assistant & Mock Interview Coach</span>
        </div>

        {/* Central 3D Avatar Centerpiece with Parallax and Live Waveform */}
        <div
          className="mt-8 mb-6"
          style={{ animation: "fade-up 0.8s ease-out 0.1s backwards" }}
        >
          <Avatar3D onInteract={onTalkToVeya} />
        </div>

        {/* Hero Heading */}
        <div
          className="space-y-3 max-w-3xl"
          style={{ animation: "fade-up 0.8s ease-out 0.2s backwards" }}
        >
          <h1
            className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            <span className="text-gradient-electric">Veya AI</span>
          </h1>

          <p
            className="text-lg sm:text-2xl font-semibold tracking-tight text-white/90"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Real-time voice interviews and intelligent conversation practice.
          </p>

          <p className="mx-auto max-w-xl text-sm sm:text-base text-white/60 leading-relaxed font-normal">
            Prepare for technical and behavioral interviews with realistic spoken conversations, role-specific questions, and actionable feedback.
          </p>
        </div>

        {/* CTA Button Group */}
        <div
          className="mt-9 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
          style={{ animation: "fade-up 0.8s ease-out 0.3s backwards" }}
        >
          {/* Primary CTA: "Start Interview" */}
          <button
            onClick={onStartInterview}
            className="group relative inline-flex w-full sm:w-auto items-center justify-center overflow-hidden rounded-full px-8 py-4 text-sm font-semibold text-white shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #22D3EE 100%)",
              boxShadow: "0 8px 32px -4px rgba(139, 92, 246, 0.65), 0 0 20px rgba(34, 211, 238, 0.35)",
            }}
          >
            {/* Animated shine beam sweep */}
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:animate-[shine-sweep_1.2s_ease-in-out]" />
            <span className="relative flex items-center gap-2 tracking-wide font-bold">
              Start Interview
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </button>

          {/* Secondary CTA: "Talk to Veya" */}
          <button
            onClick={onTalkToVeya}
            className="group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-medium text-white/90 border border-white/15 bg-white/[0.04] backdrop-blur-md hover:bg-white/[0.08] hover:border-cyan-400/40 hover:text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Mic size={16} className="text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>Talk to Veya</span>
          </button>
        </div>

        {/* Feature Pills under CTAs */}
        <div
          className="mt-12 flex flex-wrap items-center justify-center gap-5 text-xs text-white/50"
          style={{ animation: "fade-up 0.8s ease-out 0.4s backwards" }}
        >
          <div className="flex items-center gap-1.5">
            <Headphones size={13} className="text-cyan-400" />
            <span>Low-Latency Voice Dialogue</span>
          </div>
          <span className="text-white/20">•</span>
          <div className="flex items-center gap-1.5">
            <Terminal size={13} className="text-purple-400" />
            <span>Resume-Tailored Questions</span>
          </div>
          <span className="text-white/20">•</span>
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>Comprehensive Rubric Scoring</span>
          </div>
        </div>
      </div>
    </section>
  );
}
