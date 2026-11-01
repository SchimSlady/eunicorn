import type { PlayMode } from "@/lib/top10";

import { cleanName } from "@/lib/server/names";
import { getLeaderboard, insertLeaderboard } from "@/lib/server/supabase";
import { todayKey } from "@/lib/daily";

/**
 * The optional daily leaderboard. POST adds the caller to today's board under a name they chose
 * (the day comes from the server); GET returns the top of the board for a game and level, plus the
 * caller's own entry. 204 when the leaderboard isn't set up, so the page just doesn't show it.
 */

const MODES: PlayMode[] = ["who-raised-this", "unicorn-grid", "higher-lower", "impostor", "top-10"];
const LEVELS = ["easy", "medium", "hard"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b || !MODES.includes(b.mode as PlayMode) || !LEVELS.includes(b.difficulty as never)) return new Response(null, { status: 400 });
  if (typeof b.device !== "string" || !UUID.test(b.device)) return new Response(null, { status: 400 });
  const pct = Number(b.scorePct);
  const hints = Number(b.hints);
  if (!Number.isFinite(pct) || !Number.isInteger(hints) || hints < 0 || hints > 30) return new Response(null, { status: 400 });
  const name = cleanName(b.name);
  if (!name) return new Response(null, { status: 422 });

  const result = await insertLeaderboard({
    played_on: todayKey(),
    mode: b.mode as PlayMode,
    difficulty: b.difficulty as (typeof LEVELS)[number],
    name,
    device: b.device.toLowerCase(),
    score_pct: Math.max(0, Math.min(100, Math.round(pct))),
    hints,
  });
  return new Response(null, { status: result === "ok" ? 204 : result === "duplicate" ? 409 : 503 });
}

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const mode = p.get("mode") as PlayMode;
  const difficulty = p.get("difficulty");
  const device = p.get("device") ?? "";
  if (!MODES.includes(mode) || !LEVELS.includes(difficulty as never) || !UUID.test(device)) return new Response(null, { status: 400 });
  const board = await getLeaderboard(todayKey(), mode, difficulty!, device.toLowerCase());
  if (!board) return new Response(null, { status: 204 });
  return Response.json(board, { headers: { "Cache-Control": "no-store" } });
}
