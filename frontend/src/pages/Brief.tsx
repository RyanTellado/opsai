import type { BriefingBundle } from "../types";
import { ChartCard } from "../components/charts/ChartCard";
import { ChatPanel } from "../components/ChatPanel";

interface Props {
  bundle: BriefingBundle;
  onBack: () => void;
  userName?: string;
  onLogout?: () => void;
}

export default function Brief({ bundle, onBack, userName, onLogout }: Props) {
  const { briefing, stats_payload } = bundle;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← Back to upload
        </button>
        {onLogout && (
          <button onClick={onLogout} className="text-sm text-slate-500 hover:text-slate-900">
            {userName ? `${userName.split(" ")[0]} · ` : ""}Sign out
          </button>
        )}
      </div>

      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900">Briefing</h1>
        <p className="text-lg text-slate-700 mt-2">{briefing.headline}</p>
        <p className="text-xs text-slate-400 mt-2 font-mono">
          briefing {briefing.briefing_id.slice(0, 12)}… · dataset {briefing.dataset_id.slice(0, 12)}…
        </p>
      </header>

      <Section title="Trends">
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
      </Section>

      <Section title="Anomalies">
        {briefing.anomalies.length === 0 ? (
          <p className="text-sm text-slate-500">No anomalies flagged.</p>
        ) : (
          briefing.anomalies.map((a, i) => (
            <ChartCard
              key={i}
              statRef={a.stat_ref}
              stat={stats_payload[a.stat_ref]}
              payload={stats_payload}
              primary={a.claim}
              secondary={a.rationale}
            />
          ))
        )}
      </Section>

      <Section title="Recommended actions">
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
      </Section>

      <ChatPanel datasetId={briefing.dataset_id} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-slate-900 mb-3">{title}</h2>
      <div className="space-y-6">{children}</div>
    </section>
  );
}
