import { useEffect, useRef } from "react";
import { Terminal, Sparkles, Mic, MessageSquare, Volume2 } from "lucide-react";

/**
 * ConversationView — Futuristic Teleprompter & HUD Transcript Console.
 * Renders spoken conversation with high-end cyberpunk/SaaS aesthetics,
 * interactive quick prompts for the empty state, and branded message bubbles.
 */
export default function ConversationView({ transcript, onSelectPrompt }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  const starterPrompts = [
    { text: "Start a mock interview for Senior Software Engineer", action: "interview" },
    { text: "Explain system design tradeoffs: SQL vs NoSQL", action: "explain" },
    { text: "How should I structure behavioral answers using STAR?", action: "star" },
  ];

  return (
    <div
      className="relative flex w-full flex-col rounded-3xl transition-all duration-300 overflow-hidden"
      style={{
        background: "rgba(12, 12, 24, 0.7)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        boxShadow: "0 20px 50px -15px rgba(0, 0, 0, 0.7), 0 0 30px rgba(139, 92, 246, 0.12)",
      }}
    >
      {/* Top HUD Console Bar */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-cyan-400" />
          <span className="text-xs font-mono font-semibold tracking-wider text-white/80 uppercase">
            Conversation Transcript
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
          </span>
          <span className="text-[11px] font-mono text-cyan-300">
            {transcript.length > 0 ? `${transcript.length} Messages` : "Ready"}
          </span>
        </div>
      </div>

      {/* Main Transcript Body */}
      <div
        ref={scrollRef}
        className="flex w-full flex-col gap-4 overflow-y-auto p-5 sm:p-6"
        style={{ maxHeight: "40vh", minHeight: 220 }}
      >
        {/* Empty State: High-tech Welcome & Quick-start Prompts */}
        {transcript.length === 0 && (
          <div className="m-auto flex w-full max-w-md flex-col items-center text-center py-4" style={{ animation: "fade-up 0.4s ease-out" }}>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 mb-3 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
              <Sparkles size={18} />
            </div>

            <h3 className="text-sm font-semibold text-white tracking-tight">
              Veya Voice Assistant Ready
            </h3>
            <p className="mt-1 text-xs text-white/50 max-w-xs leading-relaxed">
              Tap the microphone below to speak, or select a sample topic to test the conversation:
            </p>

            {/* Quick Prompts */}
            <div className="mt-4 flex flex-col gap-2 w-full">
              {starterPrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectPrompt?.(p.text)}
                  className="group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-medium text-white/80 border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-cyan-400/40 hover:text-white transition-all cursor-pointer"
                >
                  <span className="truncate pr-2">"{p.text}"</span>
                  <MessageSquare size={13} className="text-white/40 group-hover:text-cyan-300 shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Turns */}
        {transcript.map((line) => {
          const isUser = line.role === "user";

          return (
            <div
              key={line.id}
              className={`flex items-start gap-3.5 ${isUser ? "flex-row-reverse" : ""}`}
              style={{ animation: "fade-up 0.35s ease-out" }}
            >
              {/* Role Avatar */}
              <div className="shrink-0 mt-0.5">
                {isUser ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500/20 to-purple-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold shadow-md">
                    YOU
                  </div>
                ) : (
                  <div className="relative flex items-center justify-center">
                    <div className="absolute -inset-1 rounded-full bg-cyan-400/30 blur-xs" />
                    <img
                      src="/logo.png"
                      alt="Veya AI"
                      className="relative h-8 w-8 rounded-full object-cover ring-1 ring-cyan-400/50"
                    />
                  </div>
                )}
              </div>

              {/* Message Bubble Card */}
              <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[82%]`}>
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-[11px] font-semibold tracking-wide text-white/70">
                    {isUser ? "You" : "Veya AI"}
                  </span>
                  {!isUser && (
                    <span className="rounded bg-cyan-500/10 px-1.5 py-0.2 text-[9px] font-mono text-cyan-300 border border-cyan-500/20">
                      AI Coach
                    </span>
                  )}
                </div>

                <div
                  className={`rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-lg ${
                    isUser
                      ? "rounded-tr-xs bg-gradient-to-r from-amber-950/40 to-purple-950/40 border border-amber-500/30 text-amber-100"
                      : "rounded-tl-xs bg-white/[0.05] border border-white/10 text-white"
                  }`}
                  style={{
                    backdropFilter: "blur(12px)",
                  }}
                >
                  {line.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
