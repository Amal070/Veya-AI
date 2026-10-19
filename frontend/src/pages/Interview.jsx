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
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  Clock,
  CheckCircle2,
  RotateCcw,
  HelpCircle,
  TrendingUp,
  LogOut,
  SkipForward,
  Award,
  Code,
  MessageSquare,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
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
    roleLevel: "Junior (1-2 YOE)",
    desc: "Core fundamentals, syntax, and essential data structures.",
    badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
  },
  {
    value: "medium",
    label: "Medium",
    roleLevel: "Mid-Level (3-5 YOE)",
    desc: "Practical implementation, system trade-offs, and optimization.",
    badgeClass: "bg-cyan-500/10 text-cyan-300 border-cyan-500/25",
    isPopular: true,
  },
  {
    value: "hard",
    label: "Hard",
    roleLevel: "Senior (5+ YOE)",
    desc: "Distributed systems, concurrency, scalability, and security.",
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
  "Backend & Cloud Engineer",
  "AI / ML Engineer",
  "DevOps & SRE",
];

function deriveQuestionCategory(questionText) {
  if (!questionText) return "Technical Assessment";
  const lower = questionText.toLowerCase();
  if (lower.includes("resume") || lower.includes("project") || lower.includes("built") || lower.includes("portfolio")) {
    return "Resume Deep Dive";
  }
  if (lower.includes("scale") || lower.includes("distributed") || lower.includes("architecture") || lower.includes("system") || lower.includes("database")) {
    return "System Architecture & Design";
  }
  if (lower.includes("security") || lower.includes("auth") || lower.includes("jwt") || lower.includes("vulnerability")) {
    return "Security & Infrastructure";
  }
  if (lower.includes("algorithm") || lower.includes("complexity") || lower.includes("array") || lower.includes("tree") || lower.includes("query")) {
    return "Algorithms & Problem Solving";
  }
  if (lower.includes("tell me") || lower.includes("challenge") || lower.includes("conflict") || lower.includes("team")) {
    return "Behavioral & Leadership";
  }
  return "Engineering Fundamentals";
}

