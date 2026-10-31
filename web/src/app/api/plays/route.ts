import type { GameMode } from "@eunicorn/schema";
import { getPlayStats, insertPlay, type PlayRow } from "@/lib/server/supabase";
import { todayKey } from "@/lib/daily";

/**
 * The anonymous play counter. POST records a start or a finish (no IP, id or cookie is
 * stored; the day comes from the server). GET returns today's aggregates for one mode.
 */

const MODES: GameMode[] = ["who-raised-this", "unicorn-grid", "higher-lower", "impostor"];
const LEVELS = ["easy", "medium", "hard"] as const;

export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b || !MODES.includes(b.mode as GameMode) || !LEVELS.includes(b.difficulty as never)) {
    return new Response(null, { status: 400 });
  }
  const row: PlayRow = {
    played_on: todayKey(),
    mode: b.mode as GameMode,
    difficulty: b.difficulty as PlayRow["difficulty"],
    event: b.event === "finish" ? "finish" : "start",
  };
  if (row.event === "finish") {
    const bucket = Number(b.bucket);
    const pct = Number(b.scorePct);
    if (!Number.isInteger(bucket) || bucket < 0 || bucket > 20 || !Number.isFinite(pct)) return new Response(null, { status: 400 });
    row.bucket = bucket;
    row.score_pct = Math.max(0, Math.min(100, Math.round(pct)));
    row.won = b.won === true;
  }
  const ok = await insertPlay(row);
  return new Response(null, { status: ok ? 204 : 503 });
}

export async function GET(req: Request) {
  const mode = new URL(req.url).searchParams.get("mode") as GameMode;
  if (!MODES.includes(mode)) return new Response(null, { status: 400 });
  const stats = await getPlayStats(todayKey(), mode);
  if (!stats) return new Response(null, { status: 204 });
  return Response.json(stats, { headers: { "Cache-Control": "no-store" } });
}
