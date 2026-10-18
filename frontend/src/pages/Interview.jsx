import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Gauge,
  Layers,
  FileText,
  Upload,
  Sparkles,
  Loader2,
  X,
  Send,
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
import { getApiErrorMessage } from "../services/api";

const DIFFICULTIES = [
  { value: "easy", label: "Easy", desc: "Core fundamentals & basic concepts" },
  { value: "medium", label: "Medium", desc: "Practical implementation & trade-offs" },
  { value: "hard", label: "Hard", desc: "Architecture, scalability & security" },
];

const QUESTION_PRESETS = [5, 10, 15];

/**
 * Interview — The professional Veya AI Mock Interview Studio.
 * Provides pre-interview configuration (difficulty, question count, resume upload)
 * and seamless real-time voice interview execution.
 */
export default function Interview() {
  const mm = useVeya();

  // Pre-interview studio configuration state
  const [selectedDifficulty, setSelectedDifficulty] = useState(mm.difficulty || "medium");
  const [selectedPreset, setSelectedPreset] = useState(mm.questionLimit || 5);
  const [customCount, setCustomCount] = useState("");
  const [targetJobRole, setTargetJobRole] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [typedAnswer, setTypedAnswer] = useState("");

  const fileInputRef = useRef(null);
  const isStartingRef = useRef(false);

  const orbState =
    mm.state === "listening" || mm.state === "thinking" || mm.state === "speaking"
      ? mm.state
      : "idle";

  const displayError = mm.micPermissionError || mm.error || uploadError;
  const isInterviewActive = mm.mode === "interview" && mm.currentQuestion && mm.state !== "finished";

  // Derive assistant status message directly from application state
  const assistantStatusLabel = mm.micPermissionError
    ? "Microphone unavailable"
    : mm.state === "listening"
    ? "Listening..."
    : mm.state === "thinking" || mm.isSkipping
    ? "Processing your answer..."
    : mm.state === "speaking"
    ? "Generating the next question..."
    : mm.state === "error"
    ? "Connection error • Ready to retry"
    : "Voice Assistant Ready";

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
    if (isStartingRef.current || isStarting) {
      console.warn("[Interview] Interview initialization already in progress. Ignoring duplicate trigger.");
      return;
    }

    isStartingRef.current = true;
    setIsStarting(true);
    setUploadError(null);

    const rawCount = selectedPreset === "custom" ? (Number(customCount) || 5) : selectedPreset;
    const finalLimit = Math.max(1, Math.min(15, rawCount));

    try {
      let activeSessionId = crypto.randomUUID();
      if (resumeFile) {
        // Upload resume first without opening redundant setup modal
        const uploadResult = await mm.uploadResume(resumeFile, activeSessionId, { openSetupModal: false });
        if (uploadResult?.session_id) {
          activeSessionId = uploadResult.session_id;
        }
      }
      // Begin the interview session using the exact session_id
      await mm.beginInterview({
        questionLimit: finalLimit,
        difficulty: selectedDifficulty,
        sessionId: activeSessionId,
        jobRole: targetJobRole,
      });
    } catch (err) {
      console.error("Failed to start studio interview:", err);
      setUploadError(getApiErrorMessage(err, "Failed to initialize interview session. Please try again."));
    } finally {
      isStartingRef.current = false;
      setIsStarting(false);
    }
  };

  return (
    <div className="relative min-h-screen text-white selection:bg-cyan-500 selection:text-black">
      <BackgroundFX />

      {/* Top Studio Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#070711]/90 backdrop-blur-xl border-b border-white/10 py-2.5 px-4 sm:px-6 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          {/* Logo & Studio Identifier */}
          <Link
            to="/"
            className="group flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 p-1 transition-transform hover:scale-[1.01]"
            aria-label="Veya AI Mock Interview Studio - Back to Home"
          >
            <div className="relative flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Veya AI logo"
                className="h-7 w-7 rounded-full object-cover ring-1 ring-white/20 group-hover:ring-cyan-400/50 transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-base font-bold text-white tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Veya AI
              </span>
              <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono text-cyan-300 border border-cyan-500/20">
                Mock Interview Studio
              </span>
            </div>
          </Link>

          {/* Navigation & Active Session Status */}
          <div className="flex items-center gap-2.5">
            {isInterviewActive && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-mono text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Session Active
              </span>
            )}

            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-white/70 border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:text-white hover:border-cyan-400/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 transition-all cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Studio Content Area */}
      <main className="pt-20 sm:pt-22 pb-16 px-4 sm:px-6">
        {displayError && (
          <div className="mx-auto max-w-2xl mb-4">
            <ErrorBanner
              message={displayError}
              onRetry={mm.error ? mm.dismissError : () => setUploadError(null)}
            />
          </div>
        )}

        {/* State A: Pre-Interview Studio Configuration Cockpit */}
        {!isInterviewActive && (
          <div className="mx-auto max-w-2xl text-center" style={{ animation: "fade-up 0.4s ease-out" }}>
            {/* Mascot Avatar & Title */}
            <div className="relative inline-flex items-center justify-center my-4">
              <div
                className="absolute -inset-2 rounded-full blur-xl opacity-40 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, rgba(139,92,246,0.6) 0%, rgba(34,211,238,0.3) 70%, transparent 100%)",
                }}
              />
              <img
                src="/logo.png"
                alt="Veya AI Interview Coach"
                className="relative h-18 w-18 rounded-full object-cover ring-2 ring-purple-400/25 shadow-xl transition-transform hover:scale-105"
              />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-cyan-950/40 px-3 py-0.5 text-xs font-medium text-cyan-300">
                <Sparkles size={11} className="text-cyan-400" />
                <span>INTERVIEW STUDIO CONFIGURATION</span>
              </div>
              <h1
                className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <span className="text-gradient-electric">Mock Interview Studio</span>
              </h1>
              <p className="mx-auto max-w-md text-xs sm:text-sm text-white/60 leading-relaxed">
                Configure your interview parameters, optionally attach your resume for tailored questions, and practice with real-time AI speech feedback.
              </p>
            </div>

            {/* Studio Settings Card */}
            <div
              className="mt-6 rounded-2xl p-5 sm:p-7 text-left transition-all duration-300"
              style={{
                background: "rgba(11, 11, 22, 0.75)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                boxShadow: "0 16px 40px -10px rgba(0, 0, 0, 0.6), 0 0 20px rgba(139, 92, 246, 0.08)",
              }}
            >
              {/* Parameter 1: Difficulty Level */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/80 mb-2.5">
                  <Gauge size={13} className="text-cyan-400" />
                  1. Difficulty Level
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {DIFFICULTIES.map((d) => {
                    const isSelected = selectedDifficulty === d.value;
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setSelectedDifficulty(d.value)}
                        className={`flex flex-col rounded-xl p-3 text-left transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                          isSelected
                            ? "bg-purple-900/30 border border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                            : "bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.05]"
                        }`}
                      >
                        <span className={`text-xs font-bold ${isSelected ? "text-cyan-300" : "text-white"}`}>
                          {d.label}
                        </span>
                        <span className="text-[10px] text-white/50 mt-0.5 leading-tight">
                          {d.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Parameter 2: Question Count */}
              <div className="mt-5 pt-5 border-t border-white/10">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/80 mb-2.5">
                  <Layers size={13} className="text-purple-400" />
                  2. Number of Questions
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {QUESTION_PRESETS.map((count) => {
                    const isSelected = selectedPreset === count;
                    return (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setSelectedPreset(count)}
                        className={`rounded-xl py-2 text-center text-xs font-semibold transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                          isSelected
                            ? "bg-gradient-to-r from-purple-600/40 to-cyan-500/40 border border-cyan-400/50 text-white shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                            : "bg-white/[0.03] border border-white/10 text-white/70 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        {count} Questions
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setSelectedPreset("custom")}
                    className={`rounded-xl py-2 text-center text-xs font-semibold transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                      selectedPreset === "custom"
                        ? "bg-gradient-to-r from-purple-600/40 to-cyan-500/40 border border-cyan-400/50 text-white shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                        : "bg-white/[0.03] border border-white/10 text-white/70 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {selectedPreset === "custom" && (
                  <div className="mt-2.5">
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={customCount}
                      onChange={(e) => setCustomCount(e.target.value)}
                      placeholder="Enter question count (1–15)"
                      className="w-full rounded-xl px-3.5 py-2 text-xs outline-none bg-white/[0.04] border border-cyan-400/50 text-white placeholder:text-white/40 focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>
                )}
              </div>

              {/* Optional Job Role */}
              <div className="mt-5 pt-5 border-t border-white/10">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/80 mb-2">
                  <Sparkles size={13} className="text-cyan-400" />
                  Target Job Role (Optional)
                </label>
                <input
                  type="text"
                  value={targetJobRole}
                  onChange={(e) => setTargetJobRole(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer, Full Stack Developer"
                  className="w-full rounded-xl px-3.5 py-2 text-xs outline-none bg-white/[0.03] border border-white/10 text-white placeholder:text-white/35 focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40 transition-colors"
                />
              </div>

              {/* Parameter 3: Optional Resume Upload */}
              <div className="mt-5 pt-5 border-t border-white/10">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/80 mb-2.5">
                  <span className="flex items-center gap-2">
                    <FileText size={13} className="text-emerald-400" />
                    3. Resume for Tailored Questions (Optional)
                  </span>
                  <span className="text-[10px] text-white/40 font-normal">PDF, DOCX, TXT • Max 5MB</span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!resumeFile ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-4 text-center transition-colors hover:border-cyan-400/40 hover:bg-white/[0.04] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  >
                    <Upload size={18} className="text-cyan-400 mb-1.5" />
                    <span className="text-xs font-medium text-white/85">
                      Click to upload resume (.pdf, .docx, .txt)
                    </span>
                    <span className="text-[10px] text-white/40 mt-0.5">
                      Veya will extract your skills to formulate relevant technical prompts.
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                        <FileText size={14} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
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
                      className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      aria-label="Remove uploaded resume"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Start Interview CTA */}
              <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[11px] text-white/50 text-center sm:text-left">
                  Microphone access required for spoken answers.
                </span>

                <button
                  type="button"
                  onClick={handleStartStudioInterview}
                  disabled={isStarting}
                  className="group relative inline-flex w-full sm:w-auto items-center justify-center overflow-hidden rounded-full px-7 py-2.5 text-xs font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  style={{
                    background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 50%, #06B6D4 100%)",
                    boxShadow: "0 6px 20px -3px rgba(37, 99, 235, 0.4)",
                  }}
                >
                  <span className="relative flex items-center gap-2 font-bold tracking-wide">
                    {isStarting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Initializing Studio...</span>
                      </>
                    ) : (
                      <>
                        <span>Start Mock Interview</span>
                        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
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
          <div
            className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-4 sm:gap-4.5"
            style={{ animation: "fade-up 0.3s ease-out" }}
          >
            {/* Voice Assistant Area: Compact Visual & State Indicator */}
            <div className="flex flex-col items-center gap-2 mb-1">
              <VoiceOrb state={orbState} size={72} />

              <div
                role="status"
                aria-live="polite"
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border backdrop-blur-sm ${
                  mm.micPermissionError
                    ? "bg-rose-950/40 border-rose-500/30 text-rose-300"
                    : orbState === "listening"
                    ? "bg-rose-950/40 border-rose-500/30 text-rose-300"
                    : orbState === "thinking" || mm.isSkipping
                    ? "bg-purple-950/40 border-purple-500/30 text-purple-200"
                    : orbState === "speaking"
                    ? "bg-cyan-950/40 border-cyan-500/30 text-cyan-200"
                    : "bg-white/[0.04] border-white/10 text-white/70"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    mm.micPermissionError
                      ? "bg-rose-500"
                      : orbState === "listening"
                      ? "bg-rose-500 animate-ping"
                      : orbState === "thinking" || mm.isSkipping
                      ? "bg-purple-400 animate-pulse"
                      : orbState === "speaking"
                      ? "bg-cyan-400 animate-pulse"
                      : "bg-emerald-400"
                  }`}
                  aria-hidden="true"
                />
                <span>{assistantStatusLabel}</span>
              </div>
            </div>

            {/* Main Stage: Conversation Transcript Panel */}
            <ConversationView transcript={mm.transcript} onSpeakText={mm.speakText} />

            {/* Question Progress & Session Actions (Single Skip & Single Quit) */}
            <InterviewProgress
              questionNumber={mm.questionNumber}
              questionLimit={mm.questionLimit}
              difficulty={mm.difficulty}
              lastFeedback={mm.lastFeedback}
              onEnd={() => mm.setShowQuitModal(true)}
              onSkip={() => mm.setShowSkipModal(true)}
              isSkipping={mm.isSkipping}
              isQuitting={mm.isQuitting}
            />

            {/* Primary Microphone & Text Fallback Answering Controls */}
            {!mm.showResumeModal && !mm.showSetupModal && !mm.showReportModal && (
              <div className="flex flex-col items-center w-full max-w-xl gap-3 pt-1">
                <MicControl
                  state={mm.state}
                  seconds={mm.recordSeconds}
                  onStart={mm.startListening}
                  onStop={mm.stopListeningAndSend}
                  label="Tap to answer"
                  permissionError={mm.micPermissionError}
                />

                {/* Text Answering Alternative */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!typedAnswer.trim() || mm.state === "thinking" || mm.state === "speaking") return;
                    const ans = typedAnswer;
                    setTypedAnswer("");
                    await mm.submitTypedAnswer(ans);
                  }}
                  className="flex items-center w-full gap-2 rounded-xl bg-white/[0.03] border border-white/10 px-3.5 py-2 focus-within:border-cyan-400/50 focus-within:ring-1 focus-within:ring-cyan-400/30 transition-all shadow-sm"
                >
                  <input
                    type="text"
                    value={typedAnswer}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                    placeholder="Or type your answer here and press Enter..."
                    disabled={mm.state === "thinking" || mm.state === "speaking" || mm.state === "listening"}
                    className="flex-1 bg-transparent text-xs text-white placeholder:text-white/35 outline-none disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!typedAnswer.trim() || mm.state === "thinking" || mm.state === "speaking" || mm.state === "listening"}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 hover:bg-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <Send size={12} />
                    <span>Send</span>
                  </button>
                </form>
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