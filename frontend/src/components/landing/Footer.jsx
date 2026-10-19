import React from "react";
import { Link } from "react-router-dom";

/**
 * Footer — Clean, minimal production footer.
 * Contains brand logo, essential navigation links, and copyright.
 */
export default function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-[#070711] py-8 px-4 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Veya AI"
            className="h-7 w-7 rounded-full object-cover ring-1 ring-white/20"
          />
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-bold text-white tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Veya AI
            </span>
            <span className="text-xs text-slate-400">
              — AI Interview Preparation Platform
            </span>
          </div>
        </div>

        {/* Essential Navigation Links */}
        <nav className="flex items-center gap-5 text-xs text-slate-400" aria-label="Footer Navigation">
          <a href="#hero" className="hover:text-cyan-300 transition-colors">
            Home
          </a>
          <a href="#features" className="hover:text-cyan-300 transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-cyan-300 transition-colors">
            How It Works
          </a>
          <Link to="/interview" className="hover:text-cyan-300 transition-colors">
            Interview Studio
          </Link>
        </nav>

        {/* Copyright */}
        <div className="text-xs text-slate-500">
          © {new Date().getFullYear()} Veya AI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
