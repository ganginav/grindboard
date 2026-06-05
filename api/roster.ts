import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  addRosterUser,
  getRoster,
  isDefaultUser,
  removeRosterUser,
} from "./_lib/store.js";
import { DEFAULT_USERS } from "./_lib/config.js";
import { redisEnabled } from "./_lib/redis.js";
import { allowCors, queryParam, requireAdmin, validUsername } from "./_lib/http.js";

/**
 * /api/roster — the SHARED roster (committed defaults + Redis-stored adds).
 *   GET    -> { users, defaults }            (public)
 *   POST   { username }  -> { users }        (open write; cross-origin writes
 *                                             gated by ALLOWED_ORIGINS CORS)
 *   DELETE ?user=<name>  -> { users }        (open write; defaults protected)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  allowCors(req, res);

  switch (req.method) {
    case "OPTIONS":
      return res.status(204).end();

    case "GET": {
      const users = await getRoster();
      // `redis` reports whether persistence is actually wired up in THIS
      // deployment. If false, adds can't persist (roster = committed defaults
      // only) — the usual cause is missing Upstash env vars or a deploy made
      // before they were added.
      return res.status(200).json({ users, defaults: DEFAULT_USERS, redis: redisEnabled() });
    }

    case "POST": {
      const name = validUsername((req.body as { username?: unknown })?.username);
      if (!name) {
        return res
          .status(400)
          .json({ error: "bad_request", message: "Invalid username." });
      }
      const users = await addRosterUser(name);
      return res.status(200).json({ users, defaults: DEFAULT_USERS });
    }

    case "DELETE": {
      const name = validUsername(queryParam(req.query, "user"));
      if (!name) {
        return res
          .status(400)
          .json({ error: "bad_request", message: "Provide a valid ?user=" });
      }
      if (isDefaultUser(name)) {
        return res.status(409).json({
          error: "protected_default",
          message: `"${name}" is a committed default and can't be removed.`,
        });
      }
      const users = await removeRosterUser(name);
      return res.status(200).json({ users, defaults: DEFAULT_USERS });
    }

    default:
      return res.status(405).json({ error: "method_not_allowed" });
  }
}
