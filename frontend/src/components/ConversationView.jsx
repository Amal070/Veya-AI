import { useEffect, useRef } from "react";
import { MessageSquare, Mic, Sparkles } from "lucide-react";

/**
 * ConversationView — Professional Interview Transcript & HUD Console.
 * Makes the conversation the centerpiece of the interview:
 * - Distinct styling for AI Interviewer vs Candidate responses
 * - Clear readability with high-contrast typography and proper line-height
 * - Auto-scrolling to keep the latest message visible
 * - Subtle response placeholder while candidate is expected to answer
 */
export default function ConversationView({ transcript = [], onSelectPrompt }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [transcript]);

  const starterPrompts = [
    { text: "Start a mock interview for Senior Software Engineer", action: "interview" },
    { text: "Explain system design tradeoffs: SQL vs NoSQL", action: "explain" },
    { text: "How should I structure behavioral answers using STAR?", action: "star" },
  ];

  // Determine if the last turn was the assistant question, meaning candidate response is pending
  const isAwaitingCandidateResponse =
    transcript.length > 0 && transcript[transcript.length - 1]?.role === "assistant";

  return (
    <section
      aria-label="Conversation Transcript"
      className="relative flex w-full flex-col rounded-2xl transition-all duration-300 overflow-hidden"
      style={{
        background: "rgba(11, 11, 22, 0.75)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 16px 40px -10px rgba(0, 0, 0, 0.5), 0 0 20px rgba(139, 92, 246, 0.08)",
      }}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 sm:px-5 py-3 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-cyan-400" />
          <h2 className="text-xs font-semibold tracking-wider text-white/90 uppercase font-mono">
            Conversation Transcript
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
          </span>
          <span className="text-[11px] font-mono text-cyan-300 font-medium">
            {transcript.length > 0
              ? `${transcript.length} ${transcript.length === 1 ? "Message" : "Messages"}`
              : "Ready"}
          </span>
        </div>
      </div>

      {/* Main Transcript Body */}
      <div
        ref={scrollRef}
        tabIndex={0}
        aria-live="polite"
        className="flex w-full flex-col gap-3.5 overflow-y-auto p-4 sm:p-5 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/50"
        style={{
          maxHeight: "360px",
          minHeight: "220px",
        }}
      >
        {/* Empty State: Quick-start Prompts if available */}
        {transcript.length === 0 && (
          <div
            className="m-auto flex w-full max-w-md flex-col items-center text-center py-5"
            style={{ animation: "fade-up 0.3s ease-out" }}
          >
            <div className="relative flex items-center justify-center mb-3">
              <img
                src="/logo.png"
                alt="Veya AI"
                className="h-10 w-10 rounded-full object-cover ring-1 ring-cyan-400/40 shadow-md"
              />
            </div>

            <h3 className="text-sm font-semibold text-white tracking-tight">
              Interview Session Initialized
            </h3>
            <p className="mt-1 text-xs text-white/50 max-w-xs leading-relaxed">
              Your questions and spoken responses will be transcribed here in real time.
            </p>

            {onSelectPrompt && (
              <div className="mt-4 flex flex-col gap-2 w-full">
                {starterPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectPrompt(p.text)}
                    className="group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-medium text-white/80 border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-cyan-400/40 hover:text-white transition-all cursor-pointer"
                  >
                    <span className="truncate pr-2">"{p.text}"</span>
                    <Sparkles
                      size={13}
                      className="text-white/40 group-hover:text-cyan-300 shrink-0 transition-colors"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Message Turns */}
        {transcript.map((line) => {
          const isUser = line.role === "user";

          return (
            <article
              key={line.id}
              className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
              style={{ animation: "fade-up 0.25s ease-out" }}
            >
              {/* Role Avatar */}
              <div className="shrink-0 mt-0.5">
                {isUser ? (
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/20 border border-blue-400/30 text-cyan-300 text-[10px] font-bold shadow-sm"
                    aria-label="Candidate avatar"
                  >
                    YOU
                  </div>
                ) : (
                  <div className="relative flex items-center justify-center">
                    <img
                      src="/logo.png"
                      alt="Veya AI Interviewer"
                      className="h-7 w-7 rounded-full object-cover ring-1 ring-cyan-400/40 shadow-sm"
                    />
                  </div>
                )}
              </div>

              {/* Message Bubble Card */}
              <div
                className={`flex flex-col ${
                  isUser ? "items-end" : "items-start"
                } max-w-[88%] sm:max-w-[84%]`}
              >
                {/* Role Header */}
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-[11px] font-semibold tracking-wide text-white/80">
                    {isUser ? "You" : "Veya AI"}
                  </span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[9px] font-mono border ${
                      isUser
                        ? "bg-blue-500/10 text-cyan-300 border-blue-500/20"
                        : "bg-purple-500/10 text-purple-300 border-purple-500/20"
                    }`}
                  >
                    {isUser ? "Candidate" : "Interviewer"}
                  </span>
                </div>

                {/* Bubble Text */}
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md select-text break-words whitespace-pre-wrap ${
                    isUser
                      ? "rounded-tr-xs bg-gradient-to-r from-blue-950/40 to-cyan-950/40 border border-cyan-500/25 text-cyan-50"
                      : "rounded-tl-xs bg-white/[0.04] border border-white/10 text-white/95"
                  }`}
                >
                  {line.text}
                </div>
              </div>
            </article>
          );
        })}

        {/* Subtle Response Placeholder when awaiting candidate answer */}
        {isAwaitingCandidateResponse && (
          <div
            className="flex items-center gap-2.5 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-xs text-white/40 ml-10 max-w-sm"
            style={{ animation: "fade-up 0.3s ease-out" }}
          >
            <Mic size={13} className="text-cyan-400/60 shrink-0" />
            <span className="italic">Your spoken response will appear here...</span>
          </div>
        )}
      </div>
    </section>
  );
}

