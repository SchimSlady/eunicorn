import type { GameMode, Puzzle } from "@eunicorn/schema";

/**
 * Once-a-day lock. Off while testing: every visit starts fresh and finished games can be
 * replayed. Turn on for launch with NEXT_PUBLIC_DAILY_LOCK=true (e.g. in .env.local or Vercel).
 */
export const DAILY_LOCK = process.env.NEXT_PUBLIC_DAILY_LOCK === "true";

/** Puzzles flip at midnight Central European Time for everyone, wherever they are. */
export const PUZZLE_TIMEZONE = "Europe/Berlin";

/** Today's puzzle date as "YYYY-MM-DD" in CET/CEST. */
export function todayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: PUZZLE_TIMEZONE }).format(now);
}

export async function loadPuzzle<P extends Puzzle>(mode: GameMode, date = todayKey()): Promise<P | null> {
  const res = await fetch(`/data/puzzles/${date}/${mode}.json`);
  return res.ok ? ((await res.json()) as P) : null;
}

/** Until the data side publishes a daily schedule, fall back to the fixture day. */
const FIXTURE_DATE = "2026-11-01";

/** Today's puzzle from the files in /data, or the fixture day when today has none. */
export async function loadFilePuzzle<P extends Puzzle>(mode: GameMode): Promise<P | null> {
  return (await loadPuzzle<P>(mode)) ?? (await loadPuzzle<P>(mode, FIXTURE_DATE));
}

/** Today's puzzle from wherever it lives (Supabase first), e.g. to read its date on the home page. */
export async function loadTodayPuzzle<P extends Puzzle>(mode: GameMode): Promise<P | null> {
  const live = await fetch(`/api/puzzle/${mode}`).catch(() => null);
  if (live?.status === 200) return (await live.json()) as P;
  return loadFilePuzzle<P>(mode);
}

/** Milliseconds until the next puzzle unlocks (midnight Europe/Berlin). */
export function msUntilNextPuzzle(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: PUZZLE_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const elapsed = get("hour") * 3600 + get("minute") * 60 + get("second");
  return (86400 - elapsed) * 1000 - now.getMilliseconds();
}

/* ---------- in-progress state, so a reload doesn't reset (or re-roll) today's game ---------- */

export function loadProgress<T>(mode: GameMode, date: string): T | null {
  if (!DAILY_LOCK) return null;
  try {
    return JSON.parse(localStorage.getItem(`eunicorn:${mode}:progress:${date}`) ?? "null");
  } catch {
    return null;
  }
}

export function saveProgress<T>(mode: GameMode, date: string, state: T): void {
  try {
    localStorage.setItem(`eunicorn:${mode}:progress:${date}`, JSON.stringify(state));
  } catch {
    // Storage blocked; progress just won't survive a reload.
  }
}

/* ---------- once-a-day lock + stats, device-local (no accounts) ---------- */

export interface DailyResult {
  date: string;
  score: number;
  maxScore: number;
  hintsUsed: number;
  /** Emoji line(s) for the share card. */
  share: string;
}

const key = (mode: GameMode) => `eunicorn:${mode}:results`;

function readResults(mode: GameMode): DailyResult[] {
  try {
    return JSON.parse(localStorage.getItem(key(mode)) ?? "[]");
  } catch {
    return [];
  }
}

/** The stored result if the player already finished today's puzzle for this mode. */
export function getTodayResult(mode: GameMode, date = todayKey()): DailyResult | null {
  if (!DAILY_LOCK) return null;
  return readResults(mode).find((r) => r.date === date) ?? null;
}

export function saveResult(mode: GameMode, result: DailyResult): void {
  const results = readResults(mode).filter((r) => r.date !== result.date);
  try {
    localStorage.setItem(key(mode), JSON.stringify([...results, result]));
  } catch {
    // Storage blocked (private mode); the game still works, it just won't lock.
  }
}

/**
 * Consecutive days played up to and including today (or yesterday, if today isn't played yet).
 * One mode, or across all given modes (a day counts if any of them was played).
 */
export function streak(mode: GameMode | GameMode[], now = new Date()): number {
  const modes = Array.isArray(mode) ? mode : [mode];
  const played = new Set(modes.flatMap((m) => readResults(m).map((r) => r.date)));
  const day = new Date(now);
  if (!played.has(todayKey(day))) day.setDate(day.getDate() - 1);
  let n = 0;
  while (played.has(todayKey(day))) {
    n++;
    day.setDate(day.getDate() - 1);
  }
  return n;
}
