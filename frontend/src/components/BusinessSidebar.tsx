import { useState } from "react";
import type { BusinessWithMeta } from "../types";

interface Props {
  businesses: BusinessWithMeta[];
  activeId: string | null;
  onSelect: (b: BusinessWithMeta) => void;
  onCreateNew: () => void;
  onDelete: (id: string) => Promise<void>;
}

export function BusinessSidebar({ businesses, activeId, onSelect, onCreateNew, onDelete }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

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
        {businesses.map((b) => {
          const isActive = b.id === activeId;
          const isConfirming = confirmId === b.id;
          const isDeleting = deletingId === b.id;

          return (
            <div key={b.id} className="group relative">
              <button
                onClick={() => { if (!isConfirming) onSelect(b); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors pr-8 ${
                  isActive
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <div className="font-medium truncate">{b.name}</div>
                <div className="text-xs mt-0.5 truncate" style={{ color: isActive ? "#94a3b8" : "#475569" }}>
                  {b.industry}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#475569" }}>
                  {b.report_count === 0
                    ? "No briefings yet"
                    : `${b.report_count} briefing${b.report_count !== 1 ? "s" : ""}`}
                </div>
              </button>

              {/* Delete button — visible on hover */}
              {!isConfirming && !isDeleting && (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmId(b.id); }}
                  className="absolute right-2 top-2.5 opacity-0 group-hover:opacity-100
                             text-slate-600 hover:text-red-400 transition-all text-xs leading-none p-1"
                  title="Delete business"
                >
                  ✕
                </button>
              )}

              {/* Inline confirm */}
              {isConfirming && (
                <div className="absolute inset-0 bg-slate-900 rounded-lg flex flex-col items-center justify-center gap-2 px-3 py-2 z-10">
                  <p className="text-xs text-slate-300 text-center leading-tight">
                    Delete <span className="font-medium text-white">{b.name}</span>?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(b.id)}
                      disabled={isDeleting}
                      className="px-2.5 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-500 disabled:opacity-50"
                    >
                      {isDeleting ? "…" : "Delete"}
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="px-2.5 py-1 text-xs text-slate-400 hover:text-white rounded-md"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
