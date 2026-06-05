import { useState } from "react";
import { DEFAULT_API_BASE } from "../config";

interface SettingsRowProps {
  apiBase: string;
  onApiBaseChange: (base: string) => void;
  onAddUser: (username: string) => void;
}

/**
 * Bottom settings row:
 *  - add a username to the board (persists to localStorage)
 *  - override the API base at runtime (persists to localStorage), so you can
 *    point at a self-hosted alfa-leetcode-api without rebuilding.
 */
export default function SettingsRow({
  apiBase,
  onApiBaseChange,
  onAddUser,
}: SettingsRowProps) {
  const [newUser, setNewUser] = useState("");
  const [baseDraft, setBaseDraft] = useState(apiBase);

  const submitUser = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newUser.trim();
    if (!trimmed) return;
    onAddUser(trimmed);
    setNewUser("");
  };

  const submitBase = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = baseDraft.trim();
    onApiBaseChange(trimmed || DEFAULT_API_BASE);
  };

  return (
    <div className="grid gap-4 rounded-2xl border border-edge bg-surface/60 p-4 sm:grid-cols-2">
      {/* Add user */}
      <form onSubmit={submitUser} className="flex flex-col gap-1.5">
        <label className="font-mono text-[11px] uppercase tracking-widest text-muted">
          add a grinder
        </label>
        <div className="flex gap-2">
          <input
            value={newUser}
            onChange={(e) => setNewUser(e.target.value)}
            placeholder="leetcode username"
            spellCheck={false}
            autoCapitalize="none"
            className="min-w-0 flex-1 rounded-lg border border-edge2 bg-[#010409] px-3 py-2 font-mono text-sm text-ink placeholder:text-muted focus:border-grind focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg border border-edge2 bg-surface px-3 py-2 font-mono text-sm font-bold text-grind transition hover:border-grind"
          >
            add
          </button>
        </div>
      </form>

      {/* API base override */}
      <form onSubmit={submitBase} className="flex flex-col gap-1.5">
        <label className="font-mono text-[11px] uppercase tracking-widest text-muted">
          api base (self-host override)
        </label>
        <div className="flex gap-2">
          <input
            value={baseDraft}
            onChange={(e) => setBaseDraft(e.target.value)}
            placeholder={DEFAULT_API_BASE}
            spellCheck={false}
            autoCapitalize="none"
            className="min-w-0 flex-1 rounded-lg border border-edge2 bg-[#010409] px-3 py-2 font-mono text-xs text-ink placeholder:text-muted focus:border-grind focus:outline-none"
          />
          <button
            type="submit"
            disabled={baseDraft.trim() === apiBase}
            className="rounded-lg border border-edge2 bg-surface px-3 py-2 font-mono text-sm font-bold text-ink transition hover:border-grind hover:text-grind disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-edge2 disabled:hover:text-ink"
          >
            set
          </button>
        </div>
      </form>
    </div>
  );
}
