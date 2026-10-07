import React from "react";

/**
 * VoiceOrb — Signature 3D acoustic orb indicator for Veya AI.
 * Enhanced with futuristic concentric acoustic radar rings,
 * dual-layer ambient chromatic glow, and state-driven particle pulses.
 */
const RING_COUNT = { idle: 1, listening: 2, thinking: 1, speaking: 3 };

export default function VoiceOrb({ state = "idle", size = 180, level = 0 }) {
  const isListening = state === "listening";
  const isThinking = state === "thinking";
  const isSpeaking = state === "speaking";

  const levelScale = isListening ? 1 + Math.min(level, 1) * 0.12 : 1;
  const swirlDuration = isSpeaking ? "2.8s" : isThinking ? "4s" : "12s";
  const coreScale = isThinking ? 0.88 : isSpeaking ? 1.08 : 1;
  const coreOpacity = state === "idle" ? 0.65 : 1;

  return (
    <div
      className="relative grid place-items-center select-none"
      style={{ width: size, height: size }}
      role="status"
      aria-label={
        isSpeaking
          ? "Assistant speaking"
          : isThinking
          ? "Assistant thinking"
          : isListening
          ? "Listening"
          : "Idle"
      }
    >
      {/* Outer Acoustic Hologram Ring 1 */}
      <div
        className="pointer-events-none absolute -inset-6 rounded-full border border-cyan-500/20"
        style={{
          boxShadow: isSpeaking
            ? "0 0 30px rgba(34, 211, 238, 0.25)"
            : "0 0 15px rgba(139, 92, 246, 0.15)",
          animation: "spin-orbit 20s linear infinite",
        }}
      >
        <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
      </div>

      {/* Outer Acoustic Hologram Ring 2 (Counter-spin) */}
      <div
        className="pointer-events-none absolute -inset-3 rounded-full border border-purple-500/20"
        style={{
          boxShadow: "0 0 20px rgba(139, 92, 246, 0.15)",
          animation: "spin-orbit-reverse 26s linear infinite",
        }}
      >
        <span className="absolute -bottom-1 right-1/3 h-1.5 w-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc]" />
      </div>

      {/* Outward Acoustic Pulse Rings (when speaking or listening) */}
      {Array.from({ length: RING_COUNT[state] ?? 0 }).map((_, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            inset: 0,
            border: `1.5px solid ${
              isSpeaking
                ? "rgba(34,211,238,0.5)"
                : isListening
                ? "rgba(244,63,94,0.4)"
                : "rgba(139,92,246,0.25)"
            }`,
            animation: `orb-pulse-ring ${isSpeaking ? 1.6 : 2.5}s ease-out infinite`,
            animationDelay: `${i * (isSpeaking ? 0.5 : 0.8)}s`,
          }}
        />
      ))}

      {/* Outer Drifting Gradient Aura (Atmospheric depth) */}
      <div
        className="absolute rounded-full opacity-80 blur-2xl transition-all duration-700"
        style={{
          inset: "8%",
          background: isListening
            ? "conic-gradient(from 0deg, #F43F5E, #8B5CF6, #F43F5E)"
            : "conic-gradient(from 0deg, #8B5CF6, #22D3EE, #3B82F6, #8B5CF6)",
          animation: `orb-drift ${swirlDuration} linear infinite`,
        }}
      />

      {/* Mid Swirl Layer */}
      <div
        className="absolute rounded-full"
        style={{
          inset: "16%",
          background: isListening
            ? "conic-gradient(from 90deg, #FB7185, #8B5CF6, #FB7185)"
            : "conic-gradient(from 90deg, #22D3EE, #8B5CF6, #3B82F6, #22D3EE)",
          opacity: isThinking ? 0.9 : 0.7,
          filter: "blur(12px)",
          animation: `orb-swirl ${swirlDuration} linear infinite`,
        }}
      />

      {/* 3D Glass Core with Specular Reflection */}
      <div
        className="absolute rounded-full transition-transform duration-500 ease-out"
        style={{
          inset: "26%",
          background:
            "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95), rgba(220,230,255,0.4) 40%, rgba(139,92,246,0.2) 70%, transparent 100%)",
          opacity: coreOpacity,
          transform: `scale(${coreScale * levelScale})`,
          animation: isThinking ? "orb-contract 1.8s ease-in-out infinite" : undefined,
          boxShadow: isSpeaking
            ? "0 0 70px 12px rgba(34,211,238,0.45), inset 0 0 20px rgba(255,255,255,0.6)"
            : isListening
            ? "0 0 50px 8px rgba(244,63,94,0.35), inset 0 0 15px rgba(255,255,255,0.5)"
            : "0 0 35px 2px rgba(139,92,246,0.25), inset 0 0 12px rgba(255,255,255,0.4)",
        }}
      />
    </div>
  );
}