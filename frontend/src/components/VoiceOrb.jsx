
/**
 * VoiceOrb — Compact, professional acoustic avatar indicator for Veya AI.
 * Displays the signature Veya AI mascot logo with restrained, state-driven
 * lighting and subtle acoustic feedback suitable for a production SaaS application.
 */
export default function VoiceOrb({
  state = "idle",
  size = 76,
  statusText = null,
  showLogo = true,
}) {
  const isListening = state === "listening";
  const isThinking = state === "thinking";
  const isSpeaking = state === "speaking";

  const stateAriaLabel = isSpeaking
    ? "Veya speaking"
    : isThinking
    ? "Processing your answer"
    : isListening
    ? "Listening to your answer"
    : "Veya voice assistant ready";

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <div
        className="relative grid place-items-center select-none transition-transform duration-300"
        style={{ width: size, height: size }}
        role="status"
        aria-label={stateAriaLabel}
      >
        {/* Outward subtle acoustic pulse ring (only during active voice interaction) */}
        {(isListening || isSpeaking) && (
          <span
            className="pointer-events-none absolute inset-0 rounded-full animate-[orb-pulse-ring_2s_ease-out_infinite]"
            style={{
              border: `1.5px solid ${
                isSpeaking ? "rgba(34, 211, 238, 0.45)" : "rgba(244, 63, 94, 0.45)"
              }`,
            }}
          />
        )}

        {/* Ambient Halo Glow — restrained and compact */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full blur-md transition-all duration-500"
          style={{
            background: isListening
              ? "radial-gradient(circle, rgba(244,63,94,0.35) 0%, transparent 70%)"
              : isThinking
              ? "radial-gradient(circle, rgba(168,85,247,0.35) 0%, transparent 70%)"
              : isSpeaking
              ? "radial-gradient(circle, rgba(34,211,238,0.4) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(34,211,238,0.15) 0%, rgba(139,92,246,0.15) 60%, transparent 80%)",
          }}
        />

        {/* Central Avatar Frame */}
        <div
          className={`relative h-full w-full rounded-full p-1 transition-all duration-300 flex items-center justify-center overflow-hidden ${
            isListening
              ? "ring-2 ring-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.35)]"
              : isThinking
              ? "ring-2 ring-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.35)] animate-[pulse-ambient_2.5s_ease-in-out_infinite]"
              : isSpeaking
              ? "ring-2 ring-cyan-400/70 shadow-[0_0_22px_rgba(34,211,238,0.4)] animate-[pulse-ambient_2s_ease-in-out_infinite]"
              : "ring-1 ring-white/20 shadow-[0_0_15px_rgba(139,92,246,0.2)] hover:ring-cyan-400/40"
          }`}
          style={{
            background:
              "linear-gradient(135deg, rgba(18, 18, 36, 0.9) 0%, rgba(10, 10, 20, 0.95) 100%)",
          }}
        >
          {showLogo ? (
            <img
              src="/logo.png"
              alt="Veya AI Interview Coach"
              className="h-full w-full rounded-full object-cover select-none pointer-events-none transition-all duration-300"
              draggable="false"
              style={{
                filter: isListening
                  ? "brightness(1.1) drop-shadow(0 0 8px rgba(244,63,94,0.4))"
                  : isSpeaking
                  ? "brightness(1.15) drop-shadow(0 0 10px rgba(34,211,238,0.5))"
                  : isThinking
                  ? "brightness(1.05) drop-shadow(0 0 8px rgba(168,85,247,0.4))"
                  : "brightness(1.0)",
              }}
            />
          ) : (
            <div className="h-full w-full rounded-full bg-gradient-to-tr from-purple-600/40 to-cyan-400/40" />
          )}

          {/* Glass reflection highlight */}
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 35% 25%, rgba(255,255,255,0.25) 0%, transparent 60%)",
            }}
          />
        </div>
      </div>

      {/* Optional integrated status label if provided */}
      {statusText && (
        <span className="text-[11px] font-medium text-white/60 tracking-wide">
          {statusText}
        </span>
      )}
    </div>
  );
}