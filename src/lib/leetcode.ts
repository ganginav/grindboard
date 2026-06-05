/**
 * leetcode.ts — client-side day bucketing + metric derivation for Leeterboard.
 *
 * The server hands us each user's recent *accepted* submissions raw (`acSubs`:
 * { ts, slug }). This module buckets them into days and derives today / week /
 * streak / last7. Two things to know:
 *
 *   1. LOCAL day bucketing — day keys come from the LOCAL getters (getFullYear/
 *      getMonth/getDate), so a problem solved at 11pm Thursday shows on Thursday
 *      for the viewer, instead of drifting into Friday UTC. Each viewer sees days
 *      in their own timezone, which is what people expect.
 *   2. The "don't lose your streak mid-day" rule in computeStreak.
 */

// ───────────────────────────── Types ─────────────────────────────

/** Map of local day key ("YYYY-MM-DD") -> distinct problems solved that day. */
export type Calendar = Record<string, number>;

export type FetchStatus = "ok" | "not_found" | "unreachable";

/** One recent accepted submission: unix-seconds timestamp + problem slug. */
export interface AcSub {
  ts: number;
  slug: string;
}

/** Normalized per-user data the metrics are derived from. */
export interface FetchResult {
  status: FetchStatus;
  /** Recent accepted submissions, bucketed client-side into the local-day calendar. */
  acSubs: AcSub[];
  /** Cumulative solved problems (0 if unavailable). */
  total: number;
}

/** One day's bar in the 7-day sparkline / line chart. */
export interface DayBar {
  day: string; // YYYY-MM-DD (local)
  count: number;
}

/** Derived, display-ready metrics for a user. */
export interface UserMetrics {
  today: number;
  week: number;
  total: number;
  streak: number;
  last7: DayBar[];
}

// ──────────────────────── Local date helpers ─────────────────────
//
// QUIRK #1: bucket by the viewer's LOCAL day (not UTC). We have raw timestamps,
// so we can — and a late-night solve should count for the day it was actually
// done in the user's own timezone.

/** Format a Date as its LOCAL "YYYY-MM-DD" key. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today's local day key. */
export function todayKey(): string {
  return dayKey(new Date());
}

/** The local day key `n` days before today (n=0 is today). */
export function agoKey(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dayKey(d);
}

/** The last 7 local day keys, oldest -> newest (index 6 is today). */
export function last7(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) days.push(agoKey(i));
  return days;
}

/** Single-letter weekday label for a "YYYY-MM-DD" key (S M T W T F S). */
export function weekdayInitial(key: string): string {
  // Parse as LOCAL midnight (no trailing Z) so the weekday matches the bucket.
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return ["S", "M", "T", "W", "T", "F", "S"][date.getDay()];
}

// ─────────────────── Bucket accepted submissions ─────────────────

/**
 * Build { local day -> distinct problems solved } from raw accepted submissions.
 * Re-solving the same problem in a day counts once (distinct slug per day).
 */
export function buildCalendar(acSubs: AcSub[]): Calendar {
  if (!Array.isArray(acSubs)) return {}; // defensive: tolerate stale/garbage payloads
  const byDay: Record<string, Set<string>> = {};
  for (const { ts, slug } of acSubs) {
    if (!Number.isFinite(ts) || !slug) continue;
    const date = new Date(ts * 1000); // ts is in SECONDS
    if (Number.isNaN(date.getTime())) continue;
    const key = dayKey(date);
    (byDay[key] ??= new Set()).add(slug);
  }
  const out: Calendar = {};
  for (const [key, slugs] of Object.entries(byDay)) out[key] = slugs.size;
  return out;
}

// ──────────────────────────── Streak ─────────────────────────────
//
// QUIRK #2: a streak is the number of consecutive local days (ending now) with
// at least one problem solved. Early in the day you may have 0 *so far* — we
// don't want that to read as "streak broken". So if today's count is 0 we
// measure the run ending YESTERDAY; if today already has a solve we include it.

export function computeStreak(calendar: Calendar): number {
  const startOffset = (calendar[todayKey()] ?? 0) > 0 ? 0 : 1;
  let streak = 0;
  for (let i = startOffset; ; i++) {
    if ((calendar[agoKey(i)] ?? 0) > 0) streak++;
    else break;
  }
  return streak;
}

// ─────────────────────── Derived metrics ─────────────────────────

export function deriveMetrics(result: FetchResult): UserMetrics {
  const calendar = buildCalendar(result.acSubs);
  const last7Bars: DayBar[] = last7().map((day) => ({
    day,
    count: calendar[day] ?? 0,
  }));
  return {
    today: calendar[todayKey()] ?? 0,
    week: last7Bars.reduce((sum, b) => sum + b.count, 0),
    total: result.total,
    streak: computeStreak(calendar),
    last7: last7Bars,
  };
}
