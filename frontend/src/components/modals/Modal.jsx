import { X } from "lucide-react";

/**
 * Shared modal shell: dim backdrop, centered glass card, optional close
 * button. Every popup in the app (resume upload, interview setup, report)
 * renders through this so they all look and behave consistently.
 */
export default function Modal({ open, onClose, children, maxWidth = "max-w-md", closable = true }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      style={{ animation: "fade-up 0.25s ease-out" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "rgba(5,5,8,0.72)", backdropFilter: "blur(4px)" }}
        onClick={closable ? onClose : undefined}
      />

      <div
        className={`glass relative w-full ${maxWidth} max-h-[88vh] overflow-y-auto rounded-3xl p-6 sm:p-7`}
        style={{
          background: "rgba(14,14,20,0.92)",
          boxShadow: "0 24px 80px -20px rgba(0,0,0,0.6)",
          animation: "fade-up 0.3s ease-out",
        }}
        role="dialog"
        aria-modal="true"
      >
        {closable && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-low)] transition-colors hover:bg-white/5 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
