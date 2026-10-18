import { Mic, Square, Loader2, Volume2, AlertCircle } from "lucide-react";

/**
 * MicControl — Primary acoustic interaction component.
 * Features:
 * - Refined, ergonomically sized microphone button (68px)
 * - Restrained, clean cyan/blue glow without oversized circles
 * - Clear, dynamic status feedback based on actual state
 * - Full keyboard navigation and accessible focus ring
 */
export default function MicControl({
  state = "idle",
  seconds = 0,
  onStart,
  onStop,
  label = "Tap to answer",
  permissionError = false,
}) {
  const isListening = state === "listening";
  const isThinking = state === "thinking";
  const isSpeaking = state === "speaking";
  const isError = state === "error";
  const isBusy = isThinking || isSpeaking;

  const formattedTime = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

  const waveBars = [6, 12, 18, 14, 22, 16, 20, 10];

  const buttonAriaLabel = isListening
    ? "Stop recording and submit answer"
    : isThinking
    ? "Processing your answer"
    : isSpeaking
    ? "Veya speaking"
    : "Start recording your answer";

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {/* Central Microphone Trigger Button */}
      <div className="relative flex items-center justify-center">
        {/* Subtle acoustic pulse ring (only during active recording) */}
        {isListening && (
          <span
            className="pointer-events-none absolute -inset-2 rounded-full animate-[orb-pulse-ring_1.8s_ease-out_infinite]"
            style={{
              border: "1.5px solid rgba(244, 63, 94, 0.4)",
            }}
          />
        )}

        {/* Ambient Halo Behind Button — restrained */}
        <div
          className="pointer-events-none absolute -inset-2 rounded-full blur-md transition-all duration-300"
          style={{
            background: isListening
              ? "radial-gradient(circle, rgba(244,63,94,0.4) 0%, transparent 70%)"
              : isThinking
              ? "radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)"
              : isSpeaking
              ? "radial-gradient(circle, rgba(34,211,238,0.35) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(34,211,238,0.2) 0%, transparent 70%)",
          }}
        />

        {/* Button */}
        <button
          type="button"
          onClick={isListening ? onStop : onStart}
          disabled={isBusy}
          aria-label={buttonAriaLabel}
          className={`group relative flex h-17 w-17 items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070711] ${
            isBusy
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer hover:scale-105 active:scale-95"
          }`}
          style={{
            background: isListening
              ? "linear-gradient(135deg, #E11D48 0%, #BE123C 100%)"
              : isThinking
              ? "rgba(22, 18, 38, 0.85)"
              : isSpeaking
              ? "rgba(14, 28, 44, 0.85)"
              : "linear-gradient(135deg, rgba(37,99,235,0.4) 0%, rgba(139,92,246,0.35) 50%, rgba(34,211,238,0.35) 100%)",
            border: isListening
              ? "2px solid rgba(253,164,175,0.8)"
              : "1.5px solid rgba(255,255,255,0.2)",
            boxShadow: isListening
              ? "0 0 25px rgba(225,29,72,0.45)"
              : "0 8px 24px -4px rgba(139,92,246,0.35), 0 0 15px rgba(34,211,238,0.2)",
          }}
        >
          {/* Glass reflection highlight */}
          <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/5 to-white/15" />

          {/* Button Icon */}
          <span className="relative z-10 transition-transform duration-200 group-hover:scale-105">
            {isThinking ? (
              <Loader2 size={24} className="animate-spin text-purple-300" />
            ) : isSpeaking ? (
              <Volume2 size={24} className="text-cyan-300 animate-pulse" />
            ) : isListening ? (
              <Square size={20} className="text-white fill-current" />
            ) : (
              <Mic size={24} className="text-white group-hover:text-cyan-200 transition-colors" />
            )}
          </span>
        </button>
      </div>

      {/* Dynamic Status Feedback Indicator */}
      <div className="flex flex-col items-center">
        {isListening ? (
          <div className="flex items-center gap-2 rounded-full bg-rose-950/60 border border-rose-500/35 px-3.5 py-1 text-xs font-mono text-rose-300 shadow-md">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            <span>Recording · {formattedTime}</span>
            <div className="flex items-center gap-0.5 ml-1">
              {waveBars.map((h, i) => (
                <span
                  key={i}
                  className="w-0.5 bg-rose-400 rounded-full"
                  style={{
                    height: `${h * 0.55}px`,
                    animation: `wave-bounce 0.6s infinite alternate ${i * 0.08}s`,
                  }}
                />
              ))}
            </div>
          </div>
        ) : isThinking ? (
          <div className="flex items-center gap-2 rounded-full bg-purple-950/50 border border-purple-500/25 px-3.5 py-1 text-xs text-purple-200">
            <Loader2 size={12} className="animate-spin text-purple-300" />
            <span>Processing your answer...</span>
          </div>
        ) : isSpeaking ? (
          <div className="flex items-center gap-2 rounded-full bg-cyan-950/50 border border-cyan-500/25 px-3.5 py-1 text-xs text-cyan-200">
            <Volume2 size={12} className="text-cyan-300 animate-pulse" />
            <span>Generating the next question...</span>
          </div>
        ) : isError ? (
          <div className="flex items-center gap-1.5 rounded-full bg-rose-950/40 border border-rose-500/25 px-3.5 py-1 text-xs text-rose-300">
            <AlertCircle size={12} />
            <span>{permissionError ? "Microphone unavailable" : "Connection error • Tap to retry"}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-full bg-white/[0.04] border border-white/10 px-3.5 py-1 text-xs font-medium text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span>{label || "Tap to answer"}</span>
          </div>
        )}
      </div>
    </div>
  );
}

