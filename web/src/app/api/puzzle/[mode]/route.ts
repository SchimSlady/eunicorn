import type { PlayMode } from "@/lib/top10";

import { getPuzzle } from "@/lib/server/supabase";
import { DAILY_LOCK, todayKey } from "@/lib/daily";

const MODES: PlayMode[] = ["who-raised-this", "unicorn-grid", "higher-lower", "impostor", "top-10"];

/**
 * Today's approved puzzle for a mode from Supabase. The day is decided here, on the server,
 * in Europe/Berlin, so a wrong clock on the player's device can't unlock tomorrow early.
 * 204 when there is none, so the client falls back to the files in /data.
 */
export async function GET(req: Request, { params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  if (!MODES.includes(mode as PlayMode)) return new Response(null, { status: 404 });
  // Test mode only (daily lock off): ?rotate=<anything> gives a freshly generated puzzle.
  const rotate = DAILY_LOCK ? null : new URL(req.url).searchParams.get("rotate");
  const puzzle = await getPuzzle(mode as PlayMode, todayKey(), rotate ?? undefined);
  if (!puzzle) return new Response(null, { status: 204 });
  const cache = rotate ? "no-store" : "public, s-maxage=300, stale-while-revalidate=600";
  return Response.json(puzzle, { headers: { "Cache-Control": cache } });
}
