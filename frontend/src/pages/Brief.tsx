import type { BriefingBundle, StatResult } from "../types";
import { StatBadge } from "../components/StatBadge";

interface Props {
  bundle: BriefingBundle;
  onBack: () => void;
}

export default function Brief({ bundle, onBack }: Props) {
  const { briefing, stats_payload } = bundle;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <button
        onClick={onBack}
        className="text-sm text-slate-500 hover:text-slate-900 mb-6"
      >
        ← Back to upload
      </button>

      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900">Briefing</h1>
        <p className="text-lg text-slate-700 mt-2">{briefing.headline}</p>
        <p className="text-xs text-slate-400 mt-2 font-mono">
          briefing {briefing.briefing_id.slice(0, 12)}… · dataset {briefing.dataset_id.slice(0, 12)}…
        </p>
      </header>

      <Section title="Trends">
        {briefing.trends.map((t, i) => (
          <Item
            key={i}
            primary={t.claim}
            statRef={t.stat_ref}
            stat={stats_payload[t.stat_ref]}
            secondary={t.rationale}
          />
        ))}
      </Section>

      <Section title="Anomalies">
        {briefing.anomalies.length === 0 ? (
          <p className="text-sm text-slate-500">No anomalies flagged.</p>
        ) : (
          briefing.anomalies.map((a, i) => (
            <Item
              key={i}
              primary={a.claim}
              statRef={a.stat_ref}
              stat={stats_payload[a.stat_ref]}
              secondary={a.rationale}
            />
          ))
        )}
      </Section>

      <Section title="Recommended actions">
        {briefing.actions.map((a, i) => (
          <Item
            key={i}
            primary={a.action}
            statRef={a.evidence_stat_ref}
            stat={stats_payload[a.evidence_stat_ref]}
            secondary={a.expected_impact}
            secondaryLabel="Expected impact"
          />
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-slate-900 mb-3">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Item({
  primary,
  statRef,
  stat,
  secondary,
  secondaryLabel,
}: {
  primary: string;
  statRef: string;
  stat: StatResult | undefined;
  secondary: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="border-l-2 border-slate-200 pl-4">
      <p className="text-slate-900">{primary}</p>
      <div className="my-1.5">
        <StatBadge statRef={statRef} stat={stat} />
      </div>
      <p className="text-sm text-slate-600">
        {secondaryLabel && (
          <span className="font-medium text-slate-700">{secondaryLabel}: </span>
        )}
        {secondary}
      </p>
    </div>
  );
}
