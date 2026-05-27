import { getUser } from "../lib/auth";

interface Props {
  onLogout: () => void;
  breadcrumb?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function NavBar({ onLogout, breadcrumb }: Props) {
  const user = getUser();
  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 shrink-0">
      <div className="flex items-center gap-2 flex-1">
        <span className="font-bold text-slate-900 text-base tracking-tight">OpsAI</span>
        {breadcrumb && (
          <>
            <span className="text-slate-300 text-sm">·</span>
            <span className="text-slate-500 text-sm">{breadcrumb}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {firstName && (
          <span className="text-sm text-slate-600">Hello, {firstName}</span>
        )}
        {user && (
          <div
            className="w-8 h-8 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center select-none"
            title={user.name}
          >
            {initials(user.name)}
          </div>
        )}
        <button
          onClick={onLogout}
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
