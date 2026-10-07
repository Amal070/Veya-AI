import React from "react";
import { Mic, Sparkles, Heart } from "lucide-react";

/**
 * Footer — Clean, minimal tech footer with Veya AI branding.
 */
export default function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-[#070711] py-12 px-6">
      <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-6">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Veya AI"
            className="h-8 w-8 rounded-full object-cover ring-1 ring-white/20"
          />
          <div className="flex flex-col">
            <span
              className="text-base font-bold text-white tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Veya AI
            </span>
            <span className="text-[11px] text-white/50">
              Next-Gen Voice Assistant & Interview Coach
            </span>
          </div>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6 text-xs text-white/60">
          <a href="#hero" className="hover:text-cyan-300 transition-colors">
            Home
          </a>
          <a href="#features" className="hover:text-cyan-300 transition-colors">
            Features
          </a>
          <a href="#experience" className="hover:text-cyan-300 transition-colors">
            Experience
          </a>
          <a href="/interview" className="hover:text-cyan-300 transition-colors">
            Interview Studio
          </a>
        </div>

        {/* Copyright */}
        <div className="text-xs text-white/40">
          © {new Date().getFullYear()} Veya AI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
