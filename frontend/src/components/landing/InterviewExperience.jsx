import React from "react";
import { MessageSquare, CheckCircle2 } from "lucide-react";

/**
 * InterviewExperience — Single, honest "Sample Interview Preview".
 * Accurately represents the look, feel, and evaluation flow of Veya's interview studio.
 */
export default function InterviewExperience() {
  return (
    <section id="experience" className="relative py-20 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            Interface Preview
          </p>
          <h2
            className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            The Interview Experience
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed">
            A focused environment built for spoken interaction, real-time transcription, and structured rubric assessment.
          </p>
        </div>

        {/* Product Preview Container */}
        <div className="mt-12 rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-8 backdrop-blur-xl shadow-2xl">
          {/* Preview Window Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <MessageSquare size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">Interview Studio</span>
                  <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
                    Sample Interview Preview
                  </span>
                </div>
                <p className="text-xs text-slate-400">Software Engineering • Distributed Systems</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-md bg-white/5 px-2.5 py-1 text-xs font-mono text-slate-300 border border-white/10">
                Question 2 of 5
              </span>
              <span className="rounded-md bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-300 border border-purple-500/20">
                Medium Difficulty
              </span>
            </div>
          </div>

          {/* Preview Content Grid */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: AI Question & Candidate Response (7 cols) */}
            <div className="space-y-4 lg:col-span-7">
              {/* AI Question */}
              <div className="rounded-xl border border-purple-500/20 bg-purple-950/20 p-5">
                <div className="flex items-center gap-2 mb-2.5 text-xs font-semibold text-purple-300">
                  <span className="h-2 w-2 rounded-full bg-purple-400" />
                  <span>Veya AI Interviewer</span>
                </div>
                <p className="text-sm text-slate-100 leading-relaxed">
                  "Walk me through how you isolate a performance bottleneck in a backend service experiencing sudden latency spikes. Which signals do you look at first?"
                </p>
              </div>

              {/* Candidate Transcript */}
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-5">
                <div className="flex items-center gap-2 mb-2.5 text-xs font-semibold text-cyan-300">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                  <span>Spoken Response (Transcript)</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed font-mono">
                  "I start by checking p99 latency against error rate dashboards to differentiate between resource starvation and downstream failure. Next, I inspect distributed traces to locate the highest duration span—often identifying unindexed database queries or connection pool limits."
                </p>
              </div>
            </div>

            {/* Right Column: AI Feedback & Scoring Panel (5 cols) */}
            <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-slate-950/60 p-5 lg:col-span-5">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Rubric Evaluation
                  </span>
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                    Strong Technical Depth
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-300">
                      <span>Technical Rigor</span>
                      <span className="text-cyan-400 font-mono">Proficient</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full w-4/5 rounded-full bg-cyan-400" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-300">
                      <span>Communication & Structure</span>
                      <span className="text-purple-400 font-mono">Clear</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full w-3/4 rounded-full bg-purple-400" />
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-lg bg-white/[0.02] p-3.5 border border-white/5 space-y-2 text-xs text-slate-400">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>Effectively segmented systematic triage (metrics, then traces).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>Clear articulation of downstream bottlenecks.</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-slate-500 text-center">
                Detailed report generated upon interview completion
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
