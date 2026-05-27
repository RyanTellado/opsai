import { useState } from "react";
import type { BriefingBundle } from "../types";
import { ChartCard } from "../components/charts/ChartCard";
import { ChatPanel } from "../components/ChatPanel";
import { NavBar } from "../components/NavBar";
import { KpiStrip } from "../components/KpiStrip";

interface Props {
  bundle: BriefingBundle;
  onBack: () => void;
  onLogout: () => void;
}

export default function Brief({ bundle, onBack, onLogout }: Props) {
  const { briefing, stats_payload } = bundle;
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar breadcrumb="Briefing" onLogout={onLogout} />

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <button
              onClick={onBack}
              className="text-sm text-slate-500 hover:text-slate-900 mb-2 block"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-semibold text-slate-900">{briefing.headline}</h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              briefing {briefing.briefing_id.slice(0, 12)}… · dataset {briefing.dataset_id.slice(0, 12)}…
            </p>
          </div>
          {!chatOpen && (
            <button
              onClick={() => setChatOpen(true)}
              className="mt-8 inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800"
            >
              Ask the data →
            </button>
          )}
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
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900 mb-3">{title}</h2>
      {children}
    </section>
  );
}
