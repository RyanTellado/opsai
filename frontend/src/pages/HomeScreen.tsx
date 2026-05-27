import { KpiStrip } from "../components/KpiStrip";
import { getUser } from "../lib/auth";
import type { BriefingBundle, BusinessWithMeta } from "../types";

interface Props {
  business: BusinessWithMeta;
  bundle: BriefingBundle;
  onViewBriefing: () => void;
  onNewBriefing: () => void;
}

export default function HomeScreen({ business, bundle, onViewBriefing, onNewBriefing }: Props) {
  const user = getUser();
  const firstName = user?.name.split(" ")[0] ?? "";
  const { briefing, stats_payload } = bundle;

  const briefingDate = new Date(bundle.generated_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const topTrends = briefing.trends.slice(0, 2);
  const topAction = briefing.actions[0] ?? null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 animate-fade-up">
      {/* Greeting + CTAs */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            Welcome back{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="text-slate-500 mt-1">
            Here's what's happening at {business.name}.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1 shrink-0">
          <button
            onClick={onNewBriefing}
            className="px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg
                       bg-white hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            + New briefing
          </button>
          <button
            onClick={onViewBriefing}
            className="px-3 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg
                       hover:bg-slate-800 transition-colors"
          >
            View full briefing →
          </button>
        </div>
      </div>

      {/* Business card */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-slate-900 rounded-xl px-5 py-4 mb-6">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-semibold text-slate-900">{business.name}</span>
          <span className="text-slate-400 text-sm">·</span>
          <span className="text-slate-500 text-sm">{business.industry}</span>
        </div>
        <p className="text-sm text-slate-600 mb-2">{business.description}</p>
        <p className="text-xs text-slate-400">
          {business.report_count} briefing{business.report_count !== 1 ? "s" : ""}
          {" · "}Last briefing: {briefingDate}
        </p>
      </div>

      {/* KPI strip */}
      <KpiStrip stat={stats_payload["summary.overview"]} />

      {/* Key findings */}
      {topTrends.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 mb-4">
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
            Key findings
          </h2>
          <ul className="space-y-2">
            {topTrends.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="text-slate-400 shrink-0 mt-0.5">•</span>
                <span>{t.claim}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Top recommended action */}
      {topAction && (
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4">
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
            Top recommended action
          </h2>
          <p className="text-sm font-medium text-slate-900 mb-1">{topAction.action}</p>
          <p className="text-sm text-slate-500">
            <span className="font-medium text-slate-600">Expected impact: </span>
            {topAction.expected_impact}
          </p>
        </div>
      )}
    </div>
  );
}
