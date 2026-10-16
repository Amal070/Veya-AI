import axios from "axios";

// Default deployed backend URL on Render
const DEFAULT_BACKEND_URL = "https://veya-ai-backend.onrender.com";

/**
 * Normalizes an API base URL:
 * - Trims whitespace
 * - Removes any trailing slashes
 * - Falls back to the deployed backend URL if unset or invalid
 */
export function normalizeBaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") {
    return DEFAULT_BACKEND_URL;
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return DEFAULT_BACKEND_URL;
  }
  return trimmed.replace(/\/+$/, "");
}

// 1. Check VITE_API_BASE_URL
// 2. Check existing VITE_API_URL
// 3. Fallback to DEFAULT_BACKEND_URL (https://veya-ai-backend.onrender.com)
const RAW_ENV_URL =
  import.meta.env?.VITE_API_BASE_URL ||
  import.meta.env?.VITE_API_URL;

export const BASE_URL = normalizeBaseUrl(RAW_ENV_URL);

/**
 * Constructs an absolute or normalized API URL without duplicate slashes
 * or duplicate /api prefixes.
 */
export function buildApiUrl(path = "") {
  if (!path) return BASE_URL;
  if (/^https?:\/\//i.test(path)) return path;

  const cleanBase = BASE_URL.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  // If cleanBase already ends with /api and cleanPath starts with /api/, avoid duplicate /api
  if (cleanBase.endsWith("/api") && cleanPath.startsWith("/api/")) {
    return `${cleanBase}${cleanPath.slice(4)}`;
  }

  // Prevent accidental double slashes in the path portion
  const joined = `${cleanBase}${cleanPath}`;
  return joined.replace(/([^:]\/)\/+/g, "$1");
}

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

// Request interceptor to normalize URLs and prevent duplicate slashes or duplicate /api
api.interceptors.request.use(
  (config) => {
    if (config.url && !/^https?:\/\//i.test(config.url)) {
      let cleanUrl = config.url.trim();
      const currentBase = (config.baseURL || BASE_URL).replace(/\/+$/, "");

      if (currentBase.endsWith("/api") && cleanUrl.startsWith("/api/")) {
        cleanUrl = cleanUrl.slice(4);
      }

      config.url = cleanUrl.startsWith("/") ? cleanUrl : `/${cleanUrl}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Translates API / network errors into actionable, user-friendly messages.
 */
export function getApiErrorMessage(error, defaultMessage = "An unexpected error occurred.") {
  if (!error) return defaultMessage;

  // 1. HTTP error response received from backend
  if (error.response) {
    const data = error.response.data;

    // FastAPI detail string: {"detail": "..."}
    if (typeof data?.detail === "string" && data.detail.trim().length > 0) {
      return data.detail;
    }

    // FastAPI validation errors: {"detail": [{"msg": "...", "loc": [...]}]}
    if (Array.isArray(data?.detail) && data.detail.length > 0) {
      return data.detail.map((d) => d.msg || d.message || JSON.stringify(d)).join("; ");
    }

    if (typeof data?.message === "string" && data.message.trim().length > 0) {
      return data.message;
    }

    const status = error.response.status;
    switch (status) {
      case 400:
        return "Bad request. Please verify your input and try again.";
      case 404:
        return "The requested session or resource was not found on the server.";
      case 413:
        return "The uploaded file is too large (max 5MB for resume, 10MB for audio).";
      case 415:
        return "Unsupported file format. Please upload a PDF, DOCX, or TXT resume.";
      case 422:
        return "The server could not process the provided data. Please verify your file or answer.";
      case 429:
        return "Rate limit reached. Please wait a moment before trying again.";
      case 502:
      case 503:
      case 504:
        return "The backend service is temporarily waking up or unavailable (Render free tier cold start). Please wait ~30-40 seconds and try again.";
      default:
        if (status >= 500) {
          return `Backend server error (${status}). Please try again in a few moments.`;
        }
        return `Request failed with status ${status}.`;
    }
  }

  // 2. Network / connection failure (CORS rejection, server offline, Render sleeping)
  if (error.code === "ECONNABORTED" || error.message?.toLowerCase().includes("timeout")) {
    return "Request timed out while contacting the backend server. Render instances may take ~30s to wake up on cold start. Please retry.";
  }

  if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
    return "Unable to reach the backend server (https://veya-ai-backend.onrender.com). Please check your connection or wait for the server to wake up.";
  }

  return error.message || defaultMessage;
}

/**
 * Resolves a backend-relative audio path (e.g. "/audio/voice.mp3")
 * into an absolute URL the <audio> element can play.
 */
export function resolveAudioUrl(path) {
  if (!path) return null;
  return buildApiUrl(path);
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
 *
 * NOTE: The endpoint requires multipart field 'file' and query param 'session_id'.
 * Do NOT set 'Content-Type: multipart/form-data' header manually so that the
 * browser/axios generates the correct multipart boundary.
 */
export async function uploadResume(file, sessionId = crypto.randomUUID()) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/resume/upload", formData, {
    params: { session_id: sessionId },
  });

  return { ...response.data, session_id: sessionId };
}

// --- Interview ---------------------------------------------------------------

export async function startInterview(sessionId, questionLimit, difficulty, jobRole = "") {
  const response = await api.post("/interview/start", {
    session_id: sessionId,
    question_limit: questionLimit,
    question_count: questionLimit,
    difficulty,
    job_role: jobRole,
  });
  return response.data;
}

export async function fetchInterviewSession(sessionId) {
  const response = await api.get(`/interview/session/${sessionId}`);
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
  } catch (_err) {
    // Fallback if backend does not yet have /interview/skip
    return submitAnswerText(sessionId, "Candidate opted to skip this question.");
  }
}

export async function endInterviewEarly(sessionId) {
  try {
    const response = await api.post("/interview/end", { session_id: sessionId });
    return response.data;
  } catch (_err) {
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
