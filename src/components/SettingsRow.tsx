import { useState } from "react";

interface SettingsRowProps {
  onAddUser: (username: string) => void;
  /** Admin token for roster writes (only needed if the deploy set ADMIN_TOKEN). */
  adminToken: string;
  onAdminTokenChange: (token: string) => void;
  /** True once a write was rejected with 401. */
  adminLocked: boolean;
}

/**
 * Bottom settings row: add a grinder to the shared roster, and an admin-token
 * field used only when the deploy locks roster writes behind ADMIN_TOKEN.
 */
export default function SettingsRow({
  onAddUser,
  adminToken,
  onAdminTokenChange,
  adminLocked,
}: SettingsRowProps) {
  const [newUser, setNewUser] = useState("");
  const [tokenDraft, setTokenDraft] = useState(adminToken);

  const submitUser = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newUser.trim();
    if (!trimmed) return;
    onAddUser(trimmed);
    setNewUser("");
  };

  const submitToken = (e: React.FormEvent) => {
    e.preventDefault();
    onAdminTokenChange(tokenDraft.trim());
  };

  return (
    <div className="grid gap-4 rounded-2xl border border-edge bg-surface/60 p-4 sm:grid-cols-2">
      {/* Add user to the shared roster */}
      <form onSubmit={submitUser} className="flex flex-col gap-1.5">
        <label className="font-mono text-[11px] uppercase tracking-widest text-muted">
          add a grinder <span className="text-grind">· shared</span>
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

      {/* Admin token (only needed if the deploy set ADMIN_TOKEN) */}
      <form onSubmit={submitToken} className="flex flex-col gap-1.5">
        <label className="font-mono text-[11px] uppercase tracking-widest text-muted">
          admin token{" "}
          {adminLocked && (
            <span className="text-danger">· edits locked — enter token</span>
          )}
        </label>
        <div className="flex gap-2">
          <input
            type="password"
            value={tokenDraft}
            onChange={(e) => setTokenDraft(e.target.value)}
            placeholder="only if this deploy is locked"
            spellCheck={false}
            autoCapitalize="none"
            className={`min-w-0 flex-1 rounded-lg border bg-[#010409] px-3 py-2 font-mono text-xs text-ink placeholder:text-muted focus:outline-none ${
              adminLocked ? "border-danger focus:border-danger" : "border-edge2 focus:border-grind"
            }`}
          />
          <button
            type="submit"
            disabled={tokenDraft.trim() === adminToken}
            className="rounded-lg border border-edge2 bg-surface px-3 py-2 font-mono text-sm font-bold text-ink transition hover:border-grind hover:text-grind disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-edge2 disabled:hover:text-ink"
          >
            save
          </button>
        </div>
      </form>
    </div>
  );
}
