import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Gauge,
  Layers,
  FileText,
  Upload,
  Sparkles,
  CheckCircle2,
  Loader2,
  X,
  Volume2,
  SkipForward,
  LogOut,
} from "lucide-react";

import VoiceOrb from "../components/VoiceOrb";
import MicControl from "../components/MicControl";
import ConversationView from "../components/ConversationView";
import InterviewProgress from "../components/InterviewProgress";
import ErrorBanner from "../components/ErrorBanner";
import ResumeUploadModal from "../components/modals/ResumeUploadModal";
import InterviewSetupModal from "../components/modals/InterviewSetupModal";
import ReportModal from "../components/modals/ReportModal";
import QuitInterviewModal from "../components/modals/QuitInterviewModal";
import SkipQuestionModal from "../components/modals/SkipQuestionModal";
import BackgroundFX from "../components/landing/BackgroundFX";
import { useVeya } from "../hooks/useVeya";

const DIFFICULTIES = [
  { value: "easy", label: "Easy", desc: "Core fundamentals & concepts" },
  { value: "medium", label: "Medium", desc: "Algorithms & system architecture" },
  { value: "hard", label: "Hard", desc: "Distributed scale & complex tradeoffs" },
];

const QUESTION_LIMITS = [3, 5, 8];

/**
 * Interview — The dedicated, futuristic Veya AI Mock Interview Studio.
 * Allows instant configuration (difficulty, question count, resume upload)
 * and seamless real-time spoken voice interview execution.
 */
