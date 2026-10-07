import { useState } from "react";
import { ArrowLeft, SkipForward, LogOut, Loader2 } from "lucide-react";

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
import { useVeya } from "../hooks/useVeya";

// Landing page components
import BackgroundFX from "../components/landing/BackgroundFX";
import Navbar from "../components/landing/Navbar";
import HeroSection from "../components/landing/HeroSection";
import FeatureCards from "../components/landing/FeatureCards";
import InterviewExperience from "../components/landing/InterviewExperience";
import CtaSection from "../components/landing/CtaSection";
import Footer from "../components/landing/Footer";

export default function Home() {
  const mm = useVeya();
  const [hasStarted, setHasStarted] = useState(false);

  // Surface mic permission errors through the same error banner as
  // backend errors, so there's exactly one error UI in the app.
  const displayError = mm.micPermissionError || mm.error;

  const orbState =
    mm.state === "listening" || mm.state === "thinking" || mm.state === "speaking" ? mm.state : "idle";

  const handleStartInterview = () => {
    setHasStarted(true);
    mm.requestInterview();
  };

  const handleTalkToVeya = () => {
    setHasStarted(true);
  };

  if (!hasStarted) {
    return (
      <div className="relative min-h-screen text-white selection:bg-cyan-500 selection:text-black">
        <BackgroundFX />
        <Navbar
          onStartInterview={handleStartInterview}
          onTalkToVeya={handleTalkToVeya}
        />
        <main>
          <HeroSection
            onStartInterview={handleStartInterview}
            onTalkToVeya={handleTalkToVeya}
          />
          <FeatureCards onStartInterview={handleStartInterview} />
          <InterviewExperience onStartInterview={handleStartInterview} />
          <CtaSection
            onStartInterview={handleStartInterview}
            onTalkToVeya={handleTalkToVeya}
          />
        </main>
        <Footer />

        {/* Modals & Audio */}
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
        <ReportModal
          open={mm.showReportModal}
          onClose={() => mm.setShowReportModal(false)}
          report={mm.report}
          sessionId={mm.sessionId}
          onStartNew={mm.startNewInterview}
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
        <audio ref={mm.audioRef} className="hidden" />
      </div>
    );
  }

  const handlePromptSelect = (promptText) => {
    if (promptText.toLowerCase().includes("interview")) {
      mm.requestInterview();
    } else {
      mm.startListening();
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center px-4 pb-16 pt-5 sm:px-6 text-white selection:bg-cyan-500 selection:text-black">
      <BackgroundFX />

      {/* Top Futuristic Cockpit HUD Bar */}
      <header className="flex w-full max-w-3xl items-center justify-between py-3.5 mb-6 border-b border-white/10 bg-[#070711]/60 backdrop-blur-xl px-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-600 to-cyan-400 opacity-60 blur-xs" />
            <img
              src="/logo.png"
              alt="Veya AI"
              className="relative h-8 w-8 rounded-full object-cover ring-1 ring-white/20"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-base font-bold text-white tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Veya AI
              </span>
              <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono text-cyan-300 border border-cyan-500/20">
                {mm.mode === "interview" ? "Mock Interview Studio" : "Voice Assistant"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {mm.mode === "assistant" && (
            <button
              onClick={mm.requestInterview}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-md"
              style={{
                background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
              }}
            >
              <span>Start Interview</span>
              <span className="text-[10px] text-cyan-300">→</span>
            </button>
          )}

          <button
            onClick={() => setHasStarted(false)}
            className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-white/70 border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft size={13} />
            <span>Back to Home</span>
          </button>
        </div>
      </header>

      {/* Main Cockpit Stage */}
      <div className="flex w-full max-w-2xl flex-1 flex-col items-center gap-6">
        {/* Futuristic Orb & Acoustic Halo Stage */}
        <div className="flex flex-col items-center gap-3 my-1">
          <VoiceOrb state={orbState} size={150} />
          
          <div className="flex items-center gap-2 rounded-full px-3 py-1 bg-white/[0.03] border border-white/10 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[11px] font-mono text-white/60">
              {orbState === "listening"
                ? "Listening..."
                : orbState === "thinking"
                ? "Thinking..."
                : orbState === "speaking"
                ? "Speaking..."
                : "Voice Assistant Ready"}
            </span>
          </div>
        </div>

        {displayError && (
          <ErrorBanner message={displayError} onRetry={mm.error ? mm.dismissError : undefined} />
        )}

        {/* Futuristic Transcript Console */}
        <ConversationView transcript={mm.transcript} onSelectPrompt={handlePromptSelect} />

        {/* Live Interview Telemetry Progress */}
        {mm.mode === "interview" && mm.currentQuestion && mm.state !== "finished" && (
          <InterviewProgress
            questionNumber={mm.questionNumber}
            questionLimit={mm.questionLimit}
            difficulty={mm.difficulty}
            lastFeedback={mm.lastFeedback}
            onEnd={() => mm.setShowQuitModal(true)}
            onSkip={() => mm.setShowSkipModal(true)}
            isSkipping={mm.isSkipping}
          />
        )}

        {/* Master Acoustic Mic Control Deck */}
        {!mm.showResumeModal && !mm.showSetupModal && !mm.showReportModal && mm.state !== "finished" && (
          <div className="flex flex-col items-center gap-3 w-full">
            <MicControl
              state={mm.state}
              seconds={mm.recordSeconds}
              onStart={mm.startListening}
              onStop={mm.stopListeningAndSend}
              label={mm.mode === "interview" ? "Tap to answer" : "Tap to speak"}
            />

            {mm.mode === "interview" && (
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
            )}
          </div>
        )}

        {/* Interactive Mode Upsell in Assistant Mode */}
        {mm.mode === "assistant" && mm.state === "idle" && (
          <div
            onClick={mm.requestInterview}
            className="w-full flex items-center justify-between rounded-2xl p-4 transition-all duration-300 hover:scale-[1.01] cursor-pointer"
            style={{
              background: "rgba(18, 18, 36, 0.6)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(139, 92, 246, 0.25)",
              boxShadow: "0 8px 25px -8px rgba(139, 92, 246, 0.2)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <span className="text-base">🎯</span>
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-white">
                  Ready for structured interview practice?
                </div>
                <div className="text-[11px] text-white/50">
                  Attach your resume and test yourself with real-time feedback and evaluation.
                </div>
              </div>
            </div>

            <span className="text-xs font-semibold text-cyan-300 hover:underline shrink-0 ml-3">
              Configure Interview →
            </span>
          </div>
        )}
      </div>

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
