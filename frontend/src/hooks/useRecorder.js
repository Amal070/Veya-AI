import { useCallback, useRef, useState } from "react";

/**
 * useRecorder — minimal manual mic recorder.
 *
 * No VAD, no auto turn-taking, no streaming. The user explicitly starts
 * and stops recording (button press); on stop we hand back a single Blob
 * for the caller to upload. This is the entire mic lifecycle the product
 * needs for both Voice Assistant mode and Interview mode.
 */
export function useRecorder() {
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [permissionError, setPermissionError] = useState(null);

  const cleanupStream = useCallback(() => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : undefined; // let the browser pick a supported default otherwise (e.g. Safari)

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.start();
      setIsRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      return true;
    } catch (err) {
      console.error("Microphone access failed:", err);
      setPermissionError("Couldn't access your microphone. Check your browser permissions and try again.");
      return false;
    }
  }, []);

  /** Stops recording and resolves with the recorded audio Blob. */
  const stop = useCallback(() => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        cleanupStream();
        setIsRecording(false);
        resolve(blob.size > 0 ? blob : null);
      };

      recorder.stop();
    });
  }, [cleanupStream]);

  const cancel = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    cleanupStream();
    setIsRecording(false);
  }, [cleanupStream]);

  return { isRecording, seconds, permissionError, start, stop, cancel };
}
