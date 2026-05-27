import { useState } from "react";

interface Props {
  onSave: (name: string, industry: string, description: string) => Promise<void>;
  onClose: () => void;
}

export function CreateBusinessModal({ onSave, onClose }: Props) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !industry.trim() || !description.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(name.trim(), industry.trim(), description.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fade-up">
        <h2 className="text-xl font-semibold text-slate-900 mb-1">Add a business</h2>
        <p className="text-sm text-slate-500 mb-6">Tell us a bit about what you're tracking.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              Business name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sunrise Café"
              autoFocus
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              Type of business
            </label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g., Coffee shop, NGO, Retail store"
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A small café in San Francisco tracking daily sales across menu categories and staff."
              rows={3}
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !name.trim() || !industry.trim() || !description.trim()}
              className="flex-1 bg-slate-900 text-white text-sm font-medium py-2.5 rounded-lg
                         hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Adding…" : "Add business"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
