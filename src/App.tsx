import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header from "./components/Header";
import Card from "./components/Card";
import Leaderboard from "./components/Leaderboard";
import Sparkline from "./components/Sparkline";
import SettingsRow from "./components/SettingsRow";
import {
  AUTO_SYNC_MS,
  DEFAULT_API_BASE,
  DEFAULT_USERS,
  LS_ADDED_USERS,
  LS_API_BASE,
  REQUEST_GAP_MS,
  USER_COLORS,
} from "./config";
import { deriveMetrics, fetchUser, sleep } from "./lib/leetcode";
import type { FetchStatus, UserMetrics } from "./lib/leetcode";
import type { BoardUser, Metric } from "./types";

/** Per-user fetch state, keyed by lowercased username in `states`. */
interface UserState {
  status: FetchStatus | "loading";
  metrics: UserMetrics | null;
}

interface RosterEntry {
  username: string;
  isDefault: boolean;
}

const envBase = import.meta.env.VITE_API_BASE?.trim();

// ───────────────────── localStorage helpers ──────────────────────

function loadAddedUsers(): string[] {
  try {
    const raw = localStorage.getItem(LS_ADDED_USERS);
    const arr: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr)) return arr.filter((x): x is string => typeof x === "string");
  } catch {
    /* ignore malformed storage */
  }
  return [];
}

function persistAddedUsers(users: string[]): void {
  try {
    localStorage.setItem(LS_ADDED_USERS, JSON.stringify(users));
  } catch {
    /* storage may be unavailable (private mode) — non-fatal */
  }
}

function loadApiBase(): string {
  try {
    const saved = localStorage.getItem(LS_API_BASE)?.trim();
    if (saved) return saved;
  } catch {
    /* ignore */
  }
  return envBase || DEFAULT_API_BASE;
}

/**
 * Merge committed defaults with user-added names, de-duplicated
 * case-insensitively. Defaults always come first and win the casing.
 */
function buildRoster(added: string[]): RosterEntry[] {
  const seen = new Set<string>();
  const roster: RosterEntry[] = [];

  for (const u of DEFAULT_USERS) {
    const key = u.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    roster.push({ username: u, isDefault: true });
  }
  for (const u of added) {
    const name = u.trim();
    const key = name.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    roster.push({ username: name, isDefault: false });
  }
  return roster;
}

// ─────────────────────────── App ─────────────────────────────────

