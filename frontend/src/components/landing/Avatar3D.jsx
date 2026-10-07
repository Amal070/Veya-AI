import React, { useState, useEffect, useRef } from "react";

/**
 * Avatar3D — The futuristic 3D-style Veya AI Mascot centerpiece.
 * Features:
 *  - 3D parallax tilt responsive to mouse movement
 *  - Dual counter-rotating futuristic orbital rings with glowing satellite nodes
 *  - Multi-tier ambient cyan/purple glow
 *  - Integrated animated voice waveform
 *  - Smooth hover scale and lighting reactions
 */
export default function Avatar3D({ isVoiceActive = false, onInteract }) {
  const containerRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Distance from center (-1 to 1)
      const deltaX = (e.clientX - centerX) / (window.innerWidth / 2);
      const deltaY = (e.clientY - centerY) / (window.innerHeight / 2);

      // Subtle rotation values (max 8 degrees)
      const rotateY = Math.max(-8, Math.min(8, deltaX * 8));
      const rotateX = Math.max(-6, Math.min(6, -deltaY * 6));

      setTilt({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => {
      setTilt({ x: 0, y: 0 });
      setIsHovered(false);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Equalizer bar heights
  const bars = [14, 26, 42, 18, 32, 48, 28, 38, 20, 34, 16];

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onInteract}
      className="relative flex flex-col items-center justify-center cursor-pointer select-none"
      style={{
        perspective: "1000px",
      }}
    >
      {/* Outer 3D Tilt Wrapper */}
      <div
        className="relative flex items-center justify-center transition-transform duration-300 ease-out"
        style={{
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${
            isHovered ? 1.04 : 1
          })`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Ambient Halo Glow Layers behind Avatar */}
        <div
          className="absolute -inset-10 rounded-full blur-[80px] opacity-70 transition-opacity duration-500"
          style={{
            background:
              "radial-gradient(circle, rgba(139, 92, 246, 0.6) 0%, rgba(34, 211, 238, 0.45) 50%, transparent 75%)",
            animation: "pulse-ambient 6s ease-in-out infinite",
          }}
        />

        <div
          className="absolute -inset-16 rounded-full blur-[100px] opacity-30"
          style={{
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.7) 0%, transparent 70%)",
          }}
        />

        {/* 3D Orbital Ring 1 (Tilted forward, counter-clockwise) */}
        <div
          className="pointer-events-none absolute -inset-12 sm:-inset-16 rounded-full border border-cyan-400/25 transition-opacity duration-700"
          style={{
            transform: "rotateX(72deg) rotateZ(0deg)",
            boxShadow: "0 0 20px rgba(34, 211, 238, 0.2)",
            animation: "spin-orbit 18s linear infinite",
          }}
        >
          {/* Satellite Node on Orbital Ring 1 */}
          <span
            className="absolute top-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_12px_#22d3ee]"
          />
        </div>

        {/* 3D Orbital Ring 2 (Tilted in reverse, clockwise) */}
        <div
          className="pointer-events-none absolute -inset-8 sm:-inset-10 rounded-full border border-purple-500/25 transition-opacity duration-700"
          style={{
            transform: "rotateX(68deg) rotateY(25deg) rotateZ(0deg)",
            boxShadow: "0 0 25px rgba(139, 92, 246, 0.2)",
            animation: "spin-orbit-reverse 22s linear infinite",
          }}
        >
          {/* Satellite Node on Orbital Ring 2 */}
          <span
            className="absolute bottom-0 right-1/4 h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_12px_#a855f7]"
          />
        </div>

        {/* Floating AI Robot Mascot Image with 3D Depth */}
        <div
          className="relative z-10 flex items-center justify-center"
          style={{
            animation: "float-3d 6s ease-in-out infinite",
          }}
        >
          <div className="relative rounded-full p-1.5 transition-shadow duration-500"
            style={{
              background: "linear-gradient(135deg, rgba(34, 211, 238, 0.4), rgba(139, 92, 246, 0.4), rgba(59, 130, 246, 0.2))",
              boxShadow: isHovered
                ? "0 24px 60px -12px rgba(139, 92, 246, 0.6), 0 0 45px rgba(34, 211, 238, 0.5)"
                : "0 20px 50px -10px rgba(139, 92, 246, 0.45), 0 0 30px rgba(34, 211, 238, 0.3)",
            }}
          >
            <img
              src="/logo.png"
              alt="Veya AI Robot Mascot"
              className="h-44 w-44 sm:h-52 sm:w-52 rounded-full object-cover ring-2 ring-white/20 select-none pointer-events-none"
              draggable="false"
            />
          </div>
        </div>
      </div>

      {/* Futuristic Floating Voice Waveform Beneath Avatar */}
      <div
        className="relative z-20 mt-6 flex flex-col items-center gap-2.5 transition-all duration-300"
        style={{
          transform: isHovered ? "translateY(-2px)" : "translateY(0)",
        }}
      >
        <div className="flex items-center gap-1.5 rounded-full px-4 py-2 border border-white/10 bg-[#0B0B16]/80 backdrop-blur-xl shadow-lg shadow-purple-900/20">
          <div className="flex items-center gap-1 h-6 px-1">
            {bars.map((h, i) => {
              const activeHeight = isVoiceActive ? Math.min(28, h * 1.3) : Math.max(6, h * 0.55);
              return (
                <span
                  key={i}
                  className="w-1 rounded-full transition-all duration-300"
                  style={{
                    height: `${activeHeight}px`,
                    background:
                      i % 2 === 0
                        ? "linear-gradient(to top, #8B5CF6, #22D3EE)"
                        : "linear-gradient(to top, #22D3EE, #8B5CF6)",
                    boxShadow: "0 0 8px rgba(34, 211, 238, 0.4)",
                    animation: isVoiceActive
                      ? `wave-bounce 0.8s ease-in-out infinite alternate ${i * 0.08}s`
                      : `wave-bounce 2.2s ease-in-out infinite alternate ${i * 0.15}s`,
                  }}
                />
              );
            })}
          </div>

          <div className="ml-2 flex items-center gap-1.5 border-l border-white/10 pl-3">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
            </span>
            <span className="text-[11px] font-medium tracking-wider text-cyan-300 uppercase">
              {isVoiceActive ? "Voice Active" : "Voice Assistant Ready"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
