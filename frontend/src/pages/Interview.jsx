import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  Mic,
  Volume2,
  Clock,
  CheckCircle2,
  RotateCcw,
  HelpCircle,
  LogOut,
  SkipForward,
  Award,
  Code,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Headphones,
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
  {
    value: "easy",
    label: "Easy",
    roleLevel: "Junior (1–2 YOE)",
    desc: "Core fundamentals, syntax, data structures & basic APIs.",
    badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
  },
  {
    value: "medium",
    label: "Medium",
    roleLevel: "Mid-Level (3–5 YOE)",
    desc: "Practical implementation, system trade-offs & state design.",
    badgeClass: "bg-cyan-500/10 text-cyan-300 border-cyan-500/25",
    isPopular: true,
  },
  {
    value: "hard",
    label: "Hard",
    roleLevel: "Senior (5+ YOE)",
    desc: "Distributed systems, concurrency, scalability & security.",
    badgeClass: "bg-purple-500/10 text-purple-300 border-purple-500/25",
  },
];

const QUESTION_PRESETS = [
  { count: 3, label: "3 Questions", desc: "Quick Drill (~6 min)" },
  { count: 5, label: "5 Questions", desc: "Standard Interview (~15 min)" },
  { count: 10, label: "10 Questions", desc: "Deep Dive (~30 min)" },
];

const POPULAR_ROLES = [
  "Full Stack Developer",
  "Frontend Engineer",
  "Backend & Cloud",
  "AI / ML Engineer",
  "DevOps & SRE",
];

function deriveQuestionCategory(questionText) {
  if (!questionText) return "Technical Assessment";
  const lower = questionText.toLowerCase();
  if (
    lower.includes("resume") ||
    lower.includes("project") ||
    lower.includes("built") ||
    lower.includes("portfolio")
  ) {
    return "Resume Deep Dive";
  }
  if (
    lower.includes("scale") ||
    lower.includes("distributed") ||
    lower.includes("architecture") ||
    lower.includes("system") ||
    lower.includes("database")
  ) {
    return "System Architecture & Design";
  }
  if (
    lower.includes("security") ||
    lower.includes("auth") ||
    lower.includes("jwt") ||
    lower.includes("vulnerability")
  ) {
    return "Security & Infrastructure";
  }
  if (
    lower.includes("algorithm") ||
    lower.includes("complexity") ||
    lower.includes("array") ||
    lower.includes("tree") ||
    lower.includes("query")
  ) {
    return "Algorithms & Problem Solving";
  }
  if (
    lower.includes("tell me") ||
    lower.includes("challenge") ||
    lower.includes("conflict") ||
    lower.includes("team")
  ) {
    return "Behavioral & Leadership";
  }
  return "Engineering Fundamentals";
}

/**
 * Interview — The Professional Veya AI Mock Interview Studio & Live Room.
 * Pure voice & audio first interaction designed for desktop and mobile devices.
 */
