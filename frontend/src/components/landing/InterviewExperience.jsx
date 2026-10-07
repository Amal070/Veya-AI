import React, { useState } from "react";
import {
  Bot,
  HelpCircle,
  Mic,
  Cpu,
  Award,
  ArrowRight,
  Play,
  Volume2,
  CheckCircle2,
  TrendingUp,
  Sparkles,
} from "lucide-react";

/**
 * InterviewExperience — Section 3: "AI Interview Experience"
 * Realistic futuristic mock interview dashboard and 5-step pipeline:
 * AI Interviewer -> Question -> User Voice Response -> AI Analysis -> Performance Score
 */
export default function InterviewExperience({ onStartInterview }) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const pipelineSteps = [
    { num: 1, title: "AI Interviewer", desc: "Adaptive voice AI", icon: Bot, active: true },
    { num: 2, title: "Question", desc: "Role-specific prompt", icon: HelpCircle, active: true },
    { num: 3, title: "Voice Response", desc: "Spoken candidate input", icon: Mic, active: true },
    { num: 4, title: "AI Analysis", desc: "Instant rubric review", icon: Cpu, active: true },
    { num: 5, title: "Performance Score", desc: "Comprehensive report", icon: Award, active: true },
  ];

  return (
    <section id="experience" className="relative py-28 px-6 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute left-1/4 top-1/3 h-[500px] w-[500px] rounded-full bg-cyan-600/10 blur-[150px]" />
      <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-[500px] w-[500px] rounded-full bg-purple-600/10 blur-[150px]" />

      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-medium text-cyan-300">
            <Sparkles size={12} className="text-cyan-400" />
            <span>INTERVIEW SIMULATION</span>
          </div>

          <h2
            className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            The AI Interview Experience
          </h2>

          <p className="mt-3.5 max-w-2xl text-base text-white/60 leading-relaxed">
            Experience a complete mock interview session — from voice-based questions to instant scoring and actionable feedback.
          </p>
        </div>

        {/* 5-Step Pipeline Flow */}
        <div className="mt-14 overflow-x-auto pb-4">
          <div className="flex min-w-[700px] items-center justify-between gap-2 px-2">
            {pipelineSteps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <React.Fragment key={step.num}>
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-[#0E0E1F] text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                      <Icon size={20} />
                    </div>
                    <span className="mt-2.5 text-xs font-semibold text-white">
                      {step.title}
                    </span>
                    <span className="text-[11px] text-white/50">{step.desc}</span>
                  </div>

                  {idx < pipelineSteps.length - 1 && (
                    <div className="flex-1 flex items-center justify-center px-2">
                      <div className="h-0.5 w-full bg-gradient-to-r from-cyan-500/40 via-purple-500/40 to-cyan-500/40 relative">
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rotate-45 border-t border-r border-cyan-300" />
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Futuristic Dashboard Card Mockup with 3D Depth */}
        <div
          className="mt-12 rounded-3xl p-1 transition-all duration-500"
          style={{
            background:
              "linear-gradient(135deg, rgba(34, 211, 238, 0.3) 0%, rgba(139, 92, 246, 0.3) 50%, rgba(59, 130, 246, 0.1) 100%)",
            boxShadow:
              "0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(139, 92, 246, 0.15)",
          }}
        >
          <div className="rounded-[22px] bg-[#0A0A14] p-6 sm:p-8 backdrop-blur-2xl border border-white/10">
            {/* Dashboard Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-3 w-3 items-center justify-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">Live Session #4092</span>
                    <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono text-cyan-300 border border-cyan-500/20">
                      Session Active
                    </span>
                  </div>
                  <span className="text-xs text-white/50">Target Role: Senior Distributed Systems Engineer</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-white/60">
                <span className="rounded-lg bg-white/5 px-2.5 py-1 border border-white/10">
                  Question 2 of 5
                </span>
                <span className="rounded-lg bg-white/5 px-2.5 py-1 border border-white/10 text-cyan-300">
                  03:45 Elapsed
                </span>
              </div>
            </div>

            {/* Dashboard Content: 2-Column Grid */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left Column: AI Question & User Spoken Response (7 cols) */}
              <div className="space-y-5 lg:col-span-7">
                {/* AI Interviewer Turn */}
                <div className="rounded-2xl border border-purple-500/20 bg-purple-950/20 p-5 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src="/logo.png"
                      alt="Veya AI"
                      className="h-8 w-8 rounded-full object-cover ring-1 ring-purple-400"
                    />
                    <div>
                      <div className="text-xs font-semibold text-purple-300">Veya AI Interviewer</div>
                      <div className="text-[10px] text-white/40">HD Voice Audio</div>
                    </div>
                  </div>

                  <p className="text-sm text-white/90 leading-relaxed font-medium">
                    "Walk me through an incident where a microservice cascade caused critical latency spikes. What telemetry signals did you inspect, and how did you isolate the failing node under pressure?"
                  </p>

                  {/* Audio Waveform Playback Bar */}
                  <div className="mt-4 flex items-center gap-3 rounded-xl bg-black/40 px-3.5 py-2 border border-white/5">
                    <button
                      onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-500 text-white hover:bg-purple-400 transition-colors shadow-md"
                      aria-label="Play question audio"
                    >
                      <Volume2 size={13} />
                    </button>
                    <div className="flex-1 flex items-center gap-1 h-5">
                      {[12, 18, 28, 14, 22, 30, 24, 16, 20, 26, 15, 10, 22, 16, 8].map((h, i) => (
                        <span
                          key={i}
                          className="w-1 rounded-full bg-gradient-to-t from-purple-500 to-cyan-400"
                          style={{
                            height: `${h * 0.6}px`,
                            animation: isPlayingAudio ? `wave-bounce 0.8s infinite alternate ${i * 0.05}s` : undefined,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono text-white/50">0:16</span>
                  </div>
                </div>

                {/* Candidate Voice Response */}
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-5 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold">
                        YOU
                      </div>
                      <span className="text-xs font-semibold text-cyan-300">Spoken Answer Transcript</span>
                    </div>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                      Pacing: 142 WPM (Optimal)
                    </span>
                  </div>

                  <p className="text-xs text-white/80 leading-relaxed font-mono">
                    "We noticed tail p99 latency spiked past 2.8 seconds on our order intake API. By inspecting Jaeger distributed spans, I isolated connection pool exhaustion in our Redis cache cluster. I rerouted non-critical reads to replicas, restored availability within 7 minutes, and introduced circuit breakers."
                  </p>
                </div>
              </div>

              {/* Right Column: Real-Time Intelligence & Scoring (5 cols) */}
              <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0E0E1B] p-6 lg:col-span-5">
                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-white/60">
                        AI Rubric Evaluation
                      </div>
                      <div className="text-xl font-bold text-white mt-1">94 / 100</div>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                      <TrendingUp size={14} />
                      STRONG HIRE
                    </div>
                  </div>

                  {/* Metric Bars */}
                  <div className="mt-5 space-y-3.5">
                    <div>
                      <div className="flex justify-between text-xs font-medium text-white/80">
                        <span>Technical Rigor & Troubleshooting</span>
                        <span className="font-mono text-cyan-300">96%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full w-[96%] bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-medium text-white/80">
                        <span>STAR Framework Structure</span>
                        <span className="font-mono text-purple-300">92%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full w-[92%] bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-medium text-white/80">
                        <span>Communication Clarity & Tone</span>
                        <span className="font-mono text-emerald-300">94%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full w-[94%] bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full" />
                      </div>
                    </div>
                  </div>

                  {/* Highlights Summary */}
                  <div className="mt-5 rounded-xl bg-white/[0.03] p-3.5 border border-white/5 space-y-2">
                    <div className="flex items-start gap-2 text-xs text-white/70">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>Quantified business impact with clear MTTR recovery metric.</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-white/70">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>Demonstrated structured root-cause analysis and system architecture knowledge.</span>
                    </div>
                  </div>
                </div>

                {/* Dashboard Bottom CTA Button */}
                <button
                  onClick={onStartInterview}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-semibold text-white shadow-lg transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 60%, #22D3EE 100%)",
                    boxShadow: "0 8px 25px -5px rgba(139, 92, 246, 0.4)",
                  }}
                >
                  <span>Start Mock Interview</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
