import React, { useMemo } from "react";

/**
 * BackgroundFX — Cinematic layered background with ambient glows,
 * floating light blobs, and subtle drifting particles.
 * Designed to be GPU-friendly and respect prefers-reduced-motion.
 */
export default function BackgroundFX() {
  // Pre-generate static positions for 18 subtle glowing particles
  const particles = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      x: (i * 17 + 7) % 96,
      y: (i * 23 + 13) % 92,
      size: (i % 3) + 2,
      delay: (i * 0.7) % 6,
      duration: 6 + ((i * 1.3) % 5),
      color: i % 3 === 0 ? "rgba(34, 211, 238, 0.45)" : i % 3 === 1 ? "rgba(139, 92, 246, 0.45)" : "rgba(59, 130, 246, 0.35)",
    }));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Deep space base background */}
      <div className="absolute inset-0 bg-[#070711]" />

      {/* Subtle perspective grid */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255, 255, 255, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.15) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black 20%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black 20%, transparent 80%)",
        }}
      />

      {/* Primary Cyan/Blue ambient light blob */}
      <div
        className="absolute -top-[15%] left-[20%] h-[550px] w-[550px] rounded-full opacity-20 blur-[130px]"
        style={{
          background: "radial-gradient(circle, #22D3EE 0%, #3B82F6 60%, transparent 80%)",
          animation: "blob-drift-1 20s ease-in-out infinite",
        }}
      />

      {/* Primary Purple ambient light blob */}
      <div
        className="absolute top-[25%] right-[10%] h-[600px] w-[600px] rounded-full opacity-25 blur-[140px]"
        style={{
          background: "radial-gradient(circle, #8B5CF6 0%, #6366F1 60%, transparent 80%)",
          animation: "blob-drift-2 24s ease-in-out infinite",
        }}
      />

      {/* Lower Electric Blue glow */}
      <div
        className="absolute bottom-[5%] left-[30%] h-[500px] w-[500px] rounded-full opacity-15 blur-[150px]"
        style={{
          background: "radial-gradient(circle, #3B82F6 0%, #8B5CF6 70%, transparent 80%)",
        }}
      />

      {/* Subtle floating particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            boxShadow: `0 0 10px ${p.color}`,
            animation: `float-3d ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
            opacity: 0.6,
          }}
        />
      ))}
    </div>
  );
}
