import { useEffect, useRef, useState } from "react";
import { sendChat } from "../lib/api";
import type { ChatMessage, ChatTraceEntry } from "../types";

interface Props {
  datasetId: string;
}

export function ChatPanel({ datasetId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    setError(null);
    try {
      const res = await sendChat(datasetId, text, messages);
      setMessages([
        ...next,
        { role: "assistant", content: res.answer, trace: res.trace },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mt-10 bg-white border border-slate-200 rounded-lg shadow-sm">
      <header className="px-5 py-3 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Ask the data</h2>
        <p className="text-xs text-slate-500">
          Answers are grounded in tool calls against your dataset. Tool trace visible per response.
        </p>
      </header>

      <div ref={scrollRef} className="px-5 py-4 max-h-[28rem] overflow-y-auto space-y-4">
        {messages.length === 0 && (
          <div className="text-sm text-slate-500">
            <p className="mb-2">Try one of these to start:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>What was my best month, and by how much?</li>
              <li>Which category drives the most revenue?</li>
              <li>Are there any weeks that look like data-quality issues?</li>
            </ul>
          </div>
        )}
        {messages.map((m, i) => (
          <Message key={i} message={m} />
        ))}
        {sending && (
          <div className="text-sm text-slate-500 italic">Thinking… (calling tools)</div>
        )}
        {error && (
          <div className="text-sm text-red-600">Error: {error}</div>
        )}
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 px-5 py-3 border-t border-slate-200">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this dataset…"
          disabled={sending}
          className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </section>
  );
}

function Message({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-900"
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
        {!isUser && message.trace && message.trace.length > 0 && (
          <TraceDetails trace={message.trace} />
        )}
      </div>
    </div>
  );
}

function TraceDetails({ trace }: { trace: ChatTraceEntry[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 border-t border-slate-200 pt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-slate-500 hover:text-slate-900"
      >
        {open ? "▾" : "▸"} {trace.length} tool call{trace.length === 1 ? "" : "s"}
      </button>
      {open && (
        <ol className="mt-2 space-y-1 text-xs font-mono text-slate-700">
          {trace.map((t, i) => (
            <li key={i} className="break-all">
              <span className="text-slate-500">{i + 1}.</span>{" "}
              <span className="font-semibold">{t.tool}</span>
              <span className="text-slate-400">{JSON.stringify(t.input)}</span>
              {t.error && (
                <span className="text-red-600"> → error: {t.error}</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
