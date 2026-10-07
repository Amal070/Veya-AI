import React, { useState, useEffect } from "react";
import { Mic, ArrowRight, Menu, X, Sparkles } from "lucide-react";

/**
 * Navbar — Minimal premium glassmorphic navigation bar.
 * Becomes more opaque and elevated on scroll.
 */
export default function Navbar({ onStartInterview, onTalkToVeya }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Home", href: "#hero" },
    { label: "Features", href: "#features" },
    { label: "Experience", href: "#experience" },
    { label: "Interview Studio", href: "/interview" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#070711]/85 backdrop-blur-xl border-b border-white/10 py-3 shadow-2xl shadow-black/50"
          : "bg-transparent backdrop-blur-[2px] border-b border-transparent py-5"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
        {/* Left: Brand Identity */}
        <a
          href="#hero"
          className="group flex items-center gap-3 transition-transform duration-300 hover:scale-[1.02]"
        >
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-600 to-cyan-400 opacity-60 blur-sm group-hover:opacity-90 transition-opacity" />
            <img
              src="/logo.png"
              alt="Veya AI"
              className="relative h-9 w-9 rounded-full object-cover ring-1 ring-white/20"
            />
          </div>
          <div className="flex flex-col">
            <span
              className="text-lg font-bold tracking-tight text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Veya AI
            </span>
          </div>
        </a>

        {/* Center: Nav Anchors (Desktop) */}
        <nav className="hidden md:flex items-center gap-8 rounded-full px-6 py-2 border border-white/5 bg-white/[0.02] backdrop-blur-md">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-white/70 transition-colors duration-200 hover:text-cyan-300"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right: Action Buttons (Desktop) */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={onTalkToVeya}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium text-white/80 border border-white/10 hover:border-cyan-400/40 hover:text-white transition-all duration-200 hover:bg-white/[0.04]"
          >
            <Mic size={13} className="text-cyan-400" />
            Talk to Veya
          </button>

          <button
            onClick={onStartInterview}
            className="group relative inline-flex items-center justify-center overflow-hidden rounded-full px-5 py-2 text-xs font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #22D3EE 100%)",
              boxShadow: "0 4px 20px -4px rgba(139, 92, 246, 0.5)",
            }}
          >
            {/* Animated shine beam */}
            <span
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent group-hover:animate-[shine-sweep_1s_ease-in-out]"
            />
            <span className="relative flex items-center gap-1.5">
              Start Interview
              <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden flex items-center justify-center p-2 rounded-lg text-white/80 hover:text-white border border-white/10"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/10 bg-[#070711]/95 px-6 py-5 backdrop-blur-2xl">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-white/80 hover:text-cyan-300 transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="flex flex-col gap-2.5 pt-4 border-t border-white/10">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onTalkToVeya();
                }}
                className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white/90 border border-white/10"
              >
                <Mic size={14} className="text-cyan-400" />
                Talk to Veya
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onStartInterview();
                }}
                className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, #8B5CF6, #22D3EE)",
                }}
              >
                Start Interview
                <ArrowRight size={14} />
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
