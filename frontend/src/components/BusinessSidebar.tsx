import type { BusinessWithMeta } from "../types";

interface Props {
  businesses: BusinessWithMeta[];
  activeId: string | null;
  onSelect: (b: BusinessWithMeta) => void;
  onCreateNew: () => void;
}

export function BusinessSidebar({ businesses, activeId, onSelect, onCreateNew }: Props) {
  return (
    <aside className="w-56 bg-slate-950 flex flex-col shrink-0 overflow-y-auto">
      <div className="px-3 pt-4 pb-3 border-b border-slate-800">
        <button
          onClick={onCreateNew}
          className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:text-white
                     hover:bg-slate-800 rounded-lg flex items-center gap-2 transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          <span>New business</span>
        </button>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {businesses.length === 0 && (
          <p className="px-3 py-2 text-xs text-slate-600 italic">No businesses yet</p>
        )}
        {businesses.map((b) => (
          <button
            key={b.id}
            onClick={() => onSelect(b)}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
              b.id === activeId
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <div className="font-medium truncate">{b.name}</div>
            <div className="text-xs mt-0.5 truncate" style={{ color: b.id === activeId ? "#94a3b8" : "#475569" }}>
              {b.industry}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "#475569" }}>
              {b.report_count === 0
                ? "No briefings yet"
                : `${b.report_count} briefing${b.report_count !== 1 ? "s" : ""}`}
            </div>
          </button>
        ))}
      </nav>
    </aside>
  );
}
