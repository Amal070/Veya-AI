const STORAGE_KEY = "veya.session.v2";

export const defaultSession = () => ({
  sessionId: null,
  difficulty: "medium",
  questionLimit: 5,
  questionNumber: 0,
  currentQuestion: null,
  mode: "assistant",
  transcript: [],
  lastFeedback: null,
  jobRole: "",
});

export function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSession();
    const parsed = JSON.parse(raw);
    return { ...defaultSession(), ...parsed };
  } catch (err) {
    console.warn("Failed to load saved session, starting fresh:", err);
    return defaultSession();
  }
}

export function saveSession(patch) {
  try {
    const current = loadSession();
    const updated = { ...current, ...patch };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn("Failed to save session:", err);
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
