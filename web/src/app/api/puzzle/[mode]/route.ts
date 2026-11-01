import type { PlayMode } from "@/lib/top10";

import { getPuzzle } from "@/lib/server/supabase";
import { msUntilNextPuzzle, todayKey } from "@/lib/daily";

const MODES: PlayMode[] = ["who-raised-this", "unicorn-grid", "higher-lower", "impostor", "top-10"];

/**
 * Today's approved puzzle for a mode from Supabase. The day is decided here, on the server,
 * in Europe/Berlin, so a wrong clock on the player's device can't unlock tomorrow early.
 * 204 when there is none, so the client falls back to the files in /data.
 */
export async function GET(req: Request, { params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  if (!MODES.includes(mode as PlayMode)) return new Response(null, { status: 404 });
  const puzzle = await getPuzzle(mode as PlayMode, todayKey());
  if (!puzzle) return new Response(null, { status: 204 });
  // The day's puzzle is the same for everyone, so the edge serves it without running this again,
  // but never past the daily switch at 8:00 (Europe/Berlin): fresh for up to an hour, then served stale while it
  // refreshes in the background, both capped at the day's end so nobody gets yesterday's puzzle.
  const left = Math.max(1, Math.floor(msUntilNextPuzzle() / 1000));
  const fresh = Math.min(left, 3600);
  const headers = { "Cache-Control": `public, s-maxage=${fresh}, stale-while-revalidate=${Math.max(0, left - fresh)}` };
  return Response.json(puzzle, { headers });
}
