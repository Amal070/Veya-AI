import React from "react";
import { Mic, FileText, BarChart3, Check } from "lucide-react";

/**
 * FeatureCards — Exactly 3 equal-height, high-contrast feature cards.
 * Focuses on core capabilities: Voice Interview, Resume-Based Questions, and Feedback/Scoring.
 */
export default function FeatureCards() {
  const features = [
    {
      id: "voice-interview",
      icon: Mic,
      accentColor: "cyan",
      title: "AI Voice Interview",
      description:
        "Realistic voice-based practice with natural conversational interaction. Speak your responses aloud and experience the pacing of a live interview.",
      benefits: [
        "Interactive spoken conversations",
        "Natural interview pacing",
        "Hands-free speech interaction",
      ],
    },
    {
      id: "resume-questions",
      icon: FileText,
      accentColor: "blue",
      title: "Resume-Based Questions",
      description:
        "Questions tailored to your uploaded resume and target job role. Prepare for in-depth inquiries regarding your actual projects, technologies, and experience.",
      benefits: [
        "Experience-tailored technical questions",
        "Role-relevant behavioral scenarios",
        "Customizable difficulty settings",
      ],
    },
    {
      id: "feedback-scoring",
      icon: BarChart3,
      accentColor: "purple",
      title: "AI Feedback and Scoring",
      description:
        "Comprehensive performance feedback and objective evaluation. Gain insight into technical depth, communication clarity, and structure.",
      benefits: [
        "Rubric-based performance assessment",
        "Technical and communication feedback",
        "Actionable guidance for next rounds",
      ],
    },
  ];

  return (
    <section id="features" className="relative py-20 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            Capabilities
          </p>
          <h2
            className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Engineered for Comprehensive Preparation
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed">
            Everything you need to simulate realistic technical and behavioral interviews from your browser.
          </p>
        </div>

        {/* 3 Equal-Height Feature Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.id}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/50 p-6 sm:p-7 backdrop-blur-md transition-all duration-200 hover:border-slate-700 hover:bg-slate-900/70"
              >
                <div>
                  {/* Icon container */}
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                      feat.accentColor === "cyan"
                        ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                        : feat.accentColor === "blue"
                        ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
                        : "border-purple-500/30 bg-purple-500/10 text-purple-300"
                    }`}
                  >
                    <Icon size={20} />
                  </div>

                  {/* Title & Description */}
                  <h3
                    className="mt-5 text-lg font-bold text-white tracking-tight"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {feat.title}
                  </h3>
                  <p className="mt-2.5 text-xs sm:text-sm text-slate-300/80 leading-relaxed">
                    {feat.description}
                  </p>

                  {/* Highlights */}
                  <ul className="mt-5 space-y-2.5 pt-4 border-t border-white/5">
                    {feat.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-slate-400">
                        <Check size={14} className="text-cyan-400 shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
