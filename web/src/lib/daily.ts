import type { GameMode, Puzzle } from "@eunicorn/schema";

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

/** Consecutive days played up to and including today (or yesterday, if today isn't played yet). */
export function streak(mode: GameMode, now = new Date()): number {
  const played = new Set(readResults(mode).map((r) => r.date));
  const day = new Date(now);
  if (!played.has(todayKey(day))) day.setDate(day.getDate() - 1);
  let n = 0;
  while (played.has(todayKey(day))) {
    n++;
    day.setDate(day.getDate() - 1);
  }
  return n;
}
