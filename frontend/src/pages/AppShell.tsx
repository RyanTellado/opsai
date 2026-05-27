import { useEffect, useState } from "react";
import { NavBar } from "../components/NavBar";
import { BusinessSidebar } from "../components/BusinessSidebar";
import { CreateBusinessModal } from "../components/CreateBusinessModal";
import { KpiStrip } from "../components/KpiStrip";
import { ChartCard } from "../components/charts/ChartCard";
import { ChatPanel } from "../components/ChatPanel";
import OnboardingScreen from "./OnboardingScreen";
import HomeScreen from "./HomeScreen";
import type { BriefingBundle, BusinessWithMeta, ReportSummary } from "../types";
import {
  createBusiness,
  createBriefingForBusiness,
  getBriefingBundle,
  getBusinessReports,
  uploadDataset,
} from "../lib/api";

interface Props {
  businesses: BusinessWithMeta[];
  activeBusiness: BusinessWithMeta | null;
  activeBundle: BriefingBundle | null;
  businessReports: ReportSummary[];
  onLogout: () => void;
  onBusinessCreated: (b: BusinessWithMeta) => void;
  onBusinessSelected: (b: BusinessWithMeta) => void;
  onBriefingGenerated: (bundle: BriefingBundle, reports: ReportSummary[]) => void;
  onReportSelected: (bundle: BriefingBundle) => void;
}

export default function AppShell({
  businesses,
  activeBusiness,
  activeBundle,
  businessReports,
  onLogout,
  onBusinessCreated,
  onBusinessSelected,
  onBriefingGenerated,
  onReportSelected,
}: Props) {
  const [creatingBiz, setCreatingBiz] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [mainView, setMainView] = useState<"home" | "briefing">("home");

  // Reset to home when switching businesses
  useEffect(() => { setMainView("home"); }, [activeBusiness?.id]);

  async function handleCreateBusiness(name: string, industry: string, description: string) {
    const biz = await createBusiness(name, industry, description);
    const bizWithMeta: BusinessWithMeta = {
      ...biz,
      report_count: 0,
      last_briefing_at: null,
      latest_headline: null,
    };
    onBusinessCreated(bizWithMeta);
    setCreatingBiz(false);
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <NavBar breadcrumb={activeBusiness?.name} onLogout={onLogout} />

      <div className="flex flex-1 overflow-hidden">
        <BusinessSidebar
          businesses={businesses}
          activeId={activeBusiness?.id ?? null}
          onSelect={onBusinessSelected}
          onCreateNew={() => setCreatingBiz(true)}
        />

        <main className="flex-1 overflow-y-auto bg-slate-50">
          {!activeBusiness && (
            <OnboardingScreen onSave={handleCreateBusiness} />
          )}
          {activeBusiness && businessReports.length === 0 && (
            <UploadSection
              business={activeBusiness}
              onGenerated={onBriefingGenerated}
            />
          )}
          {activeBusiness && activeBundle && businessReports.length > 0 && mainView === "home" && (
            <HomeScreen
              business={activeBusiness}
              bundle={activeBundle}
              onViewBriefing={() => setMainView("briefing")}
              onNewBriefing={() => setUploadOpen(true)}
            />
          )}
          {activeBusiness && activeBundle && businessReports.length > 0 && mainView === "briefing" && (
            <BriefingSection
              bundle={activeBundle}
              reports={businessReports}
              onSelectReport={onReportSelected}
              onNewBriefing={() => setUploadOpen(true)}
              onBackToHome={() => setMainView("home")}
            />
          )}
        </main>
      </div>

      {creatingBiz && (
        <CreateBusinessModal
          onSave={handleCreateBusiness}
          onClose={() => setCreatingBiz(false)}
        />
      )}
      {uploadOpen && activeBusiness && (
        <NewBriefingDrawer
          business={activeBusiness}
          onGenerated={(bundle, reports) => {
            onBriefingGenerated(bundle, reports);
            setUploadOpen(false);
            setMainView("home");
          }}
          onClose={() => setUploadOpen(false)}
        />
      )}
    </div>
  );
}

// ── UploadSection ─────────────────────────────────────────────────────────────

