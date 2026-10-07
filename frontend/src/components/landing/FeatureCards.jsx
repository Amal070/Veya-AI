import React, { useState } from "react";
import { Mic, BarChart3, Target, Sparkles, CheckCircle2, Zap, ArrowUpRight } from "lucide-react";

/**
 * FeatureCards — Section 2: "Meet your AI interview coach"
 * 3 Glassmorphism interactive cards featuring Voice Interview, AI Evaluation, and Personalized Practice.
 */
export default function FeatureCards({ onStartInterview }) {
  const [activeCard, setActiveCard] = useState(null);

  const features = [
    {
      id: "voice",
      badge: "Real-Time Audio",
      icon: Mic,
      color: "cyan",
      title: "Voice Interview",
      tagline: "Natural Dialogue",
      description: "Practice realistic interviews through natural voice conversations.",
      highlights: [
        "Sub-second conversational response",
        "Natural conversational pacing and pauses",
        "Real-time speech recognition",
      ],
      preview: (
        <div className="mt-5 rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3.5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-[11px] font-mono text-cyan-300">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
              AUDIO STREAM
            </span>
            <span className="text-white/60">Instant Response</span>
          </div>
          <div className="mt-3 flex items-center justify-center gap-1 h-7">
            {[4, 12, 24, 16, 28, 18, 8, 22, 14, 6].map((h, i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-gradient-to-t from-cyan-500 to-purple-400"
                style={{
                  height: `${h}px`,
                  animation: `wave-bounce 1.4s ease-in-out infinite alternate ${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "evaluation",
      badge: "Real-Time Scoring",
      icon: BarChart3,
      color: "purple",
      title: "AI Evaluation",
      tagline: "Actionable Feedback",
      description: "Get intelligent feedback on your answers and communication.",
      highlights: [
        "STAR method structural evaluation",
        "Technical depth and accuracy analysis",
        "Delivery pacing and clarity assessment",
      ],
      preview: (
        <div className="mt-5 rounded-xl border border-purple-500/20 bg-purple-950/20 p-3.5 backdrop-blur-sm">
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[11px] font-medium text-white/80">
                <span>Technical Accuracy</span>
                <span className="text-purple-300 font-mono">94%</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-purple-500 to-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-medium text-white/80">
                <span>Structural Clarity</span>
                <span className="text-cyan-300 font-mono">91%</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div className="h-full w-[91%] rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "personalized",
      badge: "Tailored Sessions",
      icon: Target,
      color: "blue",
      title: "Personalized Practice",
      tagline: "Targeted Growth",
      description: "Improve your weak areas with targeted interview practice.",
      highlights: [
        "Questions tailored to your resume",
        "Calibrated to your target role and seniority",
        "Focused practice on identified growth areas",
      ],
      preview: (
        <div className="mt-5 rounded-xl border border-blue-500/20 bg-blue-950/20 p-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-[10px] text-blue-300">
              PDF
            </span>
            <div className="flex-1 truncate text-[11px] text-white/80">
              Resume_Senior_Engineer.pdf
            </div>
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-medium text-emerald-300">
              Indexed
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/70 border border-white/10">
              Distributed Systems
            </span>
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/70 border border-white/10">
              System Design
            </span>
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/70 border border-white/10">
              Behavioral
            </span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="features" className="relative py-28 px-6">
      {/* Background Section Glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[800px] rounded-full bg-purple-900/10 blur-[140px]" />

      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3.5 py-1 text-xs font-medium text-purple-300">
            <Sparkles size={12} className="text-cyan-400" />
            <span>CORE CAPABILITIES</span>
          </div>

          <h2
            className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Meet your AI interview coach
          </h2>

          <p className="mt-3.5 max-w-xl text-base text-white/60 leading-relaxed">
            Simulate authentic technical and behavioral interviews with real-time speech interaction, role-specific questions, and objective scoring.
          </p>
        </div>

        {/* 3 Glassmorphism Cards Grid */}
        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {features.map((feat) => {
            const Icon = feat.icon;
            const isHovered = activeCard === feat.id;

            return (
              <div
                key={feat.id}
                onMouseEnter={() => setActiveCard(feat.id)}
                onMouseLeave={() => setActiveCard(null)}
                className="group relative flex flex-col justify-between rounded-2xl p-7 transition-all duration-300"
                style={{
                  background: isHovered
                    ? "rgba(18, 18, 36, 0.75)"
                    : "rgba(12, 12, 24, 0.55)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: isHovered
                    ? "1px solid rgba(34, 211, 238, 0.35)"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: isHovered
                    ? "0 20px 40px -15px rgba(139, 92, 246, 0.3), 0 0 25px rgba(34, 211, 238, 0.15)"
                    : "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
                  transform: isHovered ? "translateY(-6px)" : "translateY(0)",
                }}
              >
                {/* Top: Icon + Badge */}
                <div>
                  <div className="flex items-center justify-between">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300"
                      style={{
                        background:
                          feat.color === "cyan"
                            ? "linear-gradient(135deg, rgba(34,211,238,0.2), rgba(34,211,238,0.05))"
                            : feat.color === "purple"
                            ? "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.05))"
                            : "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.05))",
                        border:
                          feat.color === "cyan"
                            ? "1px solid rgba(34,211,238,0.3)"
                            : feat.color === "purple"
                            ? "1px solid rgba(139,92,246,0.3)"
                            : "1px solid rgba(59,130,246,0.3)",
                      }}
                    >
                      <Icon
                        size={22}
                        className={
                          feat.color === "cyan"
                            ? "text-cyan-400"
                            : feat.color === "purple"
                            ? "text-purple-400"
                            : "text-blue-400"
                        }
                      />
                    </div>

                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-white/60 uppercase tracking-wider">
                      {feat.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3
                    className="mt-6 text-xl font-bold tracking-tight text-white group-hover:text-cyan-300 transition-colors"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {feat.title}
                  </h3>

                  <p className="mt-2 text-sm text-white/70 leading-relaxed">
                    {feat.description}
                  </p>

                  {/* Highlights Bullet List */}
                  <ul className="mt-4 space-y-2">
                    {feat.highlights.map((h, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-white/60">
                        <CheckCircle2 size={13} className="text-cyan-400 shrink-0" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Visual Preview Box */}
                  {feat.preview}
                </div>

                {/* Bottom Action */}
                <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs font-medium text-white/50 group-hover:text-white/80 transition-colors">
                    Start practice
                  </span>
                  <button
                    onClick={onStartInterview}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 hover:bg-cyan-500 hover:text-black hover:border-cyan-400 transition-all duration-300"
                    aria-label={`Start ${feat.title}`}
                  >
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
