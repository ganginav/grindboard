# THE GRIND BOARD

A shared **LeetCode accountability tracker** for a friend group. Point it at a
few public LeetCode usernames and it shows everyone's **daily activity,
streaks, and a leaderboard** — so the group stays locked in and keeps each
other honest. No manual logging: everything is auto-fetched from public
profiles.

Built with **Vite + React + TypeScript + Tailwind**. Ships as a static SPA
(deploy to Vercel) with a **Docker** path for self-hosting.

![stack](https://img.shields.io/badge/vite-react%2Bts-39d353) ![license](https://img.shields.io/badge/license-MIT-8b949e)

---

## What the numbers mean (read this)

Two honest caveats baked into the UI:

- **The big daily number is _submissions_, not unique solves.** It comes from
  LeetCode's per-day submission calendar — the most reliable public "did they
  grind today" signal — so re-submits and multiple attempts on the same problem
  all count. This is intentional: it rewards showing up.
- **"solved" is the exact cumulative total** of unique accepted problems, read
  from `/solved`. That's the precise number; the daily figure is the activity
  signal.
- **Only _public_ LeetCode profiles work.** A private profile returns "not
  found". Streaks and counts can only reflect what LeetCode exposes publicly.

Streaks count **consecutive UTC days** with at least one submission. If you
haven't submitted yet _today_, your streak is measured ending **yesterday**, so
it isn't falsely "lost" early in the day.

---

## Data source

Data comes from [**alfa-leetcode-api**](https://github.com/alfaarghya/alfa-leetcode-api),
a public REST wrapper over LeetCode's GraphQL. The board uses two endpoints per
user:

| Endpoint                      | Used for                                              |
| ----------------------------- | ----------------------------------------------------- |
| `GET {API_BASE}/{user}/calendar` | per-day submission counts (UTC-bucketed) → today / 7d / streak |
| `GET {API_BASE}/{user}/solved`   | cumulative unique solved total                        |

The default `API_BASE` is the public instance `https://alfa-leetcode-api.onrender.com`.
That instance is **rate-limited and can be slow/cold**, so the board fetches
users sequentially with a small gap and auto-refreshes only every 10 minutes.
For anything serious, **self-host the API** (see below).

---

## Local development

```bash
npm install
npm run dev
```

Open the printed URL (default **http://localhost:5173**). The board seeds the
committed roster and starts syncing immediately.

```bash
npm run build     # type-check + production bundle into dist/
npm run preview   # serve the built bundle locally
```

### Configuration

`VITE_API_BASE` selects which alfa-leetcode-api instance to read from. Copy the
example and edit if needed:

```bash
cp .env.example .env
```

`VITE_` variables are inlined at **build time**. To point at a different API
without rebuilding, use the in-app **"API base"** field in the settings row — it
overrides the env value at runtime and persists to `localStorage`.

---

## Changing the shared roster

The committed default board lives in **[`src/config.ts`](src/config.ts)**:

```ts
export const DEFAULT_USERS: string[] = ["GANGINAV"];
```

Edit this array and redeploy to change the board **for everyone**. (Heads up:
the seeded `GANGINAV` is a placeholder — correct it to the real handle if it
doesn't resolve.)

Visitors can also **add their own usernames** at runtime via the UI. Those
persist in that browser's `localStorage` (key `gb-added-users`), are
de-duplicated against the defaults case-insensitively, and can be removed again
— but the committed defaults can't be removed from the UI. (Per-browser only;
see _Future / scaling_ for making added users truly shared.)

---

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, **Add New → Project** and import the repo.
3. Framework is auto-detected as **Vite** (build `npm run build`, output `dist`).
   No backend is required for v1.
4. (Optional) Set an environment variable **`VITE_API_BASE`** if you self-host
   the API and want it baked into the build.
5. Deploy. `vercel.json` already rewrites all routes to `/` for SPA routing.

That's it — a static SPA, no server functions needed for v1.

---

## Self-host with Docker

`docker-compose.yml` runs **two** services: the GrindBoard app and a private
copy of `alfa-leetcode-api`.

```bash
docker compose up --build
```

- App → **http://localhost:8080**
- API → **http://localhost:3000**

The compose file bakes `VITE_API_BASE=http://localhost:3000` into the app build
so your browser talks to the local API container directly. Because `VITE_` vars
are build-time, if you host this on another machine either:

- rebuild with `VITE_API_BASE` set to that host's API URL, **or**
- leave the build as-is and just type the API URL into the in-app **"API base"**
  field (runtime override, no rebuild).

You can also build/run the app image alone:

```bash
docker build --build-arg VITE_API_BASE=http://localhost:3000 -t grindboard .
docker run -p 8080:80 grindboard
```

---

## How it's built

```
src/
  config.ts            # DEFAULT_USERS roster, colors, API base, tuning constants
  types.ts             # shared UI types (BoardUser, Metric)
  lib/leetcode.ts      # THE data layer: fetch + normalize + streak + date helpers
  components/
    Header.tsx         # wordmark, "subs today" stat, sync button
    Card.tsx           # per-user Today card
    Leaderboard.tsx    # ranked bars + metric tabs
    Sparkline.tsx      # 7-day mini bar chart
    SettingsRow.tsx    # add-user + API-base override inputs
  App.tsx              # state, sync orchestration, layout
```

The three LeetCode quirks are isolated and commented in `lib/leetcode.ts`:

1. **UTC day bucketing** — every day key is derived from `getUTC*` (LeetCode
   buckets the calendar by UTC midnight).
2. **Calendar string parsing** — the calendar value may be an object _or_ a
   JSON-stringified object; `normalizeCalendar` accepts either.
3. **The "don't lose your streak mid-day" rule** in `computeStreak`.

All fetching goes through a single `fetchUser()` that never throws and returns a
discriminated status (`ok` / `not_found` / `unreachable`), so the UI can render
distinct error states and the data source can be swapped in one place.

---

## Future / scaling

This is v1: a fun, zero-backend page. Two things to change to grow it into
something a wider group can rely on:

1. **A truly shared roster (no per-browser `localStorage`).** Today, defaults
   are committed in `src/config.ts` and additions live only in each visitor's
   browser. To let anyone add to the _shared_ board, add a Vercel serverless
   function backed by **Vercel KV** (or any small DB) to store the roster, and
   read/write it from the app.
2. **Avoiding public-API rate limits.** Replace the direct browser → public
   instance calls with a **Vercel serverless function as a caching proxy**: it
   fetches from alfa-leetcode-api (or LeetCode directly), caches per-user
   results for a few minutes in KV, and serves the board. This removes CORS and
   rate-limit pain and makes the board fast.

Both are intentionally a **one-file change**: the entire data layer is
`src/lib/leetcode.ts`, and components only consume `fetchUser()` +
`deriveMetrics()`. Swap `fetchUser` to call your `/api/...` proxy instead of the
public instance and nothing else has to move.

---

## License

MIT — see [LICENSE](LICENSE).