/**
 * Interview — The Premier Veya AI Mock Interview Studio & Live Room.
 * Features:
 * - Studio Pre-Flight: Role calibration, difficulty matrix, question presets, resume upload, live camera/mic test.
 * - Live Interview Room: Split-screen stage with AI Interviewer visual, live candidate webcam feed,
 *   elapsed stopwatch, active question card, audio replay, voice answering deck, and code/text scratchpad.
 * - Real-time feedback accordion from previous questions.
 * - Smooth transition to performance evaluation report.
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

  // Live room interaction state
  const [activeTab, setActiveTab] = useState("voice"); // "voice" | "code"
  const [typedAnswer, setTypedAnswer] = useState("");
  const [showTips, setShowTips] = useState(false);
  const [showFeedbackDrawer, setShowFeedbackDrawer] = useState(true);

  // Camera & Media Hardware
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState(null);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // Interview Live Stopwatch
  const [sessionSeconds, setSessionSeconds] = useState(0);

  const fileInputRef = useRef(null);
  const isStartingRef = useRef(false);

  const isInterviewActive = mm.mode === "interview" && mm.currentQuestion && mm.state !== "finished";
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

  // Clean up media tracks on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setCameraPermissionError(null);
    } catch (err) {
      console.warn("[Interview] Camera access denied or unavailable:", err);
      setCameraPermissionError("Camera access denied or unavailable. You can continue in Audio-Only mode.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const toggleCamera = () => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

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
    : "Interviewer Ready";

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

    const rawCount = selectedPreset === "custom" ? (Number(customCount) || 5) : selectedPreset;
    const finalLimit = Math.max(1, Math.min(15, rawCount));

    try {
      let activeSessionId = crypto.randomUUID();
      if (resumeFile) {
        const uploadResult = await mm.uploadResume(resumeFile, activeSessionId, { openSetupModal: false });
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

      // Attempt to auto-enable camera for realistic interview experience if user hasn't explicitly disabled
      if (!cameraActive) {
        startCamera().catch(() => {});
      }
    } catch (err) {
      console.error("[Interview] Failed to start studio interview:", err);
      setUploadError(getApiErrorMessage(err, "Failed to initialize interview session. Please try again."));
    } finally {
      isStartingRef.current = false;
      setIsStarting(false);
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

      {/* Top Studio HUD Bar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#070711]/90 backdrop-blur-xl border-b border-white/10 py-3 px-4 sm:px-6 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
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
                className="h-8 w-8 rounded-full object-cover ring-1 ring-white/20 group-hover:ring-cyan-400/50 transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-base font-bold text-white tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Veya AI
              </span>
              <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-cyan-300 border border-cyan-500/20">
                {isInterviewActive ? "Live Interview Room" : "Interview Studio"}
              </span>
            </div>
          </Link>

          {/* Active Live Telemetry: Timer & Status */}
          {isInterviewActive && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 border border-rose-500/25">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
                <span className="text-[11px] font-mono font-bold text-rose-300 tracking-wider">
                  LIVE • {formatTimer(sessionSeconds)}
                </span>
              </div>

              <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1 border border-white/10 text-xs">
                <span className="text-white/60">Question:</span>
                <span className="font-bold text-white">
                  {mm.questionNumber} / {mm.questionLimit}
                </span>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center gap-2.5">
            {isInterviewActive ? (
              <button
                type="button"
                onClick={() => mm.setShowQuitModal(true)}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-rose-300 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition-all cursor-pointer"
                title="End Interview"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">End Interview</span>
              </button>
            ) : (
              <Link
                to="/"
                className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-white/70 border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:text-white hover:border-cyan-400/30 transition-all cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Back to Home</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Studio Body */}
      <main className="pt-20 sm:pt-24 pb-16 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          {displayError && (
            <div className="max-w-3xl mx-auto mb-6">
              <ErrorBanner
                message={displayError}
                onRetry={mm.error ? mm.dismissError : () => setUploadError(null)}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* STATE 1: PRE-INTERVIEW STUDIO SETUP & HARDWARE CALIBRATION               */}
          {/* ========================================================================= */}
          {!isInterviewActive && !isInterviewFinished && (
            <div className="mx-auto max-w-5xl" style={{ animation: "fade-up 0.4s ease-out" }}>
              {/* Studio Header & Value Props */}
              <div className="text-center space-y-2 mb-8">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-cyan-950/40 px-3.5 py-1 text-xs font-semibold text-cyan-300">
                  <Sparkles size={12} className="text-cyan-400" />
                  <span>STEP 1 OF 2: INTERVIEW STUDIO SETUP</span>
                </div>

                <h1
                  className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Configure Your <span className="text-gradient-electric">Mock Interview</span>
                </h1>

                <p className="mx-auto max-w-xl text-sm text-slate-300/80 leading-relaxed">
                  Tailor your session with calibrated difficulty, job role targeting, and resume RAG.
                  Verify your camera and audio to experience a real-world technical interview simulation.
                </p>
              </div>

              {/* 2-Column Cockpit Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left 7 Columns: Session Calibration Parameters */}
                <div
                  className="lg:col-span-7 rounded-2xl p-5 sm:p-7 space-y-6"
                  style={{
                    background: "rgba(11, 11, 22, 0.75)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    boxShadow: "0 16px 40px -10px rgba(0, 0, 0, 0.6), 0 0 20px rgba(139, 92, 246, 0.08)",
                  }}
                >
                  {/* Parameter 1: Target Job Role */}
                  <div>
                    <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/80 mb-2">
                      <span className="flex items-center gap-2">
                        <Sparkles size={13} className="text-cyan-400" />
                        1. Target Job Role
                      </span>
                      <span className="text-[10px] text-white/40 font-normal">Optional</span>
                    </label>

                    {/* Role quick selector chips */}
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {POPULAR_ROLES.map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setTargetJobRole(role)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            targetJobRole === role
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40"
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
                      placeholder="Or specify custom role (e.g. Senior Backend Engineer, React Specialist)"
                      className="w-full rounded-xl px-3.5 py-2.5 text-xs outline-none bg-white/[0.03] border border-white/10 text-white placeholder:text-white/35 focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40 transition-colors"
                    />
                  </div>

                  {/* Parameter 2: Calibrated Difficulty Matrix */}
                  <div className="pt-5 border-t border-white/10">
                    <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/80 mb-2.5">
                      <span className="flex items-center gap-2">
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
                            className={`relative flex flex-col rounded-xl p-3 text-left transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
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
                              <span className={`text-xs font-bold ${isSelected ? "text-cyan-300" : "text-white"}`}>
                                {d.label}
                              </span>
                              <span className="text-[9px] font-mono text-white/40">{d.roleLevel}</span>
                            </div>
                            <span className="text-[10px] text-white/55 mt-1 leading-tight">{d.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Parameter 3: Question Presets */}
                  <div className="pt-5 border-t border-white/10">
                    <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/80 mb-2.5">
                      <span className="flex items-center gap-2">
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
                            className={`rounded-xl p-2.5 text-center transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
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
                        className={`rounded-xl p-2.5 text-center transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                          selectedPreset === "custom"
                            ? "bg-gradient-to-r from-purple-600/40 to-cyan-500/40 border border-cyan-400/50 text-white shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                            : "bg-white/[0.03] border border-white/10 text-white/70 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        <div className="text-xs font-bold">Custom</div>
                        <div className="text-[9px] text-white/40 mt-0.5">1-15 Questions</div>
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
                          className="w-full rounded-xl px-3.5 py-2 text-xs outline-none bg-white/[0.04] border border-cyan-400/50 text-white placeholder:text-white/40 focus:ring-1 focus:ring-cyan-400"
                        />
                      </div>
                    )}
                  </div>

                  {/* Parameter 4: Resume Ingestion for Tailored RAG Questions */}
                  <div className="pt-5 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/80 mb-2.5">
                      <span className="flex items-center gap-2">
                        <FileText size={13} className="text-emerald-400" />
                        4. Resume for Tailored Prompts
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
                          Click to attach resume (.pdf, .docx, .txt)
                        </span>
                        <span className="text-[10px] text-white/40 mt-0.5">
                          Veya analyzes your past projects, stack, and metrics for tailored questions.
                        </span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                            <FileText size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
                              {resumeFile.name}
                            </span>
                            <span className="text-[10px] text-emerald-300">
                              Parsed for RAG indexing ({(resumeFile.size / 1024).toFixed(0)} KB)
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setResumeFile(null)}
                          className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          aria-label="Remove uploaded resume"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right 5 Columns: Hardware Check & Interview Guidelines */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Camera & Audio Hardware Preview Card */}
                  <div
                    className="rounded-2xl p-5"
                    style={{
                      background: "rgba(11, 11, 22, 0.75)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      boxShadow: "0 12px 30px -10px rgba(0, 0, 0, 0.5)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Video size={14} className="text-cyan-400" />
                        <span className="text-xs font-semibold text-white uppercase tracking-wider">
                          Hardware Calibration
                        </span>
                      </div>
                      <span className="text-[10px] text-white/40 font-mono">Live Booth Preview</span>
                    </div>

                    {/* Camera Video Stream Frame */}
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center shadow-inner">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover transform -scale-x-100 ${
                          cameraActive ? "block" : "hidden"
                        }`}
                      />

                      {!cameraActive && (
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                          <div className="h-12 w-12 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-white/40 mb-2">
                            <VideoOff size={20} />
                          </div>
                          <span className="text-xs font-medium text-white/70">Camera Preview Off</span>
                          <span className="text-[10px] text-white/40 mt-0.5">
                            Enable camera to preview your video framing
                          </span>
                        </div>
                      )}

                      {/* Video Overlay Badges */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 border border-white/10 text-[10px] font-mono">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            cameraActive ? "bg-emerald-400 animate-pulse" : "bg-white/40"
                          }`}
                        />
                        <span>{cameraActive ? "Camera Active" : "Camera Muted"}</span>
                      </div>

                      {/* Camera Toggle Button */}
                      <button
                        type="button"
                        onClick={toggleCamera}
                        className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold bg-black/70 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer"
                      >
                        {cameraActive ? (
                          <>
                            <VideoOff size={12} className="text-rose-400" />
                            <span>Turn Off</span>
                          </>
                        ) : (
                          <>
                            <Video size={12} className="text-emerald-400" />
                            <span>Turn On</span>
                          </>
                        )}
                      </button>
                    </div>

                    {cameraPermissionError && (
                      <p className="mt-2 text-[10px] text-amber-300/80 leading-tight">
                        {cameraPermissionError}
                      </p>
                    )}

                    {/* Microphone Check & Bouncing Audio Bars */}
                    <div className="mt-4 pt-3.5 border-t border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-300">
                          <Mic size={14} />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white">Microphone Input</div>
                          <div className="text-[10px] text-white/50">Audio permissions verified</div>
                        </div>
                      </div>

                      {/* Simulated Audio VU Meter */}
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10">
                        {[40, 70, 50, 90, 60].map((h, i) => (
                          <span
                            key={i}
                            className="w-1 rounded-full bg-cyan-400 animate-pulse"
                            style={{ height: `${h * 0.16}px`, animationDelay: `${i * 120}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Interview Preparation Tips Card */}
                  <div
                    className="rounded-2xl p-5"
                    style={{
                      background: "rgba(11, 11, 22, 0.55)",
                      backdropFilter: "blur(16px)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-white/90 uppercase tracking-wider mb-2.5">
                      <ShieldCheck size={14} className="text-emerald-400" />
                      <span>Interview Room Guidelines</span>
                    </div>

                    <ul className="space-y-2 text-xs text-white/60">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={13} className="text-cyan-400 shrink-0 mt-0.5" />
                        <span>Speak naturally — Veya evaluates clarity, technical rigor, and pacing.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={13} className="text-cyan-400 shrink-0 mt-0.5" />
                        <span>Use the STAR framework (Situation, Task, Action, Result) for behavioral prompts.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={13} className="text-cyan-400 shrink-0 mt-0.5" />
                        <span>Need to write code or architecture notes? Switch to the Code Tab at any turn.</span>
                      </li>
                    </ul>
                  </div>

                  {/* Master CTA Button: Enter Interview Room */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleStartStudioInterview}
                      disabled={isStarting}
                      className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-xl py-3.5 px-6 text-sm font-bold text-white shadow-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
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
                            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                          </>
                        )}
                      </span>
                    </button>
                    <p className="mt-2 text-center text-[10px] text-white/40">
                      Starts an adaptive multi-turn interview with real-time speech and scoring.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STATE 2: THE LIVE SPLIT-SCREEN MOCK INTERVIEW ROOM                        */}
          {/* ========================================================================= */}
          {isInterviewActive && (
            <div className="space-y-6" style={{ animation: "fade-up 0.3s ease-out" }}>
              {/* Telemetry Progress Bar Card */}
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

              {/* Main Split-Screen Studio Stage */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left 6 Columns: AI Interviewer Presence & Active Question */}
                <div className="lg:col-span-6 space-y-4">
                  {/* AI Interviewer Presence Card */}
                  <div
                    className="rounded-2xl p-6 relative overflow-hidden"
                    style={{
                      background: "rgba(11, 11, 22, 0.8)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      boxShadow: "0 16px 40px -10px rgba(0, 0, 0, 0.6)",
                    }}
                  >
                    {/* Interior ambient glow */}
                    <div
                      className="absolute -top-20 left-1/2 -translate-x-1/2 h-44 w-72 rounded-full blur-3xl pointer-events-none opacity-40"
                      style={{
                        background:
                          orbState === "listening"
                            ? "radial-gradient(circle, #f43f5e 0%, transparent 70%)"
                            : orbState === "speaking"
                            ? "radial-gradient(circle, #22d3ee 0%, transparent 70%)"
                            : "radial-gradient(circle, #8b5cf6 0%, transparent 70%)",
                      }}
                    />

                    <div className="relative flex flex-col items-center text-center">
                      {/* Avatar / VoiceOrb with Acoustic Visualizer */}
                      <div className="relative my-2">
                        <VoiceOrb state={orbState} size={84} />
                      </div>

                      {/* Current Status Pill */}
                      <div
                        role="status"
                        aria-live="polite"
                        className={`mt-2 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border backdrop-blur-md ${
                          orbState === "listening"
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
                            orbState === "listening"
                              ? "bg-rose-500 animate-ping"
                              : orbState === "thinking" || mm.isSkipping
                              ? "bg-purple-400 animate-pulse"
                              : orbState === "speaking"
                              ? "bg-cyan-400 animate-pulse"
                              : "bg-emerald-400"
                          }`}
                        />
                        <span>{assistantStatusLabel}</span>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-white/40">AI Mock Interviewer</span>
                        <span className="text-white/20">•</span>
                        <button
                          type="button"
                          onClick={handleReplayQuestion}
                          className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
                        >
                          <Volume2 size={12} />
                          <span>Replay Question Audio</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Active Question Spotlight Card */}
                  <div
                    className="rounded-2xl p-5 sm:p-6"
                    style={{
                      background: "rgba(14, 14, 28, 0.75)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(34, 211, 238, 0.2)",
                      boxShadow: "0 12px 30px -10px rgba(0, 0, 0, 0.5), 0 0 20px rgba(34, 211, 238, 0.05)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-cyan-300 border border-cyan-500/20 uppercase tracking-wider">
                          Question {mm.questionNumber} of {mm.questionLimit}
                        </span>
                        <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-mono text-purple-300 border border-purple-500/20">
                          {currentCategory}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowTips(!showTips)}
                        className="flex items-center gap-1 text-[11px] text-white/60 hover:text-white transition-colors cursor-pointer"
                      >
                        <HelpCircle size={12} className="text-cyan-400" />
                        <span>{showTips ? "Hide Structure Tips" : "Answering Tips"}</span>
                      </button>
                    </div>

                    {/* Question Headline */}
                    <div className="text-base sm:text-lg font-semibold text-white leading-relaxed">
                      "{mm.currentQuestion}"
                    </div>

                    {/* Answering Tips Collapsible */}
                    {showTips && (
                      <div className="mt-3.5 p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-200/90 leading-relaxed space-y-1">
                        <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                          <Sparkles size={11} /> Recommended Answer Framework:
                        </div>
                        <p className="text-[11px] text-white/70">
                          1. State core definition/solution upfront.
                          2. Explain trade-offs, architecture decisions, or complexity.
                          3. Reference a concrete project example from your experience.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Previous Question Feedback Drawer (if available) */}
                  {mm.lastFeedback && (
                    <div
                      className="rounded-2xl p-4 transition-all duration-300"
                      style={{
                        background: "rgba(16, 185, 129, 0.05)",
                        border: "1px solid rgba(16, 185, 129, 0.2)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setShowFeedbackDrawer(!showFeedbackDrawer)}
                        className="w-full flex items-center justify-between text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Award size={14} className="text-emerald-400" />
                          <span className="text-xs font-semibold text-emerald-300">
                            Feedback on Question {mm.questionNumber - 1}
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

                  {/* Conversation History Drawer */}
                  <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#070711]/60">
                    <ConversationView transcript={mm.transcript} onSpeakText={mm.speakText} />
                  </div>
                </div>

                {/* Right 6 Columns: Candidate Video Booth & Response Workspace */}
                <div className="lg:col-span-6 space-y-4">
                  {/* Candidate Live Webcam Booth */}
                  <div
                    className="rounded-2xl p-4 relative overflow-hidden"
                    style={{
                      background: "rgba(11, 11, 22, 0.8)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      boxShadow: "0 12px 30px -10px rgba(0, 0, 0, 0.5)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white uppercase tracking-wider">
                          Candidate Booth
                        </span>
                        <span className="rounded-full bg-white/[0.06] px-2 py-0.2 text-[10px] font-mono text-white/60">
                          You
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={toggleCamera}
                          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors cursor-pointer"
                        >
                          {cameraActive ? (
                            <>
                              <VideoOff size={12} className="text-rose-400" />
                              <span>Camera Off</span>
                            </>
                          ) : (
                            <>
                              <Video size={12} className="text-emerald-400" />
                              <span>Camera On</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Video Frame */}
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/80 border border-white/10 flex items-center justify-center">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover transform -scale-x-100 ${
                          cameraActive ? "block" : "hidden"
                        }`}
                      />

                      {!cameraActive && (
                        <div className="flex flex-col items-center justify-center p-6 text-center">
                          <div className="h-14 w-14 rounded-full bg-gradient-to-tr from-purple-600/30 to-cyan-500/30 border border-white/10 flex items-center justify-center text-white/60 mb-2">
                            <VideoOff size={22} />
                          </div>
                          <span className="text-xs font-semibold text-white">Audio-Only Response Mode</span>
                          <span className="text-[10px] text-white/40 mt-0.5">
                            Camera is muted. You can answer using voice or text below.
                          </span>
                        </div>
                      )}

                      {/* Live Audio Overlay Indicator */}
                      <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded-lg bg-black/60 backdrop-blur-md px-2.5 py-1 border border-white/10">
                        <Mic size={12} className={mm.isRecording ? "text-rose-400 animate-pulse" : "text-white/50"} />
                        <span className="text-[10px] font-mono text-white/80">
                          {mm.isRecording ? `Recording: ${mm.recordSeconds}s` : "Mic Ready"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Answering Workspace (Tabs: Voice Response vs Code Scratchpad) */}
                  <div
                    className="rounded-2xl p-5"
                    style={{
                      background: "rgba(11, 11, 22, 0.8)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      boxShadow: "0 16px 40px -10px rgba(0, 0, 0, 0.6)",
                    }}
                  >
                    {/* Workspace Tabs Header */}
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/5">
                        <button
                          type="button"
                          onClick={() => setActiveTab("voice")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            activeTab === "code"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-400/40 shadow-sm"
                              : "text-white/60 hover:text-white"
                          }`}
                        >
                          <Code size={13} />
                          <span>Code / Scratchpad</span>
                        </button>
                      </div>

                      <div className="text-[11px] text-white/40">
                        {activeTab === "voice" ? "Recommended" : "Text fallback"}
                      </div>
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
                          className="flex items-center w-full gap-2 rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2 focus-within:border-cyan-400/50 focus-within:ring-1 focus-within:ring-cyan-400/30 transition-all shadow-sm"
                        >
                          <input
                            type="text"
                            value={typedAnswer}
                            onChange={(e) => setTypedAnswer(e.target.value)}
                            placeholder="Or type quick answer here and press Enter..."
                            disabled={mm.state === "thinking" || mm.state === "speaking" || mm.state === "listening"}
                            className="flex-1 bg-transparent text-xs text-white placeholder:text-white/35 outline-none disabled:opacity-50"
                          />
                          <button
                            type="submit"
                            disabled={
                              !typedAnswer.trim() ||
                              mm.state === "thinking" ||
                              mm.state === "speaking" ||
                              mm.state === "listening"
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 hover:bg-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
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
                            rows={8}
                            placeholder="// Write your code, pseudo-code, or structured response here...&#10;function solution(input) {&#10;  // Explain your approach and trade-offs&#10;}"
                            disabled={mm.state === "thinking" || mm.state === "speaking"}
                            className="w-full rounded-xl bg-black/40 border border-white/15 p-3 font-mono text-xs text-cyan-100 placeholder:text-white/30 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                          />
                          <div className="absolute bottom-2.5 right-3 text-[10px] font-mono text-white/40">
                            {typedAnswer.length} characters
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/50">
                            Submitted code is evaluated for correctness and design.
                          </span>

                          <button
                            type="submit"
                            disabled={!typedAnswer.trim() || mm.state === "thinking" || mm.state === "speaking"}
                            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-md"
                          >
                            {mm.state === "thinking" ? (
                              <>
                                <Loader2 size={13} className="animate-spin" />
                                <span>Evaluating...</span>
                              </>
                            ) : (
                              <>
                                <Send size={13} />
                                <span>Submit Written Answer</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Quick Skip or Conclude Controls */}
                    <div className="mt-4 pt-3.5 border-t border-white/10 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => mm.setShowSkipModal(true)}
                        disabled={mm.isSkipping || mm.state === "thinking"}
                        className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                      >
                        <SkipForward size={13} />
                        <span>Skip this question</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => mm.setShowQuitModal(true)}
                        className="flex items-center gap-1.5 text-xs text-rose-300 hover:text-rose-200 transition-colors cursor-pointer"
                      >
                        <LogOut size={13} />
                        <span>Finish & generate report</span>
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
              className="mx-auto max-w-xl text-center p-8 rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-2xl shadow-2xl space-y-6"
              style={{ animation: "fade-up 0.4s ease-out" }}
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 text-cyan-300 shadow-xl">
                <Award size={40} className="animate-bounce" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-950/40 px-3 py-0.5 text-xs font-semibold text-emerald-300">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  <span>SESSION COMPLETE</span>
                </div>
                <h2
                  className="text-3xl font-extrabold text-white"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Mock Interview Finished!
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Great job completing your mock interview session. Your performance has been analyzed
                  across Technical Knowledge, Communication, Confidence, and Problem Solving.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    if (mm.sessionId) {
                      navigate(`/report/${mm.sessionId}`);
                    } else {
                      mm.setShowReportModal(true);
                    }
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-xs font-bold text-white shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 50%, #06B6D4 100%)",
                  }}
                >
                  <span>View Comprehensive Performance Report</span>
                  <ArrowRight size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    mm.startNewInterview();
                    setSessionSeconds(0);
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-semibold text-white/80 border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white transition-all cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>Start New Practice Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Global Modals for Studio and Live Room */}
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