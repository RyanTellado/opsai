import { useState } from "react";
import { loginUser, signupUser } from "../lib/api";
import { setToken, setUser } from "../lib/auth";

interface Props {
  onLogin: () => void;
}

export default function Login({ onLogin }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res =
        mode === "signup"
          ? await signupUser(name.trim(), email.trim(), password)
          : await loginUser(email.trim(), password);
      setToken(res.token);
      setUser({ name: res.name, email: res.email });
      onLogin();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // surface the detail message if the backend returned JSON
      try {
        const parsed = JSON.parse(msg.replace(/^\d+:\s*/, ""));
        setError(parsed.detail ?? msg);
      } catch {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">OpsAI</h1>
          <p className="text-slate-500 mt-1 text-sm">AI operations analyst for small organizations</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">
            {mode === "login" ? "Sign in to your account" : "Create an account"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  required
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 8 characters" : ""}
                required
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-slate-900 text-white text-sm font-medium py-2.5 rounded-md hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {submitting
                ? mode === "login"
                  ? "Signing in…"
                  : "Creating account…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => { setMode("signup"); setError(null); }}
                  className="font-medium text-slate-900 hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => { setMode("login"); setError(null); }}
                  className="font-medium text-slate-900 hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
