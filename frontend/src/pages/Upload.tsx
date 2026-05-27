import { useState } from "react";
import { uploadDataset } from "../lib/api";
import type { DatasetResponse } from "../types";
import { NavBar } from "../components/NavBar";

interface Props {
  dataset: DatasetResponse | null;
  onUploaded: (d: DatasetResponse) => void;
  onGenerateBriefing: () => void;
  briefingLoading: boolean;
  briefingError: string | null;
  onLogout: () => void;
}

export default function Upload({
  dataset,
  onUploaded,
  onGenerateBriefing,
  briefingLoading,
  briefingError,
  onLogout,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !description.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await uploadDataset(file, description.trim());
      onUploaded(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar onLogout={onLogout} />

      <div className="max-w-2xl mx-auto px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-slate-900">OpsAI</h1>
          <p className="text-slate-600 mt-1">
            Upload a CSV and describe your organization in one sentence.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 bg-white border border-slate-200 rounded-lg p-6 shadow-sm"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              CSV file
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              One-sentence description of your organization
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Small NGO tracking individual donations across campaigns."
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              rows={2}
              required
            />
          </div>

          <button
            type="submit"
            disabled={!file || !description.trim() || submitting}
            className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            {submitting ? "Uploading…" : "Upload"}
          </button>

          {error && <p className="text-sm text-red-600 mt-2">Error: {error}</p>}
        </form>

        {dataset && (
          <>
            <SchemaCard result={dataset} />
            <ProfileCard
              result={dataset}
              onGenerateBriefing={onGenerateBriefing}
              briefingLoading={briefingLoading}
              briefingError={briefingError}
            />
          </>
        )}
      </div>
    </div>
  );
}

function SchemaCard({ result }: { result: DatasetResponse }) {
  return (
    <section className="mt-8 bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-900">Schema</h2>
        <span className="text-sm text-slate-500">
          {result.schema.row_count.toLocaleString()} rows · dataset {result.dataset_id.slice(0, 8)}…
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-600">
              <th className="py-2 pr-4 font-medium">Column</th>
              <th className="py-2 pr-4 font-medium">Type</th>
              <th className="py-2 pr-4 font-medium">Null %</th>
              <th className="py-2 font-medium">Sample values</th>
            </tr>
          </thead>
          <tbody>
            {result.schema.columns.map((col) => (
              <tr
                key={col.name}
                className="border-b border-slate-100 last:border-0 align-top"
              >
                <td className="py-2 pr-4 font-mono text-slate-900">{col.name}</td>
                <td className="py-2 pr-4 font-mono text-slate-700">{col.dtype}</td>
                <td className="py-2 pr-4 text-slate-700">{col.null_pct.toFixed(1)}</td>
                <td className="py-2 text-slate-700">
                  <span className="font-mono text-xs text-slate-600">
                    {col.sample_values.slice(0, 3).join(", ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface ProfileCardProps {
  result: DatasetResponse;
  onGenerateBriefing: () => void;
  briefingLoading: boolean;
  briefingError: string | null;
}

function ProfileCard({
  result,
  onGenerateBriefing,
  briefingLoading,
  briefingError,
}: ProfileCardProps) {
  if (result.profile_error) {
    return (
      <section className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
        <h2 className="font-semibold mb-1">Profile generation skipped</h2>
        <p className="font-mono text-xs break-all">{result.profile_error}</p>
        <p className="mt-2 text-amber-800">
          The dataset is saved; you can retry profile generation by re-uploading once the LLM key is configured.
        </p>
      </section>
    );
  }
  const p = result.profile;
  if (!p) return null;
  return (
    <section className="mt-8 bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-900">Domain profile</h2>
        <span className="text-sm text-slate-500">{p.domain}</span>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <Field label="Entity grain" value={p.entity_grain} />
        <Field label="Expected seasonality" value={p.expected_seasonality} />
        <Field label="Date column" value={p.key_columns.date ?? "—"} mono />
        <Field label="Amount column" value={p.key_columns.amount ?? "—"} mono />
        <Field label="Actor column" value={p.key_columns.actor ?? "—"} mono />
        <Field label="Category column" value={p.key_columns.category ?? "—"} mono />
      </dl>
      <div className="mt-5">
        <h3 className="text-sm font-medium text-slate-700 mb-2">Metrics of interest</h3>
        <ul className="space-y-1 text-sm text-slate-700">
          {p.metrics_of_interest.map((m) => (
            <li key={m.name}>
              <span className="font-mono text-slate-900">{m.name}</span>
              <span className="text-slate-500"> — {m.definition}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-5">
        <h3 className="text-sm font-medium text-slate-700 mb-2">Anomaly hints</h3>
        <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
          {p.anomaly_hints.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      </div>
      {Object.keys(p.glossary).length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-medium text-slate-700 mb-2">Glossary</h3>
          <dl className="text-sm space-y-1">
            {Object.entries(p.glossary).map(([k, v]) => (
              <div key={k}>
                <dt className="inline font-mono text-slate-900">{k}</dt>
                <dd className="inline text-slate-600"> — {v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3">
        <button
          onClick={onGenerateBriefing}
          disabled={briefingLoading}
          className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed"
        >
          {briefingLoading ? "Generating briefing… (up to ~60s)" : "Generate briefing"}
        </button>
        {briefingError && (
          <p className="text-sm text-red-600">Error: {briefingError}</p>
        )}
      </div>
    </section>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-slate-900 ${mono ? "font-mono text-sm" : ""}`}>{value}</dd>
    </div>
  );
}
