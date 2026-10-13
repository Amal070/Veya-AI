import React from "react";
import { UploadCloud, MessageSquareCode, Award } from "lucide-react";

/**
 * HowItWorks — Clear 3-step production workflow.
 * Reflects the exact, honest user flow of Veya AI.
 */
export default function HowItWorks() {
  const steps = [
    {
      step: "01",
      icon: UploadCloud,
      title: "Upload Resume or Choose Type",
      description:
        "Upload your resume in PDF format or configure your target role and question count. Veya customizes the question set to match your profile.",
    },
    {
      step: "02",
      icon: MessageSquareCode,
      title: "Complete the Mock Interview",
      description:
        "Respond to technical and behavioral questions in real time using speech or text. Practice answering under realistic interview conditions.",
    },
    {
      step: "03",
      icon: Award,
      title: "Review Feedback and Improve",
      description:
        "Receive an objective evaluation report analyzing your communication clarity, technical depth, and specific areas for refinement.",
    },
  ];

  return (
    <section id="how-it-works" className="relative py-20 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            Workflow
          </p>
          <h2
            className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            How Veya Works
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed">
            A straightforward three-step process designed to help you prepare effectively in minutes.
          </p>
        </div>

        {/* 3-Step Horizontal on Desktop / Vertical on Mobile */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="relative flex flex-col rounded-2xl border border-white/10 bg-slate-900/40 p-6 sm:p-7 backdrop-blur-md"
              >
                {/* Step number badge & icon */}
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
                    <Icon size={18} />
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-500">
                    STEP {item.step}
                  </span>
                </div>

                {/* Content */}
                <h3
                  className="mt-6 text-base sm:text-lg font-bold text-white tracking-tight"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {item.title}
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm text-slate-300/80 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