function UploadSection({
  business,
  onGenerated,
}: {
  business: BusinessWithMeta;
  onGenerated: (bundle: BriefingBundle, reports: ReportSummary[]) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState(business.description);
  const [status, setStatus] = useState<"idle" | "uploading" | "generating">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    try {
      setStatus("uploading");
      const dataset = await uploadDataset(file, description.trim());
      setStatus("generating");
      const bundle = await createBriefingForBusiness(dataset.dataset_id, business.id);
      const reports = await getBusinessReports(business.id);
      onGenerated(bundle, reports);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("idle");
    }
  }

  const busy = status !== "idle";

  return (
    <div className="flex items-center justify-center min-h-full px-6 py-16">
      <div className="w-full max-w-lg animate-fade-up">
        <h2 className="text-3xl font-semibold text-slate-900 mb-2">
          Upload your first dataset
        </h2>
        <p className="text-slate-500 mb-10">
          Upload a CSV to generate your first AI briefing for <strong>{business.name}</strong>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              CSV file
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={busy}
              required
              className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4
                         file:rounded-lg file:border-0 file:text-sm file:font-medium
                         file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Business description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              disabled={busy}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!file || busy}
            className="w-full py-3 bg-slate-900 text-white text-sm font-medium rounded-xl
                       hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed
                       transition-colors"
          >
            {status === "uploading"
              ? "Uploading…"
              : status === "generating"
              ? "Generating briefing… (up to ~60s)"
              : "Upload & Generate briefing →"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── BriefingSection ───────────────────────────────────────────────────────────

function BriefingSection({
  bundle,
  reports,
  onSelectReport,
  onNewBriefing,
  onBackToHome,
}: {
  bundle: BriefingBundle;
  reports: ReportSummary[];
  onSelectReport: (bundle: BriefingBundle) => void;
  onNewBriefing: () => void;
  onBackToHome: () => void;
}) {
  const { briefing, stats_payload } = bundle;
  const [chatOpen, setChatOpen] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  async function handleSelectReport(briefingId: string) {
    if (briefingId === briefing.briefing_id) return;
    setLoadingReport(true);
    try {
      const b = await getBriefingBundle(briefingId);
      onSelectReport(b);
    } finally {
      setLoadingReport(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {/* Header row */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 min-w-0 mr-4">
          <button
            onClick={onBackToHome}
            className="text-sm text-slate-500 hover:text-slate-900 mb-2 block transition-colors"
          >
            ← Overview
          </button>
          <div className="flex items-center gap-3 mb-2">
            {reports.length > 1 && (
              <select
                value={briefing.briefing_id}
                onChange={(e) => handleSelectReport(e.target.value)}
                disabled={loadingReport}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white
                           text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900
                           max-w-xs truncate"
              >
                {reports.map((r) => (
                  <option key={r.briefing_id} value={r.briefing_id}>
                    {r.created_at.split("T")[0]} — {r.headline.slice(0, 60)}{r.headline.length > 60 ? "…" : ""}
                  </option>
                ))}
              </select>
            )}
            {loadingReport && (
              <span className="text-xs text-slate-400">Loading…</span>
            )}
          </div>
          <h1 className="text-xl font-semibold text-slate-900 leading-snug">
            {briefing.headline}
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            {briefing.briefing_id.slice(0, 12)}…
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 mt-1">
          <button
            onClick={onNewBriefing}
            className="px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg
                       hover:bg-white hover:text-slate-900 transition-colors bg-white"
          >
            + New briefing
          </button>
          {!chatOpen && (
            <button
              onClick={() => setChatOpen(true)}
              className="px-3 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg
                         hover:bg-slate-800 transition-colors"
            >
              Ask the data →
            </button>
          )}
        </div>
      </div>

      <KpiStrip stat={stats_payload["summary.overview"]} />

      <div className="flex gap-6">
        <div className="flex-1 min-w-0 space-y-8">
          <Section title="Trends">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {briefing.trends.map((t, i) => (
                <ChartCard
                  key={i}
                  statRef={t.stat_ref}
                  stat={stats_payload[t.stat_ref]}
                  payload={stats_payload}
                  primary={t.claim}
                  secondary={t.rationale}
                />
              ))}
            </div>
          </Section>

          <Section title="Anomalies">
            {briefing.anomalies.length === 0 ? (
              <p className="text-sm text-slate-500">No anomalies flagged.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {briefing.anomalies.map((a, i) => (
                  <ChartCard
                    key={i}
                    statRef={a.stat_ref}
                    stat={stats_payload[a.stat_ref]}
                    payload={stats_payload}
                    primary={a.claim}
                    secondary={a.rationale}
                    anomaly
                  />
                ))}
              </div>
            )}
          </Section>

          <Section title="Recommended actions">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {briefing.actions.map((a, i) => (
                <ChartCard
                  key={i}
                  statRef={a.evidence_stat_ref}
                  stat={stats_payload[a.evidence_stat_ref]}
                  payload={stats_payload}
                  primary={a.action}
                  secondary={a.expected_impact}
                  secondaryLabel="Expected impact"
                />
              ))}
            </div>
          </Section>
        </div>

        {chatOpen && (
          <div className="w-96 shrink-0">
            <div className="sticky top-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Ask the data</span>
                <button
                  onClick={() => setChatOpen(false)}
                  className="text-slate-400 hover:text-slate-700 text-lg leading-none"
                >
                  ✕
                </button>
              </div>
              <ChatPanel datasetId={briefing.dataset_id} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── NewBriefingDrawer ─────────────────────────────────────────────────────────

function NewBriefingDrawer({
  business,
  onGenerated,
  onClose,
}: {
  business: BusinessWithMeta;
  onGenerated: (bundle: BriefingBundle, reports: ReportSummary[]) => void;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "generating">("idle");
  const [error, setError] = useState<string | null>(null);
  const busy = status !== "idle";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    try {
      setStatus("uploading");
      const dataset = await uploadDataset(file, business.description);
      setStatus("generating");
      const bundle = await createBriefingForBusiness(dataset.dataset_id, business.id);
      const reports = await getBusinessReports(business.id);
      onGenerated(bundle, reports);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("idle");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => { if (!busy && e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fade-up">
        <h2 className="text-xl font-semibold text-slate-900 mb-1">New briefing</h2>
        <p className="text-sm text-slate-500 mb-6">
          Upload a new CSV for <strong>{business.name}</strong>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              CSV file
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={busy}
              required
              className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4
                         file:rounded-lg file:border-0 file:text-sm file:font-medium
                         file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!file || busy}
              className="flex-1 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg
                         hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed
                         transition-colors"
            >
              {status === "uploading"
                ? "Uploading…"
                : status === "generating"
                ? "Generating… (~60s)"
                : "Upload & Generate →"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-40 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Shared Section ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900 mb-3">{title}</h2>
      {children}
    </section>
  );
}
