const STORAGE_KEY = "veya.session.v2";

const defaultSession = () => ({
  sessionId: null,
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

export function saveSession(session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (err) {
    // localStorage can throw in private-browsing / quota-exceeded cases.
    // Non-fatal — the session just won't persist across reloads.
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
