import type { AnyPuzzle, PlayMode } from "@/lib/top10";
import type { Region, Slot } from "@/lib/regions";

/**
 * Once a game is finished it stays finished for the day: a reload shows the result, a game in progress
 * is resumed, streaks count, and the puzzle is the same for everyone all day.
 */
export function puzzleUrl(mode: PlayMode, region?: Region): string {
  return `/api/puzzle/${mode}${region ? `?region=${region}` : ""}`;
}

/** Puzzles flip at midnight Central European Time for everyone, wherever they are. */
export const PUZZLE_TIMEZONE = "Europe/Berlin";

/** Today's puzzle date as "YYYY-MM-DD" in CET/CEST. */
export function todayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: PUZZLE_TIMEZONE }).format(now);
}

export async function loadPuzzle<P extends AnyPuzzle>(mode: PlayMode, date = todayKey()): Promise<P | null> {
  const res = await fetch(`/data/puzzles/${date}/${mode}.json`);
  return res.ok ? ((await res.json()) as P) : null;
}

/** Until the data side publishes a daily schedule, fall back to the fixture day. */
const FIXTURE_DATE = "2026-11-01";

/** Today's puzzle from the files in /data, or the fixture day when today has none. */
export async function loadFilePuzzle<P extends AnyPuzzle>(mode: PlayMode): Promise<P | null> {
  return (await loadPuzzle<P>(mode)) ?? (await loadPuzzle<P>(mode, FIXTURE_DATE));
}

/** Today's puzzle from wherever it lives (Supabase first), e.g. to read its date on the home page. */
export async function loadTodayPuzzle<P extends AnyPuzzle>(mode: PlayMode): Promise<P | null> {
  const live = await fetch(puzzleUrl(mode)).catch(() => null);
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

/* Progress and results are stored per slot: the mode, or mode@region for a Local game (see lib/regions.ts). */

/* ---------- in-progress state, so a reload doesn't reset (or re-roll) today's game ---------- */

/**
 * The day's saved progress. With `puzzle`, it only counts if it was made on that same puzzle: a game
 * started on a board that has since changed (data loaded during the day, before puzzles were frozen)
 * starts afresh instead of laying old hints and answers onto a new board. Progress saved before this
 * check carries no fingerprint and is kept.
 */
export function loadProgress<T>(mode: Slot, date: string, puzzle?: unknown): T | null {
  try {
    const key = `eunicorn:${mode}:progress:${date}`;
    const printKey = `eunicorn:${mode}:puzzle:${date}`;
    if (puzzle !== undefined) {
      const print = fingerprint(puzzle);
      const saved = localStorage.getItem(printKey);
      if (saved && saved !== print) localStorage.removeItem(key);
      localStorage.setItem(printKey, print);
    }
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

/** A short hash of a puzzle (its JSON), to tell whether saved progress belongs to it. */
export function fingerprint(puzzle: unknown): string {
  const text = JSON.stringify(puzzle);
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function saveProgress<T>(mode: Slot, date: string, state: T): void {
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

const key = (mode: Slot) => `eunicorn:${mode}:results`;

function readResults(mode: Slot): DailyResult[] {
  try {
    return JSON.parse(localStorage.getItem(key(mode)) ?? "[]");
  } catch {
    return [];
  }
}

/** The stored result if the player already finished today's puzzle for this mode. */
export function getTodayResult(mode: Slot, date = todayKey()): DailyResult | null {
  return readResults(mode).find((r) => r.date === date) ?? null;
}

/** Fired on window after a result is saved, so e.g. the streak in the header updates. */
export const RESULTS_EVENT = "eunicorn:results";

export function saveResult(mode: Slot, result: DailyResult): void {
  const results = readResults(mode).filter((r) => r.date !== result.date);
  try {
    localStorage.setItem(key(mode), JSON.stringify([...results, result]));
  } catch {
    // Storage blocked (private mode); the game still works, it just won't lock.
  }
  window.dispatchEvent(new Event(RESULTS_EVENT));
}

/**
 * Consecutive days played up to and including today (or yesterday, if today isn't played yet).
 * One mode, or across all given modes (a day counts if any of them was played).
 */
export function streak(mode: PlayMode | PlayMode[], now = new Date()): number {
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
