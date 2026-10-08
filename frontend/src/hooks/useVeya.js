import { useCallback, useRef, useState } from "react";
import { useRecorder } from "./useRecorder";
import {
  fetchInterviewReport,
  resolveAudioUrl,
  sendVoiceChat,
  startInterview as apiStartInterview,
  submitAnswerText,
  submitAnswerVoice,
  uploadResume as apiUploadResume,
  skipInterviewQuestion as apiSkipInterviewQuestion,
  endInterviewEarly as apiEndInterviewEarly,
} from "../services/api";

/**
 * useVeya — single source of truth for the whole app's state machine.
 *
 * States (exactly these, nothing more):
 *   idle       — nothing happening, waiting for the user to act
 *   listening  — mic is recording the user's voice
 *   thinking   — waiting on a backend response (STT/LLM/TTS)
 *   speaking   — assistant's reply audio is playing
 *   interview  — an interview is in progress (sub-state of the flow; the
 *                listening/thinking/speaking states still apply *within*
 *                an interview turn, this flag just gates which UI shows)
 *   finished   — interview is complete, report is ready
 *   error      — something failed; message explains what
 *
 * Mode (separate from state): "assistant" | "interview" — decides which
 * backend endpoints get called.
 */

const CLIENT_FALLBACK_QUESTIONS = {
  easy: [
    "Can you tell me about a project you're proud of and what your role was?",
    "How do you approach debugging when an application throws an unexpected error?",
    "What is your process for collaborating with teammates during code reviews?",
    "How do you prioritize your work when balancing multiple competing deadlines?",
    "Describe a time you had to quickly learn and adopt a new tool or technology?",
    "How do you ensure your code is maintainable and well-documented for others?",
  ],
  medium: [
    "Walk me through a technical challenge you faced recently and how you solved it.",
    "How do you design RESTful or GraphQL APIs for high reliability and clean versioning?",
    "Explain how you identify and resolve database query performance bottlenecks.",
    "How do you prevent race conditions and manage state in asynchronous systems?",
    "Describe your approach to designing resilient error handling and retry mechanisms.",
    "What strategies do you use for containerization and automated CI/CD deployments?",
  ],
  hard: [
    "Describe a difficult architectural trade-off you made and what constraints guided your decision.",
    "How do you ensure data consistency across distributed microservices under network partitions?",
    "Walk me through how you design a multi-tier caching layer to prevent cache stampedes.",
    "How would you architect a zero-downtime schema migration strategy for high-throughput tables?",
    "Explain how you structure observability, distributed tracing, and MTTR alerting at scale.",
    "How do you mitigate cascading failures and rate-limit abusive traffic across clusters?",
  ],
};

function normalizeQuestion(text) {
  return text ? text.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
}

function getNonRepeatingQuestion(candidateQuestion, currentQ, transcriptHistory, diff = "medium") {
  if (candidateQuestion && candidateQuestion.trim().length > 0) {
    return candidateQuestion.trim();
  }
  return currentQ || "Can you explain the architecture and key technical decisions behind your projects?";
}

