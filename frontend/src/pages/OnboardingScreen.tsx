import { useEffect, useRef, useState } from "react";

interface Props {
  onSave: (name: string, industry: string, description: string) => Promise<void>;
}

const STEPS = [
  {
    heading: "What's your business called?",
    sub: "This is how it'll appear on your dashboard.",
    placeholder: "e.g., Sunrise Café",
    field: "name" as const,
    type: "input",
  },
  {
    heading: "What type of business is it?",
    sub: "A few words is enough — we'll tailor your insights to match.",
    placeholder: "e.g., Coffee shop, Non-profit, Retail store",
    field: "industry" as const,
    type: "input",
  },
  {
    heading: "Describe what you do.",
    sub: "One or two sentences about what you track and who you serve.",
    placeholder: "A small café in San Francisco tracking daily sales across menu categories and staff.",
    field: "description" as const,
    type: "textarea",
  },
];

type Fields = { name: string; industry: string; description: string };

export default function OnboardingScreen({ onSave }: Props) {
  const [step, setStep] = useState(0);
  const [fields, setFields] = useState<Fields>({ name: "", industry: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    // slight delay so animation starts before focus
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [step]);

  const current = STEPS[step];
  const value = fields[current.field];
  const isLast = step === STEPS.length - 1;

  function advance() {
    if (!value.trim()) return;
    if (isLast) {
      handleSubmit();
    } else {
      setStep((s) => s + 1);
      setAnimKey((k) => k + 1);
    }
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      await onSave(fields.name.trim(), fields.industry.trim(), fields.description.trim());
    } finally {
      setSaving(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      advance();
    }
  }

  const inputClass =
    "w-full bg-transparent border-0 border-b-2 border-slate-300 focus:border-slate-900 " +
    "outline-none text-2xl text-slate-900 placeholder-slate-300 py-3 resize-none " +
    "transition-colors duration-200";

  return (
    <div className="flex items-center justify-center min-h-full px-6 py-16">
      <div className="w-full max-w-lg">
        {/* Step dots */}
        <div className="flex items-center gap-2 mb-12">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-6 bg-slate-900"
                  : i < step
                  ? "w-3 bg-slate-400"
                  : "w-3 bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Step content — re-keyed to trigger animation */}
        <div key={animKey} className="animate-fade-up">
          <h1 className="text-4xl font-semibold text-slate-900 leading-tight mb-2">
            {current.heading}
          </h1>
          <p className="text-slate-500 mb-10">{current.sub}</p>

          {current.type === "textarea" ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={value}
              onChange={(e) => setFields((f) => ({ ...f, [current.field]: e.target.value }))}
              onKeyDown={handleKey}
              placeholder={current.placeholder}
              rows={3}
              className={inputClass + " leading-relaxed"}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={value}
              onChange={(e) => setFields((f) => ({ ...f, [current.field]: e.target.value }))}
              onKeyDown={handleKey}
              placeholder={current.placeholder}
              className={inputClass}
            />
          )}

          <div className="flex items-center gap-4 mt-10">
            <button
              onClick={advance}
              disabled={!value.trim() || saving}
              className="px-6 py-3 bg-slate-900 text-white text-sm font-medium rounded-xl
                         hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed
                         transition-colors duration-150"
            >
              {saving ? "Saving…" : isLast ? "Get started →" : "Continue →"}
            </button>
            {!saving && (
              <span className="text-xs text-slate-400">
                {isLast ? "or press ⌘↵" : "or press ↵ Enter"}
              </span>
            )}
          </div>
        </div>

        {/* Back link */}
        {step > 0 && !saving && (
          <button
            onClick={() => { setStep((s) => s - 1); setAnimKey((k) => k + 1); }}
            className="mt-8 text-sm text-slate-400 hover:text-slate-700 transition-colors"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
