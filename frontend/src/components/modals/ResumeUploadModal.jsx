import { useRef, useState } from "react";
import { Upload, FileText, X, Loader2, Sparkles } from "lucide-react";
import Modal from "./Modal";

/**
 * Step 1 of interview setup: resume upload.
 * Shown the moment the user expresses interview intent ("take my
 * interview", "start interview", "mock interview").
 */
export default function ResumeUploadModal({ open, onClose, onUploaded, uploadResume }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleFiles = (files) => {
    const selected = files?.[0];
    if (!selected) return;

    const ext = selected.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx", "txt"].includes(ext)) {
      setError("Supported resume formats: PDF, DOCX, TXT.");
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setError("File is too large. Max size is 5MB.");
      return;
    }

    setFile(selected);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Choose a resume file first.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const data = await uploadResume(file);
      setFile(null);
      onUploaded?.(data);
    } catch (err) {
      console.error("Resume upload failed:", err);
      setError(err?.response?.data?.detail || "That upload didn't go through. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    onClose?.();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(34,211,238,0.25))" }}
          >
            <Sparkles size={18} className="text-cyan-300" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-hi)]">Upload your resume</h2>
            <p className="text-xs text-[var(--color-text-low)]">
              We'll tailor your interview questions to your background.
            </p>
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-10 text-center transition-colors duration-300"
          style={{
            borderColor: dragging ? "rgba(34,211,238,0.5)" : "var(--color-border-glass)",
            background: dragging ? "rgba(34,211,238,0.06)" : "var(--color-surface)",
          }}
        >
          {file ? (
            <>
              <FileText size={28} style={{ color: "var(--color-cyan)" }} />
              <p className="max-w-full truncate text-sm" style={{ color: "var(--color-text-hi)" }}>
                {file.name}
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="flex items-center gap-1 text-xs transition-colors hover:text-white"
                style={{ color: "var(--color-text-low)" }}
              >
                <X size={12} /> Remove
              </button>
            </>
          ) : (
            <>
              <Upload size={28} style={{ color: "var(--color-text-low)" }} />
              <p className="text-sm" style={{ color: "var(--color-text-mid)" }}>
                Drop your resume here, or click to browse
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-low)" }}>
                PDF, DOCX, TXT up to 5MB
              </p>
            </>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {error && <p className="text-center text-sm text-rose-300">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting || !file}
          className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #8B5CF6, #22D3EE)" }}
        >
          {submitting && <Loader2 className="animate-spin" size={16} />}
          {submitting ? "Uploading…" : "Continue"}
        </button>
      </div>
    </Modal>
  );
}
