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
import { loadSession, saveSession, clearSession } from "../services/session";

/**
 * useVeya — single source of truth for the whole app's state machine.
 */

const CLIENT_FALLBACK_QUESTIONS = {
  easy: [
    "Can you explain the main purpose and features of your project?",
    "What is the difference between a list and a tuple in Python?",
    "What is a primary key in a database, and why is it important?",
    "Can you tell me about a project on your resume you are most proud of?",
    "What core technologies did you contribute to your most recent project?",
  ],
  medium: [
    "How did you connect your backend services with your database in your project?",
    "How would you optimize a slow SQL database query in your application?",
    "How would you implement JWT authentication in a web application?",
    "How would you debug an API endpoint that returns unexpected results?",
    "Walk me through a technical challenge you faced recently and how you solved it?",
  ],
  hard: [
    "How would you redesign your system to handle millions of requests while maintaining data integrity?",
    "What security risks could arise from your authentication design, and how would you mitigate them?",
    "How would you investigate a database bottleneck under heavy concurrent traffic?",
    "How would you prevent race conditions and duplicate processing in a high-traffic API?",
    "Describe a difficult architectural trade-off you made and what constraints guided your decision?",
  ],
};

function normalizeQuestion(text) {
  return text ? text.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
}

function getNonRepeatingQuestion(candidateQuestion, currentQ, transcriptHistory, diff = "medium") {
  if (candidateQuestion && candidateQuestion.trim().length > 0) {
    return candidateQuestion.trim();
  }
  const pool = CLIENT_FALLBACK_QUESTIONS[diff] || CLIENT_FALLBACK_QUESTIONS.medium;
  return pool[0] || currentQ || "Can you explain the architecture and key technical decisions behind your projects?";
}

