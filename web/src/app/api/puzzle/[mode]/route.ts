import type { GameMode } from "@eunicorn/schema";
import { getPuzzle } from "@/lib/server/supabase";
import { todayKey } from "@/lib/daily";

const MODES: GameMode[] = ["who-raised-this", "unicorn-grid", "higher-lower", "impostor"];

/**
 * Today's approved puzzle for a mode from Supabase. The day is decided here, on the server,
 * in Europe/Berlin, so a wrong clock on the player's device can't unlock tomorrow early.
 * 204 when there is none, so the client falls back to the files in /data.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  if (!MODES.includes(mode as GameMode)) return new Response(null, { status: 404 });
  const puzzle = await getPuzzle(mode as GameMode, todayKey());
  if (!puzzle) return new Response(null, { status: 204 });
  return Response.json(puzzle, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
