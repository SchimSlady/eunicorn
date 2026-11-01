import type { AnyPuzzle, PlayMode } from "@/lib/top10";

/**
 * Once a game is finished it stays finished for the day: a reload shows the result, a game in progress
 * is resumed, streaks count, and the puzzle is the same for everyone all day.
 */
export function puzzleUrl(mode: PlayMode): string {
  return `/api/puzzle/${mode}`;
}

/** Puzzles flip at 8:00 Central European Time for everyone, wherever they are. */
export const PUZZLE_TIMEZONE = "Europe/Berlin";
/** The hour (Berlin wall clock) a new day's puzzles unlock: the morning commute, not midnight. */
export const PUZZLE_START_HOUR = 8;

/** Berlin wall-clock date and time of a moment. */
function berlinClock(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: PUZZLE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

/**
 * Today's puzzle date as "YYYY-MM-DD": the Berlin date, except before 8:00, when it's still
 * yesterday's puzzle.
 */
export function todayKey(now = new Date()): string {
  const c = berlinClock(now);
  const d = new Date(Date.UTC(c.year, c.month - 1, c.day));
  if (c.hour < PUZZLE_START_HOUR) d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
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

/** Milliseconds until the next puzzle unlocks (8:00 Europe/Berlin). */
export function msUntilNextPuzzle(now = new Date()): number {
  const c = berlinClock(now);
  const elapsed = c.hour * 3600 + c.minute * 60 + c.second;
  let left = PUZZLE_START_HOUR * 3600 - elapsed;
  if (left <= 0) left += 86400;
  return left * 1000 - now.getMilliseconds();
}

/* ---------- in-progress state, so a reload doesn't reset (or re-roll) today's game ---------- */

export function loadProgress<T>(mode: PlayMode, date: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(`eunicorn:${mode}:progress:${date}`) ?? "null");
  } catch {
    return null;
  }
}

export function saveProgress<T>(mode: PlayMode, date: string, state: T): void {
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

const key = (mode: PlayMode) => `eunicorn:${mode}:results`;

function readResults(mode: PlayMode): DailyResult[] {
  try {
    return JSON.parse(localStorage.getItem(key(mode)) ?? "[]");
  } catch {
    return [];
  }
}

/** The stored result if the player already finished today's puzzle for this mode. */
export function getTodayResult(mode: PlayMode, date = todayKey()): DailyResult | null {
  return readResults(mode).find((r) => r.date === date) ?? null;
}

/** Fired on window after a result is saved, so e.g. the streak in the header updates. */
export const RESULTS_EVENT = "eunicorn:results";

export function saveResult(mode: PlayMode, result: DailyResult): void {
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