export default function App() {
  const [addedUsers, setAddedUsers] = useState<string[]>(loadAddedUsers);
  const [apiBase, setApiBase] = useState<string>(loadApiBase);
  const [states, setStates] = useState<Record<string, UserState>>({});
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [metric, setMetric] = useState<Metric>("today");

  const roster = useMemo(() => buildRoster(addedUsers), [addedUsers]);

  // Refs let async loops read live values without stale closures.
  const apiBaseRef = useRef(apiBase);
  apiBaseRef.current = apiBase;
  const rosterRef = useRef(roster);
  rosterRef.current = roster;
  const addedUsersRef = useRef(addedUsers);
  addedUsersRef.current = addedUsers;
  // Monotonic id so a newer sync run cleanly supersedes an in-flight older one.
  const runIdRef = useRef(0);

  /** Fetch a single user and fold its result into state. */
  const syncUser = useCallback(async (username: string) => {
    const key = username.toLowerCase();
    const base = apiBaseRef.current;
    setStates((prev) => ({
      ...prev,
      [key]: { status: "loading", metrics: prev[key]?.metrics ?? null },
    }));
    const result = await fetchUser(username, base);
    setStates((prev) => ({
      ...prev,
      [key]: {
        status: result.status,
        metrics: result.status === "ok" ? deriveMetrics(result) : (prev[key]?.metrics ?? null),
      },
    }));
  }, []);

  /**
   * Fetch every roster user SEQUENTIALLY with a polite gap between requests
   * (the public alfa instance is rate-limited). State updates per-user as each
   * resolves, so the board fills in progressively rather than blocking.
   */
  const syncAll = useCallback(async () => {
    const runId = ++runIdRef.current;
    const list = rosterRef.current;
    const base = apiBaseRef.current;
    setSyncing(true);

    // Mark everyone loading up front (keep any prior metrics for a soft refresh).
    setStates((prev) => {
      const next = { ...prev };
      for (const r of list) {
        const key = r.username.toLowerCase();
        next[key] = { status: "loading", metrics: prev[key]?.metrics ?? null };
      }
      return next;
    });

    for (let i = 0; i < list.length; i++) {
      if (runId !== runIdRef.current) return; // a newer run took over
      const r = list[i];
      const result = await fetchUser(r.username, base);
      if (runId !== runIdRef.current) return;
      const key = r.username.toLowerCase();
      setStates((prev) => ({
        ...prev,
        [key]: {
          status: result.status,
          metrics:
            result.status === "ok" ? deriveMetrics(result) : (prev[key]?.metrics ?? null),
        },
      }));
      if (i < list.length - 1) await sleep(REQUEST_GAP_MS);
    }

    setLastSynced(Date.now());
    setSyncing(false);
  }, []);

  // Initial load + re-sync whenever the API base changes.
  useEffect(() => {
    void syncAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  // Auto-refresh every 10 minutes.
  useEffect(() => {
    const id = window.setInterval(() => void syncAll(), AUTO_SYNC_MS);
    return () => window.clearInterval(id);
  }, [syncAll]);

  const addUser = useCallback(
    (username: string) => {
      const name = username.trim();
      if (!name) return;
      const key = name.toLowerCase();
      const exists = buildRoster(addedUsersRef.current).some(
        (r) => r.username.toLowerCase() === key,
      );
      if (exists) return;
      setAddedUsers((prev) => {
        const next = [...prev, name];
        persistAddedUsers(next);
        return next;
      });
      void syncUser(name); // fetch just the newcomer
    },
    [syncUser],
  );

  const removeUser = useCallback((username: string) => {
    const key = username.toLowerCase();
    setAddedUsers((prev) => {
      const next = prev.filter((u) => u.toLowerCase() !== key);
      persistAddedUsers(next);
      return next;
    });
    setStates((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const changeApiBase = useCallback((base: string) => {
    const trimmed = base.trim() || DEFAULT_API_BASE;
    try {
      localStorage.setItem(LS_API_BASE, trimmed);
    } catch {
      /* ignore */
    }
    setApiBase(trimmed); // triggers the re-sync effect above
  }, []);

  // Compose roster + fetch state + cycled color into render-ready users.
  const boardUsers: BoardUser[] = useMemo(
    () =>
      roster.map((r, i) => {
        const st = states[r.username.toLowerCase()];
        return {
          username: r.username,
          color: USER_COLORS[i % USER_COLORS.length],
          isDefault: r.isDefault,
          status: st?.status ?? "loading",
          metrics: st?.metrics ?? null,
        };
      }),
    [roster, states],
  );

  const subsToday = useMemo(
    () =>
      boardUsers.reduce(
        (sum, u) => sum + (u.status === "ok" ? (u.metrics?.today ?? 0) : 0),
        0,
      ),
    [boardUsers],
  );

  // Today cards reorder live by today's count (data present first, then others).
  const cardsByToday = useMemo(
    () =>
      [...boardUsers].sort(
        (a, b) => (b.metrics?.today ?? -1) - (a.metrics?.today ?? -1),
      ),
    [boardUsers],
  );

  // Last-7 section: only users with data, ordered by their 7-day total.
  const weekly = useMemo(
    () =>
      boardUsers
        .filter((u) => u.status === "ok" && u.metrics)
        .sort((a, b) => (b.metrics?.week ?? 0) - (a.metrics?.week ?? 0)),
    [boardUsers],
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <Header
        subsToday={subsToday}
        syncing={syncing}
        lastSynced={lastSynced}
        onSync={() => void syncAll()}
      />

      {/* Honest note about what the numbers mean. */}
      <p className="mt-6 rounded-xl border border-edge bg-surface/50 px-4 py-3 font-sans text-xs leading-relaxed text-muted">
        <span className="font-mono font-bold text-grind">heads up:</span> the
        daily number is <strong className="text-ink">submissions</strong> —
        LeetCode&apos;s per-day signal — so re-submits and multiple attempts
        count.{" "}
        <strong className="text-ink">solved</strong> is the exact cumulative
        count of unique accepted problems. Only{" "}
        <strong className="text-ink">public</strong> LeetCode profiles can be
        read.
      </p>

      {/* ── Today ── */}
      <section className="mt-10">
        <h2 className="mb-3 font-mono text-sm font-bold uppercase tracking-widest text-muted">
          Today
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cardsByToday.map((u) => (
            <Card key={u.username} user={u} onRemove={removeUser} />
          ))}
        </div>
      </section>

      {/* ── Leaderboard ── */}
      <section className="mt-10">
        <Leaderboard users={boardUsers} metric={metric} onMetricChange={setMetric} />
      </section>

      {/* ── Last 7 days ── */}
      <section className="mt-10">
        <h2 className="mb-3 font-mono text-sm font-bold uppercase tracking-widest text-muted">
          Last 7 days
        </h2>
        {weekly.length === 0 ? (
          <div className="rounded-2xl border border-edge bg-surface/60 p-6 text-center font-mono text-sm text-muted">
            no data yet — syncing…
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {weekly.map((u) => (
              <div
                key={u.username}
                className="rounded-2xl border border-edge bg-surface/60 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: u.color }}
                    />
                    <span className="font-sans text-sm font-semibold text-ink">
                      {u.username}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-muted">
                    7d total:{" "}
                    <span className="font-bold text-ink tnum">
                      {u.metrics?.week ?? 0}
                    </span>
                  </span>
                </div>
                <Sparkline days={u.metrics?.last7 ?? []} color={u.color} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Settings ── */}
      <section className="mt-10">
        <SettingsRow
          apiBase={apiBase}
          onApiBaseChange={changeApiBase}
          onAddUser={addUser}
        />
        <p className="mt-2 px-1 font-mono text-[11px] text-muted">
          reading from{" "}
          <span className="text-ink">{apiBase}</span>
        </p>
      </section>

      <footer className="mt-12 border-t border-edge pt-6 text-center font-mono text-[11px] text-muted">
        THE GRIND BOARD · data via{" "}
        <a
          href="https://github.com/alfaarghya/alfa-leetcode-api"
          target="_blank"
          rel="noreferrer"
          className="text-muted underline hover:text-grind"
        >
          alfa-leetcode-api
        </a>{" "}
        · keep grinding
      </footer>
    </div>
  );
}
