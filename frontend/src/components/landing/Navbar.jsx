import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Mic, ArrowRight, Menu, X } from "lucide-react";

/**
 * Navbar — Compact, responsive, accessible production navigation bar.
 * Connects directly to existing routes and modal triggers.
 */
export default function Navbar({ onStartInterview, onTalkToVeya }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Home", href: "#hero" },
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Interview Studio", href: "/interview", isRoute: true },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        isScrolled
          ? "bg-[#070711]/90 backdrop-blur-xl border-b border-white/10 py-3 shadow-lg shadow-black/40"
          : "bg-[#070711]/40 backdrop-blur-md border-b border-white/5 py-4"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand Identity */}
        <a
          href="#hero"
          className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg p-1"
        >
          <div className="relative flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Veya AI logo"
              className="h-8 w-8 rounded-full object-cover ring-1 ring-white/20 group-hover:ring-cyan-400/50 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-base font-bold tracking-tight text-white group-hover:text-cyan-200 transition-colors"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Veya AI
            </span>
            <span className="hidden sm:inline-block rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300 border border-cyan-500/20">
              SaaS Coach
            </span>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav
          className="hidden md:flex items-center gap-1 rounded-full px-4 py-1.5 border border-white/10 bg-white/[0.03] backdrop-blur-md"
          aria-label="Main Navigation"
        >
          {navLinks.map((link) =>
            link.isRoute ? (
              <Link
                key={link.label}
                to={link.href}
                className="px-3.5 py-1.5 text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.06] rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="px-3.5 py-1.5 text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.06] rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                {link.label}
              </a>
            )
          )}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <button
            type="button"
            onClick={onTalkToVeya}
            className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-white/80 border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] hover:text-white hover:border-cyan-400/40 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Mic size={13} className="text-cyan-400" />
            <span>Talk to Veya</span>
          </button>

          <button
            type="button"
            onClick={onStartInterview}
            className="group relative inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:opacity-95 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            style={{
              background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 60%, #06B6D4 100%)",
              boxShadow: "0 2px 14px -2px rgba(37, 99, 235, 0.4)",
            }}
          >
            <span className="flex items-center gap-1.5">
              <span>Start Interview</span>
              <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden flex items-center justify-center p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 border border-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/10 bg-[#070711]/95 px-5 py-5 backdrop-blur-2xl">
          <nav className="flex flex-col gap-2" aria-label="Mobile Navigation">
            {navLinks.map((link) =>
              link.isRoute ? (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  {link.label}
                </a>
              )
            )}
            <div className="flex flex-col gap-2.5 pt-4 mt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onTalkToVeya();
                }}
                className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium text-white/90 border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <Mic size={14} className="text-cyan-400" />
                <span>Talk to Veya</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onStartInterview();
                }}
                className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-white shadow-md transition-opacity hover:opacity-95 cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #2563EB, #7C3AED)",
                }}
              >
                <span>Start Interview</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