export default function Interview() {
  const mm = useVeya();
  const navigate = useNavigate();

  // Pre-interview studio configuration state
  const [selectedDifficulty, setSelectedDifficulty] = useState("medium");
  const [selectedLimit, setSelectedLimit] = useState(5);
  const [resumeFile, setResumeFile] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const fileInputRef = useRef(null);

  const orbState =
    mm.state === "listening" || mm.state === "thinking" || mm.state === "speaking"
      ? mm.state
      : "idle";

  const displayError = mm.micPermissionError || mm.error || uploadError;
  const isInterviewActive = mm.mode === "interview" && mm.currentQuestion && mm.state !== "finished";

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx", "txt"].includes(ext)) {
      setUploadError("Please upload a PDF, DOCX, or TXT resume.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File is too large. Max 5MB allowed.");
      return;
    }

    setResumeFile(file);
    setUploadError(null);
  };

  const handleStartStudioInterview = async () => {
    setIsStarting(true);
    setUploadError(null);

    try {
      let activeSessionId = crypto.randomUUID();
      if (resumeFile) {
        // Upload resume first and capture the exact session_id
        const uploadResult = await mm.uploadResume(resumeFile, activeSessionId);
        if (uploadResult?.session_id) {
          activeSessionId = uploadResult.session_id;
        }
      }
      // Begin the interview session using the exact session_id
      await mm.beginInterview({
        questionLimit: selectedLimit,
        difficulty: selectedDifficulty,
        sessionId: activeSessionId,
      });
    } catch (err) {
      console.error("Failed to start studio interview:", err);
      setUploadError("Failed to initialize interview session. Please try again.");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="relative min-h-screen text-white selection:bg-cyan-500 selection:text-black">
      <BackgroundFX />

      {/* Top Studio Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#070711]/80 backdrop-blur-xl border-b border-white/10 py-3.5 px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link
            to="/"
            className="group flex items-center gap-3 transition-transform hover:scale-[1.02]"
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-600 to-cyan-400 opacity-60 blur-xs group-hover:opacity-90 transition-opacity" />
              <img
                src="/logo.png"
                alt="Veya AI"
                className="relative h-8 w-8 rounded-full object-cover ring-1 ring-white/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-base font-bold text-white tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Veya AI
              </span>
              <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-mono text-purple-300 border border-purple-500/20">
                STUDIO
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {isInterviewActive && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-mono text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Session Active
              </span>
            )}

            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-white/70 border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:text-white transition-all"
            >
              <ArrowLeft size={13} />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Studio Content Area */}
      <main className="pt-24 pb-20 px-4 sm:px-6">
        {displayError && (
          <div className="mx-auto max-w-xl mb-6">
            <ErrorBanner
              message={displayError}
              onRetry={mm.error ? mm.dismissError : () => setUploadError(null)}
            />
          </div>
        )}

        {/* State A: Pre-Interview Studio Configuration Cockpit */}
        {!isInterviewActive && (
          <div className="mx-auto max-w-2xl text-center" style={{ animation: "fade-up 0.5s ease-out" }}>
            {/* Center Mascot & Title */}
            <div className="relative inline-flex items-center justify-center my-6">
              <div
                className="absolute -inset-4 rounded-full blur-2xl opacity-60"
                style={{
                  background:
                    "radial-gradient(circle, rgba(139,92,246,0.65) 0%, rgba(34,211,238,0.45) 70%, transparent 100%)",
                }}
              />
              <img
                src="/logo.png"
                alt="Veya AI"
                className="relative h-28 w-28 rounded-full object-cover shadow-2xl ring-2 ring-purple-400/25 transition-transform duration-500 hover:scale-105"
                style={{
                  boxShadow:
                    "0 12px 36px -6px rgba(139,92,246,0.5), 0 0 24px rgba(34,211,238,0.3)",
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-950/40 px-3.5 py-1 text-xs font-medium text-cyan-300">
                <Sparkles size={12} className="text-cyan-400" />
                <span>VOICE INTERVIEW COCKPIT</span>
              </div>
              <h1
                className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <span className="text-gradient-electric">Veya Interview Studio</span>
              </h1>
              <p className="mx-auto max-w-md text-sm text-white/60 leading-relaxed">
                Configure your target parameters, optionally attach your resume for tailored technical questions, and practice with real-time AI speech feedback.
              </p>
            </div>

            {/* Studio Settings Card */}
            <div
              className="mt-8 rounded-3xl p-6 sm:p-8 text-left transition-all duration-300"
              style={{
                background: "rgba(14, 14, 28, 0.75)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                boxShadow: "0 20px 50px -10px rgba(0, 0, 0, 0.7), 0 0 30px rgba(139, 92, 246, 0.15)",
              }}
            >
              {/* Parameter 1: Difficulty Level */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/70 mb-3">
                  <Gauge size={14} className="text-cyan-400" />
                  1. Select Difficulty Level
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {DIFFICULTIES.map((d) => {
                    const isSelected = selectedDifficulty === d.value;
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setSelectedDifficulty(d.value)}
                        className={`flex flex-col rounded-xl p-3.5 text-left transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "bg-purple-900/30 border border-cyan-400/60 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                            : "bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.05]"
                        }`}
                      >
                        <span className={`text-sm font-bold ${isSelected ? "text-cyan-300" : "text-white"}`}>
                          {d.label}
                        </span>
                        <span className="text-[11px] text-white/50 mt-1 leading-tight">
                          {d.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Parameter 2: Question Count */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/70 mb-3">
                  <Layers size={14} className="text-purple-400" />
                  2. Number of Questions
                </label>
                <div className="flex gap-3">
                  {QUESTION_LIMITS.map((count) => {
                    const isSelected = selectedLimit === count;
                    return (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setSelectedLimit(count)}
                        className={`flex-1 rounded-xl py-2.5 text-center text-sm font-semibold transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "bg-gradient-to-r from-purple-600/40 to-cyan-500/40 border border-cyan-400/60 text-white shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                            : "bg-white/[0.03] border border-white/10 text-white/70 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        {count} Questions
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Parameter 3: Optional Resume Upload */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/70 mb-3">
                  <span className="flex items-center gap-2">
                    <FileText size={14} className="text-emerald-400" />
                    3. Resume for Tailored Questions (Optional)
                  </span>
                  <span className="text-[10px] text-white/40 font-normal">PDF, DOCX, TXT • Max 5MB</span>
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!resumeFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] p-5 text-center transition-colors hover:border-cyan-400/40 hover:bg-white/[0.04] cursor-pointer"
                  >
                    <Upload size={20} className="text-cyan-400 mb-2" />
                    <span className="text-xs font-medium text-white/80">
                      Click to upload resume (.pdf, .docx, .txt)
                    </span>
                    <span className="text-[11px] text-white/40 mt-0.5">
                      Veya will extract your skills & projects to formulate realistic questions.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                        <FileText size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-white truncate max-w-[220px] sm:max-w-xs">
                          {resumeFile.name}
                        </span>
                        <span className="text-[10px] text-emerald-300">
                          Ready for indexing ({(resumeFile.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setResumeFile(null)}
                      className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                      aria-label="Remove uploaded resume"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}
              </div>

              {/* Start Interview CTA */}
              <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-white/50 text-center sm:text-left">
                  <span>Microphone access required for spoken answers.</span>
                </div>

                <button
                  type="button"
                  onClick={handleStartStudioInterview}
                  disabled={isStarting}
                  className="group relative inline-flex w-full sm:w-auto items-center justify-center overflow-hidden rounded-full px-8 py-3.5 text-sm font-semibold text-white shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #22D3EE 100%)",
                    boxShadow: "0 8px 30px -4px rgba(139, 92, 246, 0.6)",
                  }}
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:animate-[shine-sweep_1.2s_ease-in-out]" />
                  <span className="relative flex items-center gap-2 font-bold tracking-wide">
                    {isStarting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Initializing Veya...</span>
                      </>
                    ) : (
                      <>
                        <span>Start Mock Interview</span>
                        <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State B: Active Live Interview Cockpit */}
        {isInterviewActive && (
          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center gap-6" style={{ animation: "fade-up 0.4s ease-out" }}>
            {/* Main Animated Voice Orb */}
            <VoiceOrb state={orbState} size={150} />

            {/* Current Interview Question Display Card */}
            <div
              className="w-full rounded-2xl p-5 sm:p-6 transition-all duration-300 text-left"
              style={{
                background: "rgba(14, 14, 28, 0.8)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                boxShadow: "0 12px 35px -8px rgba(139, 92, 246, 0.35)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-2 text-xs font-semibold text-purple-300 uppercase tracking-wider">
                  <Volume2 size={14} className="text-cyan-400" />
                  Current Question #{mm.questionNumber}
                </span>
                <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono text-cyan-300 border border-cyan-500/20">
                  {mm.difficulty.toUpperCase()}
                </span>
              </div>

              <p className="text-base sm:text-lg font-semibold text-white leading-relaxed" style={{ fontFamily: "var(--font-heading)" }}>
                {mm.currentQuestion}
              </p>
            </div>

            {/* Spoken Conversation Teleprompter Transcript */}
            <ConversationView transcript={mm.transcript} />

            {/* Interview Progress & Granular Scoring Bar */}
            <InterviewProgress
              questionNumber={mm.questionNumber}
              questionLimit={mm.questionLimit}
              difficulty={mm.difficulty}
              lastFeedback={mm.lastFeedback}
              onEnd={() => mm.setShowQuitModal(true)}
              onSkip={() => mm.setShowSkipModal(true)}
              isSkipping={mm.isSkipping}
            />

            {/* Mic Answering Controls & Actions */}
            {!mm.showResumeModal && !mm.showSetupModal && !mm.showReportModal && (
              <div className="flex flex-col items-center gap-3 w-full">
                <MicControl
                  state={mm.state}
                  seconds={mm.recordSeconds}
                  onStart={mm.startListening}
                  onStop={mm.stopListeningAndSend}
                  label="Tap to answer"
                />

                {/* Auxiliary Question Actions */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => mm.setShowSkipModal(true)}
                    disabled={mm.isSkipping || mm.state === "thinking"}
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-cyan-300 bg-white/[0.03] border border-cyan-400/25 hover:bg-cyan-500/10 hover:border-cyan-400/50 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {mm.isSkipping ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Skipping...</span>
                      </>
                    ) : (
                      <>
                        <SkipForward size={13} />
                        <span>Skip Question</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => mm.setShowQuitModal(true)}
                    disabled={mm.isQuitting}
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-rose-300 bg-white/[0.03] border border-rose-500/25 hover:bg-rose-500/10 hover:border-rose-400/50 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <LogOut size={13} />
                    <span>Quit Interview</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Global Modals */}
      <ResumeUploadModal
        open={mm.showResumeModal}
        onClose={() => mm.setShowResumeModal(false)}
        uploadResume={mm.uploadResume}
      />

      <InterviewSetupModal
        open={mm.showSetupModal}
        onClose={() => mm.setShowSetupModal(false)}
        onBegin={mm.beginInterview}
      />

      <QuitInterviewModal
        open={mm.showQuitModal}
        onClose={() => mm.setShowQuitModal(false)}
        onQuitAndReport={() => mm.quitInterview({ generateReport: true })}
        onQuitAndDiscard={() => mm.quitInterview({ generateReport: false })}
        questionNumber={mm.questionNumber}
        questionLimit={mm.questionLimit}
        isQuitting={mm.isQuitting}
      />

      <SkipQuestionModal
        open={mm.showSkipModal}
        onClose={() => mm.setShowSkipModal(false)}
        onConfirmSkip={mm.skipQuestion}
        questionNumber={mm.questionNumber}
        isSkipping={mm.isSkipping}
      />

      <ReportModal
        open={mm.showReportModal}
        onClose={() => mm.setShowReportModal(false)}
        report={mm.report}
        sessionId={mm.sessionId}
        onStartNew={mm.startNewInterview}
      />

      <audio ref={mm.audioRef} className="hidden" />
    </div>
  );
}