import axios from "axios";

const BASE_URL = import.meta.env?.VITE_API_URL || "https://veya.onrender.com/";

export const api = axios.create({
  baseURL: BASE_URL,
});

/**
 * Resolves a backend-relative audio path (e.g. "/audio/voice.mp3")
 * into an absolute URL the <audio> element can play.
 */
export function resolveAudioUrl(path) {
  if (!path) return null;
  return path.startsWith("http") ? path : `${BASE_URL}${path}`;
}

// --- Voice assistant (general chat mode) -----------------------------------

export async function sendVoiceChat(blob, sessionId) {
  const formData = new FormData();
  formData.append("audio", blob, "clip.webm");

  const params = sessionId ? { session_id: sessionId } : {};
  const response = await api.post("/voice/chat", formData, { params });
  return response.data;
}

export async function transcribeClip(blob) {
  const formData = new FormData();
  formData.append("audio", blob, "clip.webm");

  const response = await api.post("/voice/transcribe", formData);
  return response.data; // { transcript }
}

// --- Resume -----------------------------------------------------------------

/**
 * Uploads a resume and establishes the session for the rest of the flow.
 * If sessionId is not provided, a new one is generated client-side so the
 * caller can hold onto it immediately (no need to wait on a round trip).
 */
export async function uploadResume(file, sessionId = crypto.randomUUID()) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post(`/resume/upload?session_id=${sessionId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return { ...response.data, session_id: sessionId };
}

// --- Interview ---------------------------------------------------------------

export async function startInterview(sessionId, questionLimit, difficulty) {
  const response = await api.post("/interview/start", {
    session_id: sessionId,
    question_limit: questionLimit,
    difficulty,
  });
  return response.data;
}

export async function submitAnswerText(sessionId, answer) {
  const response = await api.post("/interview/answer", {
    session_id: sessionId,
    answer,
  });
  return response.data;
}

export async function submitAnswerVoice(sessionId, blob) {
  const formData = new FormData();
  formData.append("audio", blob, "answer.webm");

  const response = await api.post("/interview/voice/answer", formData, {
    params: { session_id: sessionId },
  });
  return response.data;
}

export async function skipInterviewQuestion(sessionId) {
  try {
    const response = await api.post("/interview/skip", { session_id: sessionId });
    return response.data;
  } catch (err) {
    // Fallback if backend does not yet have /interview/skip
    return submitAnswerText(sessionId, "Candidate opted to skip this question.");
  }
}

export async function endInterviewEarly(sessionId) {
  try {
    const response = await api.post("/interview/end", { session_id: sessionId });
    return response.data;
  } catch (err) {
    // Fallback if backend does not yet have /interview/end
    try {
      const rep = await fetchInterviewReport(sessionId);
      if (rep?.report && Object.keys(rep.report).length > 0) {
        return { finished: true, report: rep.report };
      }
    } catch {
      // no-op
    }
    return { finished: true, report: null };
  }
}

export async function fetchInterviewReport(sessionId) {
  const response = await api.get(`/interview/report/${sessionId}`);
  return response.data;
}
