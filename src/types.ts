import type { FetchStatus, UserMetrics } from "./lib/leetcode";

/** UI state for one user on the board (roster entry + fetch state + metrics). */
export interface BoardUser {
  /** Display username (original casing). */
  username: string;
  /** Accent color (cycled from USER_COLORS by roster index). */
  color: string;
  /** True for committed DEFAULT_USERS — cannot be removed by visitors. */
  isDefault: boolean;
  /** "loading" while a sync is in flight, otherwise the resolved fetch status. */
  status: FetchStatus | "loading";
  /** Derived metrics, or null until the first successful fetch. */
  metrics: UserMetrics | null;
}

/** Metric the leaderboard is currently ranking by. */
export type Metric = "today" | "week" | "total";
