import React from "react";

/**
 * BackgroundFX — Restrained, production-ready ambient dark background.
 * Provides subtle navy depth with faint cyan and violet gradients.
 * Respects prefers-reduced-motion and avoids distracting moving particles.
 */
export default function BackgroundFX() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Base deep navy background */}
      <div className="absolute inset-0 bg-[#070711]" />

      {/* Subtle background grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255, 255, 255, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.2) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Subtle top ambient cyan glow */}
      <div
        className="absolute -top-[10%] left-[25%] h-[450px] w-[500px] rounded-full opacity-15 blur-[120px]"
        style={{
          background: "radial-gradient(circle, #22D3EE 0%, #3B82F6 60%, transparent 80%)",
        }}
      />

      {/* Subtle right ambient violet glow */}
      <div
        className="absolute top-[30%] right-[10%] h-[450px] w-[450px] rounded-full opacity-15 blur-[130px]"
        style={{
          background: "radial-gradient(circle, #8B5CF6 0%, transparent 75%)",
        }}
      />
    </div>
  );
}