export function useVeya() {
  const saved = loadSession();

  const [state, setState] = useState("idle");
  const [mode, setMode] = useState(saved.mode || "assistant");
  const [error, setError] = useState(null);

  const [sessionId, setSessionId] = useState(saved.sessionId);
  const [transcript, setTranscript] = useState(saved.transcript || []); // [{ role, text, id }]

  // Interview-specific
  const [currentQuestion, setCurrentQuestion] = useState(saved.currentQuestion);
  const [questionNumber, setQuestionNumber] = useState(saved.questionNumber || 0);
  const [questionLimit, setQuestionLimit] = useState(saved.questionLimit || 5);
  const [difficulty, setDifficulty] = useState(saved.difficulty || "medium");
  const [lastFeedback, setLastFeedback] = useState(saved.lastFeedback || null);
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

        const userText = result.transcript || "(answer submitted)";
        pushLine("user", userText);
        setLastFeedback({ score: result.score, feedback: result.feedback });

        if (result.finished) {
          setReport(result.report);
          pushLine("assistant", "That's the end of the interview. Great work!");
          saveSession({
            mode: "finished",
            currentQuestion: null,
            lastFeedback: { score: result.score, feedback: result.feedback },
          });
          await playAudio(result.audio_url);
          setState("finished");
          setShowReportModal(true);
          return;
        }

        const activeDiff = result.difficulty || difficulty;
        if (result.difficulty) {
          setDifficulty(result.difficulty);
        }

        const rawNext = result.next_question;
        const nextQ = getNonRepeatingQuestion(rawNext, currentQuestion, transcript, activeDiff);
        const isOriginalAudio = nextQ === rawNext;

        const nextNum = questionNumber + 1;
        setQuestionNumber(nextNum);
        setCurrentQuestion(nextQ);
        pushLine("assistant", nextQ);

        saveSession({
          questionNumber: nextNum,
          currentQuestion: nextQ,
          difficulty: activeDiff,
          lastFeedback: { score: result.score, feedback: result.feedback },
          transcript: [
            ...transcript,
            { role: "user", text: userText, id: `user-${Date.now()}` },
            { role: "assistant", text: nextQ, id: `assistant-${Date.now()}` },
          ],
        });

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
  }, [recorder, mode, sessionId, pushLine, playAudio, currentQuestion, questionNumber, difficulty, transcript]);

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
    async ({ questionLimit: qLimit, difficulty: diff, sessionId: explicitSessionId = null, jobRole = "" }) => {
      setError(null);
      setShowSetupModal(false);
      const resolvedLimit = Number(qLimit) || 5;
      const resolvedDiff = diff || "medium";
      setQuestionLimit(resolvedLimit);
      setDifficulty(resolvedDiff);
      setMode("interview");
      setState("thinking");
      setTranscript([]);
      setReport(null);
      setLastFeedback(null);

      const targetSessionId = explicitSessionId || sessionId || crypto.randomUUID();
      setSessionId(targetSessionId);

      try {
        const data = await apiStartInterview(targetSessionId, resolvedLimit, resolvedDiff, jobRole);
        const activeDiff = data.difficulty || resolvedDiff;
        const qNum = data.question_number || 1;
        const firstQ = data.question;

        setDifficulty(activeDiff);
        setQuestionNumber(qNum);
        setCurrentQuestion(firstQ);
        pushLine("assistant", firstQ);

        saveSession({
          sessionId: targetSessionId,
          difficulty: activeDiff,
          questionLimit: resolvedLimit,
          questionNumber: qNum,
          currentQuestion: firstQ,
          mode: "interview",
          jobRole,
          transcript: [{ role: "assistant", text: firstQ, id: `assistant-${Date.now()}-0` }],
          lastFeedback: null,
        });

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
    clearSession();
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
        saveSession({
          mode: "finished",
          currentQuestion: null,
          lastFeedback: { score: result.score ?? 0, feedback: result.feedback || "Question skipped." },
        });
        if (result.audio_url) {
          await playAudio(result.audio_url);
        }
        setState("finished");
        setShowReportModal(true);
        setShowSkipModal(false);
        setIsSkipping(false);
        return;
      }

      const activeDiff = result.difficulty || difficulty;
      if (result.difficulty) setDifficulty(result.difficulty);

      const rawNext = result.next_question;
      const nextQ = getNonRepeatingQuestion(rawNext, currentQuestion, transcript, activeDiff);
      const isOriginalAudio = nextQ === rawNext;

      const nextNum = questionNumber + 1;
      setQuestionNumber(nextNum);
      setCurrentQuestion(nextQ);
      pushLine("assistant", nextQ);
      setShowSkipModal(false);
      setIsSkipping(false);

      saveSession({
        questionNumber: nextNum,
        currentQuestion: nextQ,
        difficulty: activeDiff,
        lastFeedback: { score: result.score ?? 0, feedback: result.feedback || "Question skipped." },
        transcript: [
          ...transcript,
          { role: "user", text: "(Question skipped)", id: `user-${Date.now()}` },
          { role: "assistant", text: nextQ, id: `assistant-${Date.now()}` },
        ],
      });

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
  }, [mode, sessionId, isSkipping, recorder, pushLine, playAudio, currentQuestion, questionNumber, transcript, difficulty]);

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
            saveSession({ mode: "finished", currentQuestion: null });
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
      clearSession();
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
    clearSession();
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
            saveSession({
              mode: "finished",
              currentQuestion: null,
              lastFeedback: { score: result.score, feedback: result.feedback },
            });
            setState("finished");
            setShowReportModal(true);
            return;
          }

          const activeDiff = result.difficulty || difficulty;
          if (result.difficulty) setDifficulty(result.difficulty);

          const nextQ = getNonRepeatingQuestion(result.next_question, currentQuestion, transcript, activeDiff);
          const nextNum = questionNumber + 1;
          setQuestionNumber(nextNum);
          setCurrentQuestion(nextQ);
          pushLine("assistant", nextQ);

          saveSession({
            questionNumber: nextNum,
            currentQuestion: nextQ,
            difficulty: activeDiff,
            lastFeedback: { score: result.score, feedback: result.feedback },
            transcript: [
              ...transcript,
              { role: "user", text, id: `user-${Date.now()}` },
              { role: "assistant", text: nextQ, id: `assistant-${Date.now()}` },
            ],
          });
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