export function useVeya() {
  const [state, setState] = useState("idle");
  const [mode, setMode] = useState("assistant");
  const [error, setError] = useState(null);

  const [sessionId, setSessionId] = useState(null);
  const [transcript, setTranscript] = useState([]); // [{ role, text, id }]

  // Interview-specific
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [questionLimit, setQuestionLimit] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");
  const [lastFeedback, setLastFeedback] = useState(null);
  const [report, setReport] = useState(null);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isQuitting, setIsQuitting] = useState(false);

  // Modal flags — purely UI, driven by explicit user intent/events rather
  // than guessed from transcript text.
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [resumeSessionId, setResumeSessionId] = useState(null);

  const recorder = useRecorder();
  const audioRef = useRef(null);

  const pushLine = useCallback((role, text) => {
    setTranscript((prev) => [...prev, { role, text, id: `${role}-${Date.now()}-${prev.length}` }]);
  }, []);

  const playAudio = useCallback((audioUrl) => {
    return new Promise((resolve) => {
      const url = resolveAudioUrl(audioUrl);
      if (!url || !audioRef.current) {
        resolve();
        return;
      }
      const el = audioRef.current;
      setState("speaking");

      const done = () => {
        el.onended = null;
        el.onerror = null;
        resolve();
      };

      el.src = url;
      el.onended = done;
      el.onerror = done;
      el.play().catch(() => done());
    });
  }, []);

  // --- Intent detection ------------------------------------------------------

  function mentionsInterview(text) {
    const t = text.toLowerCase();
    return ["interview", "mock interview", "take my interview"].some((kw) => t.includes(kw));
  }

  // --- Assistant mode ----------------------------------------------------------

  const startListening = useCallback(async () => {
    setError(null);
    const ok = await recorder.start();
    if (ok) setState("listening");
    else setState("error");
  }, [recorder]);

  const stopListeningAndSend = useCallback(async () => {
    const blob = await recorder.stop();
    if (!blob) {
      setState("idle");
      return;
    }

    setState("thinking");

    try {
      if (mode === "interview") {
        // Interview answer path
        const result = await submitAnswerVoice(sessionId, blob);
        if (result.retry) {
          pushLine("assistant", result.message);
          await playAudio(result.audio_url);
          setState("idle");
          return;
        }

        pushLine("user", result.transcript || "(answer submitted)");
        setLastFeedback({ score: result.score, feedback: result.feedback });

        if (result.finished) {
          setReport(result.report);
          pushLine("assistant", "That's the end of the interview. Great work!");
          await playAudio(result.audio_url);
          setState("finished");
          setShowReportModal(true);
          return;
        }

        const rawNext = result.next_question;
        const nextQ = getNonRepeatingQuestion(rawNext, currentQuestion, transcript, difficulty);
        const isOriginalAudio = nextQ === rawNext;

        setQuestionNumber((n) => n + 1);
        setCurrentQuestion(nextQ);
        pushLine("assistant", nextQ);
        if (isOriginalAudio && result.audio_url) {
          await playAudio(result.audio_url);
        }
        setState("idle");
        return;
      }

      // Free-chat assistant path
      const result = await sendVoiceChat(blob, sessionId);
      if (result.retry) {
        pushLine("assistant", result.message);
        await playAudio(result.audio_url);
        setState("idle");
        return;
      }

      if (!sessionId) setSessionId(result.session_id);
      pushLine("user", result.transcript);
      pushLine("assistant", result.message);

      if (mentionsInterview(result.transcript)) {
        setResumeSessionId(result.session_id || sessionId);
        setShowResumeModal(true);
      }

      await playAudio(result.audio_url);
      setState("idle");
    } catch (err) {
      console.error("Voice exchange failed:", err);
      setError("Something went wrong talking to Veya. Please try again.");
      setState("error");
    }
  }, [recorder, mode, sessionId, pushLine, playAudio]);

  const requestInterview = useCallback(() => {
    setResumeSessionId(sessionId || crypto.randomUUID());
    setShowResumeModal(true);
  }, [sessionId]);

  // --- Resume upload -----------------------------------------------------------

  const uploadResume = useCallback(
    async (file, explicitSessionId = null) => {
      setError(null);
      const targetSessionId = explicitSessionId || resumeSessionId || sessionId || crypto.randomUUID();
      const data = await apiUploadResume(file, targetSessionId);
      setSessionId(data.session_id);
      setResumeSessionId(data.session_id);
      setShowResumeModal(false);
      setShowSetupModal(true);
      return data;
    },
    [resumeSessionId, sessionId]
  );

  // --- Interview setup + lifecycle ----------------------------------------------

  const beginInterview = useCallback(
    async ({ questionLimit: qLimit, difficulty: diff, sessionId: explicitSessionId = null }) => {
      setError(null);
      setShowSetupModal(false);
      setQuestionLimit(qLimit);
      setDifficulty(diff);
      setMode("interview");
      setState("thinking");
      setTranscript([]);
      setReport(null);
      setLastFeedback(null);

      const targetSessionId = explicitSessionId || sessionId || crypto.randomUUID();
      setSessionId(targetSessionId);

      try {
        const data = await apiStartInterview(targetSessionId, qLimit, diff);
        setQuestionNumber(data.question_number || 1);
        setCurrentQuestion(data.question);
        pushLine("assistant", data.question);
        await playAudio(data.audio_url);
        setState("idle");
      } catch (err) {
        console.error("Failed to start interview:", err);
        setError("Couldn't start the interview. Please try again.");
        setState("error");
      }
    },
    [sessionId, pushLine, playAudio]
  );

  const endInterview = useCallback(() => {
    setMode("assistant");
    setState("idle");
    setCurrentQuestion(null);
    setQuestionNumber(0);
    setLastFeedback(null);
    setShowReportModal(false);
    setShowQuitModal(false);
    setShowSkipModal(false);
  }, []);

  const skipQuestion = useCallback(async () => {
    if (mode !== "interview" || !sessionId || isSkipping) return;

    if (recorder.isRecording) {
      recorder.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }

    setIsSkipping(true);
    setState("thinking");
    setError(null);
    pushLine("user", "(Question skipped)");

    try {
      const result = await apiSkipInterviewQuestion(sessionId);
      setLastFeedback({
        score: result.score ?? 0,
        feedback: result.feedback || "Question skipped.",
      });

      if (result.finished) {
        setReport(result.report);
        pushLine("assistant", "That concludes the interview session. Here is your evaluation report.");
        if (result.audio_url) {
          await playAudio(result.audio_url);
        }
        setState("finished");
        setShowReportModal(true);
        setShowSkipModal(false);
        setIsSkipping(false);
        return;
      }

      const rawNext = result.next_question;
      const nextQ = getNonRepeatingQuestion(rawNext, currentQuestion, transcript, difficulty);
      const isOriginalAudio = nextQ === rawNext;

      setQuestionNumber((n) => n + 1);
      setCurrentQuestion(nextQ);
      pushLine("assistant", nextQ);
      setShowSkipModal(false);
      setIsSkipping(false);
      if (isOriginalAudio && result.audio_url) {
        await playAudio(result.audio_url);
      }
      setState("idle");
    } catch (err) {
      console.error("Failed to skip question:", err);
      setError("Failed to skip question. Please try again.");
      setIsSkipping(false);
      setState("idle");
    }
  }, [mode, sessionId, isSkipping, recorder, pushLine, playAudio, currentQuestion, transcript, difficulty]);

  const quitInterview = useCallback(
    async ({ generateReport = false } = {}) => {
      if (recorder.isRecording) {
        recorder.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }

      if (generateReport && sessionId) {
        setIsQuitting(true);
        setState("thinking");
        setError(null);
        try {
          const result = await apiEndInterviewEarly(sessionId);
          setIsQuitting(false);
          setShowQuitModal(false);
          if (result.report && Object.keys(result.report).length > 0) {
            setReport(result.report);
            pushLine("assistant", "Interview concluded early. Here is your evaluation summary.");
            setState("finished");
            setShowReportModal(true);
            return;
          }
        } catch (err) {
          console.error("Failed to generate early report:", err);
          setIsQuitting(false);
        }
      }

      // Discard session and return to idle
      setShowQuitModal(false);
      setMode("assistant");
      setState("idle");
      setCurrentQuestion(null);
      setQuestionNumber(0);
      setLastFeedback(null);
      setShowReportModal(false);
    },
    [recorder, sessionId, pushLine]
  );

  const startNewInterview = useCallback(() => {
    setShowReportModal(false);
    setReport(null);
    setTranscript([]);
    setCurrentQuestion(null);
    setQuestionNumber(0);
    setLastFeedback(null);
    setMode("assistant");
    setState("idle");
    const freshSessionId = crypto.randomUUID();
    setSessionId(freshSessionId);
    setResumeSessionId(freshSessionId);
    setShowResumeModal(true);
  }, []);

  const loadReportForSession = useCallback(async (id) => {
    const data = await fetchInterviewReport(id);
    setReport(data.report);
    return data;
  }, []);

  // --- Text fallback (used if mic permission denied) ---------------------------

  const submitTypedAnswer = useCallback(
    async (text) => {
      if (!text.trim()) return;
      setState("thinking");
      try {
        if (mode === "interview") {
          const result = await submitAnswerText(sessionId, text);
          pushLine("user", text);
          setLastFeedback({ score: result.score, feedback: result.feedback });

          if (result.finished) {
            setReport(result.report);
            pushLine("assistant", "That's the end of the interview. Great work!");
            setState("finished");
            setShowReportModal(true);
            return;
          }

          const nextQ = getNonRepeatingQuestion(result.next_question, currentQuestion, transcript, difficulty);
          setQuestionNumber((n) => n + 1);
          setCurrentQuestion(nextQ);
          pushLine("assistant", nextQ);
          setState("idle");
        } else {
          pushLine("user", text);
          if (mentionsInterview(text)) {
            setResumeSessionId(sessionId || crypto.randomUUID());
            setShowResumeModal(true);
            setState("idle");
            return;
          }
          setState("idle");
        }
      } catch (err) {
        console.error("Failed to submit answer:", err);
        setError("Something went wrong. Please try again.");
        setState("error");
      }
    },
    [mode, sessionId, pushLine]
  );

  const dismissError = useCallback(() => {
    setError(null);
    setState("idle");
  }, []);

  return {
    // state machine
    state,
    mode,
    error,
    dismissError,

    // session/transcript
    sessionId,
    transcript,

    // mic
    isRecording: recorder.isRecording,
    recordSeconds: recorder.seconds,
    micPermissionError: recorder.permissionError,
    startListening,
    stopListeningAndSend,
    cancelListening: recorder.cancel,

    // interview
    currentQuestion,
    questionNumber,
    questionLimit,
    difficulty,
    lastFeedback,
    report,
    requestInterview,
    beginInterview,
    endInterview,
    quitInterview,
    skipQuestion,
    isSkipping,
    isQuitting,
    startNewInterview,
    loadReportForSession,
    submitTypedAnswer,

    // modals
    showResumeModal,
    setShowResumeModal,
    showSetupModal,
    setShowSetupModal,
    showReportModal,
    setShowReportModal,
    showQuitModal,
    setShowQuitModal,
    showSkipModal,
    setShowSkipModal,
    uploadResume,

    // audio element ref the component must attach to <audio>
    audioRef,
  };
}
