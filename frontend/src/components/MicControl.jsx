import { Mic, Square, Loader2, Radio, Volume2 } from "lucide-react";

/**
 * MicControl — Master acoustic cockpit control deck.
 * Features:
 *  - Multi-tier glowing glass capsule
 *  - Outer acoustic pulse rings
 *  - Dynamic state lighting (Cyan for idle, Crimson pulse for recording, Violet for thinking, Blue for speaking)
 *  - Integrated animated audio waveform indicator
 */
export default function MicControl({ state, seconds, onStart, onStop, label }) {
  const isListening = state === "listening";
  const isThinking = state === "thinking";
  const isSpeaking = state === "speaking";
  const isBusy = isThinking || isSpeaking;

  const formattedTime = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

  // Mini equalizer bars for live recording
  const waveBars = [6, 14, 24, 18, 28, 16, 22, 10];

  return (
    <div className="flex flex-col items-center gap-3.5 select-none" style={{ animation: "fade-up 0.4s ease-out" }}>
      {/* Central Multi-tier Mic Controller */}
      <div className="relative flex items-center justify-center">
        {/* Outward Acoustic Pulse Rings (when recording or speaking) */}
        {(isListening || isSpeaking) && (
          <>
            <span
              className="absolute -inset-4 rounded-full"
              style={{
                border: `1.5px solid ${isListening ? "rgba(244,63,94,0.4)" : "rgba(34,211,238,0.4)"}`,
                animation: "orb-pulse-ring 1.8s ease-out infinite",
              }}
            />
            <span
              className="absolute -inset-8 rounded-full"
              style={{
                border: `1px solid ${isListening ? "rgba(244,63,94,0.2)" : "rgba(139,92,246,0.2)"}`,
                animation: "orb-pulse-ring 1.8s ease-out infinite 0.6s",
              }}
            />
          </>
        )}

        {/* Ambient Halo Behind Button */}
        <div
          className="absolute -inset-3 rounded-full blur-xl transition-all duration-500"
          style={{
            background: isListening
              ? "radial-gradient(circle, rgba(244,63,94,0.6) 0%, transparent 70%)"
              : isThinking
              ? "radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)"
              : isSpeaking
              ? "radial-gradient(circle, rgba(34,211,238,0.6) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(34,211,238,0.3) 0%, rgba(139,92,246,0.3) 60%, transparent 75%)",
          }}
        />

        {/* Main Trigger Button */}
        <button
          type="button"
          onClick={isListening ? onStop : onStart}
          disabled={isBusy}
          aria-label={isListening ? "Stop recording and send" : "Start speaking"}
          className={`group relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300 ${
            isBusy
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer hover:scale-105 active:scale-95"
          }`}
          style={{
            background: isListening
              ? "linear-gradient(135deg, #E11D48 0%, #BE123C 100%)"
              : "linear-gradient(135deg, rgba(34,211,238,0.25) 0%, rgba(139,92,246,0.35) 100%)",
            border: isListening
              ? "2px solid rgba(253,164,175,0.8)"
              : "1.5px solid rgba(255,255,255,0.25)",
            boxShadow: isListening
              ? "0 0 35px rgba(225,29,72,0.6)"
              : "0 10px 30px -5px rgba(139,92,246,0.5), 0 0 20px rgba(34,211,238,0.3)",
          }}
        >
          {/* Inner glass reflection */}
          <span className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/10 to-white/20 pointer-events-none" />

          {/* Button Icon */}
          <span className="relative z-10 transition-transform duration-200 group-hover:scale-110">
            {isThinking ? (
              <Loader2 size={28} className="animate-spin text-cyan-300" />
            ) : isSpeaking ? (
              <Volume2 size={26} className="text-cyan-300 animate-pulse" />
            ) : isListening ? (
              <Square size={22} className="text-white" fill="currentColor" />
            ) : (
              <Mic size={26} className="text-white" />
            )}
          </span>
        </button>
      </div>

      {/* Dynamic Status Feedback Pill */}
      <div className="flex flex-col items-center gap-1.5">
        {isListening ? (
          <div className="flex items-center gap-2 rounded-full bg-rose-950/60 border border-rose-500/40 px-3.5 py-1 text-xs font-mono text-rose-300 backdrop-blur-md shadow-lg shadow-rose-950/30">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            <span>Recording · {formattedTime}</span>
            <div className="flex items-center gap-0.5 ml-1">
              {waveBars.map((h, i) => (
                <span
                  key={i}
                  className="w-0.5 bg-rose-400 rounded-full"
                  style={{
                    height: `${h * 0.6}px`,
                    animation: `wave-bounce 0.6s infinite alternate ${i * 0.08}s`,
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-full bg-white/[0.04] border border-white/10 px-4 py-1 text-xs font-medium text-white/70 backdrop-blur-sm">
            <Radio size={13} className={isSpeaking ? "text-cyan-400 animate-pulse" : "text-white/40"} />
            <span>
              {isThinking
                ? "Thinking..."
                : isSpeaking
                ? "Veya speaking..."
                : label || "Tap to speak"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