export default function Interview() {
  const navigate = useNavigate();
  const mm = useVeya();

  // Studio configuration state
  const [selectedDifficulty, setSelectedDifficulty] = useState(mm.difficulty || "medium");
  const [selectedPreset, setSelectedPreset] = useState(mm.questionLimit || 5);
  const [customCount, setCustomCount] = useState("");
  const [targetJobRole, setTargetJobRole] = useState(mm.jobRole || "");
  const [resumeFile, setResumeFile] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Audio Readiness Test State
  const [isTestingAudio, setIsTestingAudio] = useState(false);

  // Live room interaction state
  const [activeTab, setActiveTab] = useState("voice"); // "voice" | "code"
  const [typedAnswer, setTypedAnswer] = useState("");
  const [showTips, setShowTips] = useState(false);
  const [showFeedbackDrawer, setShowFeedbackDrawer] = useState(true);
  const [showFullTranscript, setShowFullTranscript] = useState(false);

  // Interview Live Stopwatch
  const [sessionSeconds, setSessionSeconds] = useState(0);

  const fileInputRef = useRef(null);
  const isStartingRef = useRef(false);

  const isInterviewActive =
    mm.mode === "interview" && mm.currentQuestion && mm.state !== "finished";
  const isInterviewFinished = mm.state === "finished" || Boolean(mm.report);

  // Manage Stopwatch interval during live interview
  useEffect(() => {
    let interval = null;
    if (isInterviewActive) {
      interval = setInterval(() => {
        setSessionSeconds((prev) => prev + 1);
      }, 1000);
    } else if (!isInterviewActive && !isInterviewFinished) {
      setSessionSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isInterviewActive, isInterviewFinished]);

  const orbState =
    mm.state === "listening" || mm.state === "thinking" || mm.state === "speaking"
      ? mm.state
      : "idle";

  const displayError = mm.micPermissionError || mm.error || uploadError;

  const assistantStatusLabel = mm.micPermissionError
    ? "Microphone access blocked"
    : mm.state === "listening"
    ? "Listening to your answer..."
    : mm.state === "thinking" || mm.isSkipping
    ? "Veya is evaluating your answer..."
    : mm.state === "speaking"
    ? "Veya is speaking..."
    : mm.state === "error"
    ? "Connection error • Ready to retry"
    : "Veya is ready for your answer";

  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

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
      return;
    }

    isStartingRef.current = true;
    setIsStarting(true);
    setUploadError(null);

    const rawCount = selectedPreset === "custom" ? Number(customCount) || 5 : selectedPreset;
    const finalLimit = Math.max(1, Math.min(15, rawCount));

    try {
      let activeSessionId = crypto.randomUUID();
      if (resumeFile) {
        const uploadResult = await mm.uploadResume(resumeFile, activeSessionId, {
          openSetupModal: false,
        });
        if (uploadResult?.session_id) {
          activeSessionId = uploadResult.session_id;
        }
      }

      await mm.beginInterview({
        questionLimit: finalLimit,
        difficulty: selectedDifficulty,
        sessionId: activeSessionId,
        jobRole: targetJobRole,
      });
    } catch (err) {
      console.error("[Interview] Failed to start studio interview:", err);
      setUploadError(
        getApiErrorMessage(err, "Failed to initialize interview session. Please try again.")
      );
    } finally {
      isStartingRef.current = false;
      setIsStarting(false);
    }
  };

  const handleTestSpeaker = async () => {
    if (isTestingAudio) return;
    setIsTestingAudio(true);
    try {
      await mm.speakText(
        "Welcome to Veya AI. Your voice and audio are configured and ready for the interview."
      );
    } finally {
      setIsTestingAudio(false);
    }
  };

  const handleReplayQuestion = () => {
    if (mm.currentQuestion) {
      mm.speakText(mm.currentQuestion);
    }
  };

  const handleTextSubmit = async (e) => {
    e?.preventDefault();
    if (!typedAnswer.trim() || mm.state === "thinking" || mm.state === "speaking") return;
    const ans = typedAnswer;
    setTypedAnswer("");
    await mm.submitTypedAnswer(ans);
  };

  const currentCategory = useMemo(() => {
    return deriveQuestionCategory(mm.currentQuestion);
  }, [mm.currentQuestion]);

  return (
    <div className="relative min-h-screen text-white selection:bg-cyan-500 selection:text-black">
      <BackgroundFX />

      {/* Top Studio HUD Bar — Responsive & Touch Friendly */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#070711]/90 backdrop-blur-xl border-b border-white/10 py-2.5 sm:py-3 px-3 sm:px-6 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          {/* Logo & Brand Identity */}
          <Link
            to="/"
            className="group flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 p-1 shrink-0"
            aria-label="Veya AI Mock Interview Studio - Back to Home"
          >
            <img
              src="/logo.png"
              alt="Veya AI logo"
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-full object-cover ring-1 ring-white/20 group-hover:ring-cyan-400/50 transition-all shrink-0"
            />
            <div className="flex items-center gap-1.5">
              <span
                className="text-sm sm:text-base font-bold text-white tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Veya AI
              </span>
              <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[9px] sm:text-[10px] font-mono font-semibold text-cyan-300 border border-cyan-500/20 whitespace-nowrap">
                {isInterviewActive ? "Live Room" : "Studio"}
              </span>
            </div>
          </Link>

          {/* Active Live Telemetry: Stopwatch & Question Counter */}
          {isInterviewActive && (
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <div className="flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 sm:px-3 py-1 border border-rose-500/25">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
                <span className="text-[10px] sm:text-xs font-mono font-bold text-rose-300 tracking-wider">
                  {formatTimer(sessionSeconds)}
                </span>
              </div>

              <div className="hidden xs:flex items-center gap-1 rounded-full bg-white/[0.04] px-2.5 py-1 border border-white/10 text-[11px] font-mono">
                <span className="text-white/60">Q:</span>
                <span className="font-bold text-cyan-300">
                  {mm.questionNumber}/{mm.questionLimit}
                </span>
              </div>
            </div>
          )}

          {/* Header Action Button */}
          <div className="flex items-center gap-2 shrink-0">
            {isInterviewActive ? (
              <button
                type="button"
                onClick={() => mm.setShowQuitModal(true)}
                className="flex items-center gap-1 sm:gap-1.5 rounded-full px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-rose-300 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition-all cursor-pointer min-h-[36px]"
                title="End Interview"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">End Session</span>
              </button>
            ) : (
              <Link
                to="/"
                className="flex items-center gap-1 sm:gap-1.5 rounded-full px-2.5 sm:px-3.5 py-1.5 text-xs font-medium text-white/70 border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:text-white hover:border-cyan-400/30 transition-all cursor-pointer min-h-[36px]"
              >
                <ArrowLeft size={13} />
                <span className="hidden sm:inline">Back to Home</span>
                <span className="sm:hidden">Home</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Studio Body — Fully Responsive Padding */}
      <main className="pt-16 sm:pt-24 pb-16 px-3 sm:px-6">
        <div className="mx-auto max-w-6xl">
          {displayError && (
            <div className="max-w-3xl mx-auto mb-4 sm:mb-6">
              <ErrorBanner
                message={displayError}
                onRetry={mm.error ? mm.dismissError : () => setUploadError(null)}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* STATE 1: PRE-INTERVIEW STUDIO SETUP (NO CAMERA, 100% AUDIO & VOICE FOCUSED) */}
          {/* ========================================================================= */}
          {!isInterviewActive && !isInterviewFinished && (
            <div className="mx-auto max-w-4xl" style={{ animation: "fade-up 0.35s ease-out" }}>
              {/* Studio Header */}
              <div className="text-center space-y-1.5 sm:space-y-2 mb-6 sm:mb-8">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-cyan-950/40 px-3 py-0.5 text-[11px] font-semibold text-cyan-300">
                  <Sparkles size={11} className="text-cyan-400" />
                  <span>VOICE MOCK INTERVIEW STUDIO</span>
                </div>

                <h1
                  className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Configure Your <span className="text-gradient-electric">Mock Interview</span>
                </h1>

                <p className="mx-auto max-w-lg text-xs sm:text-sm text-slate-300/80 leading-relaxed px-2">
                  Calibrate your target role, difficulty tier, and question count. Practice realistic
                  spoken interviews with live AI evaluation and scoring.
                </p>
              </div>

              {/* 2-Column Responsive Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
                {/* Main Calibration Card (7 Cols on desktop, full width on mobile) */}
                <div
                  className="lg:col-span-7 rounded-2xl p-4 sm:p-6 space-y-5"
                  style={{
                    background: "rgba(11, 11, 22, 0.75)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    boxShadow:
                      "0 16px 40px -10px rgba(0, 0, 0, 0.6), 0 0 20px rgba(139, 92, 246, 0.08)",
                  }}
                >
                  {/* Parameter 1: Target Job Role */}
                  <div>
                    <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/80 mb-2">
                      <span className="flex items-center gap-1.5">
                        <Sparkles size={13} className="text-cyan-400" />
                        1. Target Job Role
                      </span>
                      <span className="text-[10px] text-white/40 font-normal">Optional</span>
                    </label>

                    {/* Role quick selector chips — horizontal wrap */}
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {POPULAR_ROLES.map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setTargetJobRole(role)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer min-h-[32px] ${
                            targetJobRole === role
                              ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-sm"
                              : "bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] border border-white/5"
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      value={targetJobRole}
                      onChange={(e) => setTargetJobRole(e.target.value)}
                      placeholder="e.g. Senior Backend Engineer, Full Stack React Developer"
                      className="w-full rounded-xl px-3.5 py-2.5 text-base sm:text-xs outline-none bg-white/[0.03] border border-white/10 text-white placeholder:text-white/35 focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40 transition-colors"
                    />
                  </div>

                  {/* Parameter 2: Calibrated Difficulty Matrix */}
                  <div className="pt-4 border-t border-white/10">
                    <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/80 mb-2.5">
                      <span className="flex items-center gap-1.5">
                        <Gauge size={13} className="text-cyan-400" />
                        2. Difficulty Level
                      </span>
                      <span className="text-[10px] text-cyan-400 font-mono">Calibrated Tier</span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {DIFFICULTIES.map((d) => {
                        const isSelected = selectedDifficulty === d.value;
                        return (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => setSelectedDifficulty(d.value)}
                            className={`relative flex flex-col rounded-xl p-3 sm:p-3.5 text-left transition-all duration-200 cursor-pointer min-h-[72px] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                              isSelected
                                ? "bg-purple-900/30 border border-cyan-400/60 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                                : "bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.05]"
                            }`}
                          >
                            {d.isPopular && (
                              <span className="absolute -top-2 right-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-1.5 py-0.2 text-[9px] font-bold text-black uppercase tracking-wider">
                                Popular
                              </span>
                            )}
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-xs font-bold ${
                                  isSelected ? "text-cyan-300" : "text-white"
                                }`}
                              >
                                {d.label}
                              </span>
                              <span className="text-[9px] font-mono text-white/40">{d.roleLevel}</span>
                            </div>
                            <span className="text-[10px] text-white/55 mt-1 leading-tight">
                              {d.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Parameter 3: Question Presets */}
                  <div className="pt-4 border-t border-white/10">
                    <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/80 mb-2.5">
                      <span className="flex items-center gap-1.5">
                        <Layers size={13} className="text-purple-400" />
                        3. Number of Questions
                      </span>
                      <span className="text-[10px] text-white/40">Adaptive progression</span>
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {QUESTION_PRESETS.map((preset) => {
                        const isSelected = selectedPreset === preset.count;
                        return (
                          <button
                            key={preset.count}
                            type="button"
                            onClick={() => setSelectedPreset(preset.count)}
                            className={`rounded-xl p-2.5 text-center transition-all duration-200 cursor-pointer min-h-[50px] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                              isSelected
                                ? "bg-gradient-to-r from-purple-600/40 to-cyan-500/40 border border-cyan-400/50 text-white shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                                : "bg-white/[0.03] border border-white/10 text-white/70 hover:border-white/20 hover:text-white"
                            }`}
                          >
                            <div className="text-xs font-bold">{preset.label}</div>
                            <div className="text-[9px] text-white/40 mt-0.5">{preset.desc}</div>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setSelectedPreset("custom")}
                        className={`rounded-xl p-2.5 text-center transition-all duration-200 cursor-pointer min-h-[50px] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                          selectedPreset === "custom"
                            ? "bg-gradient-to-r from-purple-600/40 to-cyan-500/40 border border-cyan-400/50 text-white shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                            : "bg-white/[0.03] border border-white/10 text-white/70 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        <div className="text-xs font-bold">Custom</div>
                        <div className="text-[9px] text-white/40 mt-0.5">1–15 Questions</div>
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
                          placeholder="Enter desired question count (1 to 15)"
                          className="w-full rounded-xl px-3.5 py-2.5 text-base sm:text-xs outline-none bg-white/[0.04] border border-cyan-400/50 text-white placeholder:text-white/40 focus:ring-1 focus:ring-cyan-400"
                        />
                      </div>
                    )}
                  </div>

                  {/* Parameter 4: Resume Ingestion */}
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/80 mb-2">
                      <span className="flex items-center gap-1.5">
                        <FileText size={13} className="text-emerald-400" />
                        4. Resume for Tailored Questions
                      </span>
                      <span className="text-[10px] text-white/40 font-normal">PDF, DOCX, TXT</span>
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
                        className="w-full flex flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-4 text-center transition-colors hover:border-cyan-400/40 hover:bg-white/[0.04] cursor-pointer min-h-[72px] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                      >
                        <Upload size={18} className="text-cyan-400 mb-1" />
                        <span className="text-xs font-medium text-white/85">
                          Tap to attach resume (Optional)
                        </span>
                        <span className="text-[10px] text-white/40 mt-0.5">
                          Veya formulates questions based on your projects and stack
                        </span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                            <FileText size={16} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-white truncate">
                              {resumeFile.name}
                            </span>
                            <span className="text-[10px] text-emerald-300">
                              Parsed for RAG ({(resumeFile.size / 1024).toFixed(0)} KB)
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setResumeFile(null)}
                          className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                          aria-label="Remove uploaded resume"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Audio & Speech Readiness (5 Cols on desktop, full width on mobile) */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Microphone & Sound Check Card */}
                  <div
                    className="rounded-2xl p-4 sm:p-5"
                    style={{
                      background: "rgba(11, 11, 22, 0.75)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      boxShadow: "0 12px 30px -10px rgba(0, 0, 0, 0.5)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <Headphones size={14} className="text-cyan-400" />
                        <span className="text-xs font-semibold text-white uppercase tracking-wider">
                          Audio & Speech Check
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Ready
                      </span>
                    </div>

                    {/* Microphone Diagnostic Bar */}
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-300 shrink-0">
                          <Mic size={15} />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white">Microphone Input</div>
                          <div className="text-[10px] text-white/50">Speak aloud to answer questions</div>
                        </div>
                      </div>

                      {/* Equalizer animation */}
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 border border-white/10 shrink-0">
                        {[40, 75, 55, 90, 60].map((h, i) => (
                          <span
                            key={i}
                            className="w-1 rounded-full bg-cyan-400 animate-pulse"
                            style={{ height: `${h * 0.16}px`, animationDelay: `${i * 120}ms` }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Audio Output Speaker Test Button */}
                    <button
                      type="button"
                      onClick={handleTestSpeaker}
                      disabled={isTestingAudio}
                      className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-medium text-white/80 border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:text-white transition-all cursor-pointer min-h-[40px] disabled:opacity-50"
                    >
                      {isTestingAudio ? (
                        <>
                          <Loader2 size={13} className="animate-spin text-cyan-400" />
                          <span>Playing audio sample...</span>
                        </>
                      ) : (
                        <>
                          <Volume2 size={13} className="text-cyan-400" />
                          <span>Test Speaker / AI Voice Output</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Interview Preparation Guidelines */}
                  <div
                    className="rounded-2xl p-4 sm:p-5"
                    style={{
                      background: "rgba(11, 11, 22, 0.55)",
                      backdropFilter: "blur(16px)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-white/90 uppercase tracking-wider mb-2.5">
                      <ShieldCheck size={14} className="text-emerald-400" />
                      <span>Interview Guidelines</span>
                    </div>

                    <ul className="space-y-2 text-xs text-white/65">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={13} className="text-cyan-400 shrink-0 mt-0.5" />
                        <span>Speak naturally at your normal pace. Both voice and typed responses are supported anytime.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={13} className="text-cyan-400 shrink-0 mt-0.5" />
                        <span>Structure behavioral answers with the STAR method (Situation, Task, Action, Result).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={13} className="text-cyan-400 shrink-0 mt-0.5" />
                        <span>Tap the microphone button to start speaking, and tap again when finished.</span>
                      </li>
                    </ul>
                  </div>

                  {/* Primary Enter Interview Room Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleStartStudioInterview}
                      disabled={isStarting}
                      className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-xl py-3.5 sm:py-4 px-6 text-sm sm:text-base font-bold text-white shadow-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer min-h-[48px] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                      style={{
                        background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 50%, #06B6D4 100%)",
                        boxShadow: "0 6px 24px -2px rgba(37, 99, 235, 0.5)",
                      }}
                    >
                      <span className="flex items-center gap-2 tracking-wide">
                        {isStarting ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Initializing Interview Session...</span>
                          </>
                        ) : (
                          <>
                            <span>Enter Mock Interview Room</span>
                            <ArrowRight
                              size={16}
                              className="transition-transform group-hover:translate-x-1"
                            />
                          </>
                        )}
                      </span>
                    </button>
                    <p className="mt-2 text-center text-[10px] text-white/40">
                      Adaptive multi-turn interview with real-time speech and scoring.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STATE 2: LIVE VOICE INTERVIEW ROOM (MOBILE OPTIMIZED, ZERO CAMERA)         */}
          {/* ========================================================================= */}
          {isInterviewActive && (
            <div className="space-y-4 sm:space-y-5" style={{ animation: "fade-up 0.3s ease-out" }}>
              {/* Telemetry Progress Header Card */}
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

              {/* Main Responsive Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
                {/* Stage 1: AI Interviewer & Question Station (Left 7 Cols on desktop, top on mobile) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Active Question Spotlight Card — Hero of the mobile screen */}
                  <div
                    className="rounded-2xl p-4 sm:p-6"
                    style={{
                      background: "rgba(14, 14, 28, 0.8)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(34, 211, 238, 0.2)",
                      boxShadow:
                        "0 12px 30px -10px rgba(0, 0, 0, 0.5), 0 0 20px rgba(34, 211, 238, 0.06)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-cyan-300 border border-cyan-500/20 uppercase tracking-wider">
                          Question {mm.questionNumber} of {mm.questionLimit}
                        </span>
                        <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-mono text-purple-300 border border-purple-500/20">
                          {currentCategory}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleReplayQuestion}
                        className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer shrink-0 min-h-[28px]"
                      >
                        <Volume2 size={12} />
                        <span className="hidden xs:inline">Replay Audio</span>
                      </button>
                    </div>

                    {/* Question Text */}
                    <div className="text-base sm:text-xl font-semibold text-white leading-relaxed">
                      "{mm.currentQuestion}"
                    </div>

                    {/* Expandable Tips Toggle */}
                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShowTips(!showTips)}
                        className="flex items-center gap-1 text-[11px] text-white/60 hover:text-white transition-colors cursor-pointer min-h-[28px]"
                      >
                        <HelpCircle size={12} className="text-cyan-400" />
                        <span>{showTips ? "Hide Structure Tips" : "Answering Tips"}</span>
                      </button>

                      <span className="text-[10px] text-white/40">
                        {mm.difficulty?.toUpperCase()} Tier
                      </span>
                    </div>

                    {/* Answering Tips Collapsible */}
                    {showTips && (
                      <div className="mt-2.5 p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-200/90 leading-relaxed space-y-1">
                        <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                          <Sparkles size={11} /> Suggested Answering Approach:
                        </div>
                        <p className="text-[11px] text-white/70">
                          1. State your answer directly. 2. Explain technical trade-offs, architecture, or complexity. 3. Reference real-world examples.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* AI Interviewer State Card with Voice Orb */}
                  <div
                    className="rounded-2xl p-4 sm:p-5 relative overflow-hidden"
                    style={{
                      background: "rgba(11, 11, 22, 0.75)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      boxShadow: "0 12px 30px -10px rgba(0, 0, 0, 0.5)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">
                          <VoiceOrb state={orbState} size={58} />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                            <span>Veya AI Interview Coach</span>
                            <span className="rounded-full bg-cyan-500/20 px-1.5 py-0.2 text-[9px] font-mono text-cyan-300">
                              Voice
                            </span>
                          </div>
                          <div className="text-[11px] text-white/60 mt-0.5">
                            {assistantStatusLabel}
                          </div>
                        </div>
                      </div>

                      {/* Speaking state equalizer */}
                      {orbState === "speaking" && (
                        <div className="hidden xs:flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                          {[30, 80, 50, 95, 40].map((h, i) => (
                            <span
                              key={i}
                              className="w-1 rounded-full bg-cyan-400 animate-pulse"
                              style={{ height: `${h * 0.18}px`, animationDelay: `${i * 100}ms` }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Previous Question Feedback Drawer (if available) */}
                  {mm.lastFeedback && (
                    <div
                      className="rounded-2xl p-3.5 sm:p-4 transition-all duration-300"
                      style={{
                        background: "rgba(16, 185, 129, 0.05)",
                        border: "1px solid rgba(16, 185, 129, 0.2)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setShowFeedbackDrawer(!showFeedbackDrawer)}
                        className="w-full flex items-center justify-between text-left cursor-pointer min-h-[32px]"
                      >
                        <div className="flex items-center gap-2">
                          <Award size={14} className="text-emerald-400 shrink-0" />
                          <span className="text-xs font-semibold text-emerald-300">
                            Previous Question Feedback
                          </span>
                          {mm.lastFeedback.score !== undefined && (
                            <span className="rounded-full bg-emerald-500/20 px-2 py-0.2 text-[10px] font-mono font-bold text-emerald-300">
                              {mm.lastFeedback.score}/10
                            </span>
                          )}
                        </div>
                        {showFeedbackDrawer ? (
                          <ChevronUp size={14} className="text-emerald-400" />
                        ) : (
                          <ChevronDown size={14} className="text-emerald-400" />
                        )}
                      </button>

                      {showFeedbackDrawer && (
                        <p className="mt-2 text-xs text-slate-300/90 leading-relaxed border-t border-emerald-500/10 pt-2">
                          {mm.lastFeedback.feedback}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Desktop Transcript Panel (Collapsible on mobile) */}
                  <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#070711]/60">
                    <div className="sm:hidden px-4 py-2.5 border-b border-white/10 bg-white/[0.02]">
                      <button
                        type="button"
                        onClick={() => setShowFullTranscript(!showFullTranscript)}
                        className="w-full flex items-center justify-between text-xs font-medium text-white/70 hover:text-white cursor-pointer min-h-[32px]"
                      >
                        <span className="flex items-center gap-1.5">
                          <MessageSquare size={13} className="text-cyan-400" />
                          <span>Conversation History ({mm.transcript.length} turns)</span>
                        </span>
                        {showFullTranscript ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>

                    <div className={`${showFullTranscript ? "block" : "hidden sm:block"}`}>
                      <ConversationView transcript={mm.transcript} onSpeakText={mm.speakText} />
                    </div>
                  </div>
                </div>

                {/* Stage 2: Candidate Answering Console (Right 5 Cols on desktop, bottom on mobile) */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Response Workspace Card */}
                  <div
                    className="rounded-2xl p-4 sm:p-5"
                    style={{
                      background: "rgba(11, 11, 22, 0.8)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      boxShadow: "0 16px 40px -10px rgba(0, 0, 0, 0.6)",
                    }}
                  >
                    {/* Workspace Tabs Header */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/5">
                        <button
                          type="button"
                          onClick={() => setActiveTab("voice")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[34px] ${
                            activeTab === "voice"
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm"
                              : "text-white/60 hover:text-white"
                          }`}
                        >
                          <Mic size={13} />
                          <span>Voice Answer</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab("code")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[34px] ${
                            activeTab === "code"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-400/40 shadow-sm"
                              : "text-white/60 hover:text-white"
                          }`}
                        >
                          <Code size={13} />
                          <span>Type / Code</span>
                        </button>
                      </div>

                      <span className="text-[11px] text-white/40">
                        {activeTab === "voice" ? "Spoken mode" : "Text fallback"}
                      </span>
                    </div>

                    {/* Tab 1: Voice Response Console */}
                    {activeTab === "voice" && (
                      <div className="flex flex-col items-center py-2 space-y-4">
                        <MicControl
                          state={mm.state}
                          seconds={mm.recordSeconds}
                          onStart={mm.startListening}
                          onStop={mm.stopListeningAndSend}
                          label="Tap to speak your answer"
                          permissionError={mm.micPermissionError}
                        />

                        {/* Inline fallback quick text answer */}
                        <form
                          onSubmit={handleTextSubmit}
                          className="flex items-center w-full gap-2 rounded-xl bg-white/[0.03] border border-white/10 px-3 py-1.5 sm:py-2 focus-within:border-cyan-400/50 focus-within:ring-1 focus-within:ring-cyan-400/30 transition-all shadow-sm"
                        >
                          <input
                            type="text"
                            value={typedAnswer}
                            onChange={(e) => setTypedAnswer(e.target.value)}
                            placeholder="Or type answer here and press Enter..."
                            disabled={
                              mm.state === "thinking" ||
                              mm.state === "speaking" ||
                              mm.state === "listening"
                            }
                            className="flex-1 bg-transparent text-base sm:text-xs text-white placeholder:text-white/35 outline-none disabled:opacity-50 min-h-[36px]"
                          />
                          <button
                            type="submit"
                            disabled={
                              !typedAnswer.trim() ||
                              mm.state === "thinking" ||
                              mm.state === "speaking" ||
                              mm.state === "listening"
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 hover:bg-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer min-h-[34px]"
                          >
                            <Send size={11} />
                            <span>Send</span>
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Tab 2: Code / Structured Answer Scratchpad */}
                    {activeTab === "code" && (
                      <form onSubmit={handleTextSubmit} className="space-y-3">
                        <div className="relative">
                          <textarea
                            value={typedAnswer}
                            onChange={(e) => setTypedAnswer(e.target.value)}
                            rows={6}
                            placeholder="// Type your answer or paste code snippets here...&#10;function solution() {&#10;  // Explain your algorithm or architecture&#10;}"
                            disabled={mm.state === "thinking" || mm.state === "speaking"}
                            className="w-full rounded-xl bg-black/40 border border-white/15 p-3 font-mono text-base sm:text-xs text-cyan-100 placeholder:text-white/30 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                          />
                          <div className="absolute bottom-2.5 right-3 text-[10px] font-mono text-white/40">
                            {typedAnswer.length} chars
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-white/50">
                            Evaluated for design & correctness.
                          </span>

                          <button
                            type="submit"
                            disabled={
                              !typedAnswer.trim() ||
                              mm.state === "thinking" ||
                              mm.state === "speaking"
                            }
                            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-md min-h-[36px]"
                          >
                            {mm.state === "thinking" ? (
                              <>
                                <Loader2 size={13} className="animate-spin" />
                                <span>Evaluating...</span>
                              </>
                            ) : (
                              <>
                                <Send size={13} />
                                <span>Submit Answer</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Quick Session Actions Bar */}
                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => mm.setShowSkipModal(true)}
                        disabled={mm.isSkipping || mm.state === "thinking"}
                        className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors cursor-pointer disabled:opacity-40 min-h-[36px]"
                      >
                        <SkipForward size={13} />
                        <span>Skip question</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => mm.setShowQuitModal(true)}
                        className="flex items-center gap-1.5 text-xs text-rose-300 hover:text-rose-200 transition-colors cursor-pointer min-h-[36px]"
                      >
                        <LogOut size={13} />
                        <span>Finish & report</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STATE 3: INTERVIEW FINISHED / CELEBRATION SCREEN                          */}
          {/* ========================================================================= */}
          {isInterviewFinished && (
            <div
              className="mx-auto max-w-lg text-center p-6 sm:p-8 rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-2xl shadow-2xl space-y-5"
              style={{ animation: "fade-up 0.4s ease-out" }}
            >
              <div className="mx-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 text-cyan-300 shadow-xl">
                <Award size={36} className="animate-bounce" />
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-950/40 px-3 py-0.5 text-xs font-semibold text-emerald-300">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  <span>SESSION COMPLETE</span>
                </div>
                <h2
                  className="text-2xl sm:text-3xl font-extrabold text-white"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Interview Complete!
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Your mock interview has been analyzed across Technical Knowledge, Communication,
                  Confidence, and Problem Solving.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    if (mm.sessionId) {
                      navigate(`/report/${mm.sessionId}`);
                    } else {
                      mm.setShowReportModal(true);
                    }
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold text-white shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer min-h-[44px]"
                  style={{
                    background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 50%, #06B6D4 100%)",
                  }}
                >
                  <span>View Performance Report</span>
                  <ArrowRight size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    mm.startNewInterview();
                    setSessionSeconds(0);
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-white/80 border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white transition-all cursor-pointer min-h-[44px]"
                >
                  <RotateCcw size={14} />
                  <span>Start New Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
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