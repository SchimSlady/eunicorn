import type { Company, Dataset, GameMode, Puzzle } from "@eunicorn/schema";
import { loadFilePuzzle, puzzleUrl } from "./daily";

async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url).catch(() => null);
  return res?.status === 200 ? ((await res.json()) as T) : null;
}

/**
 * Today's puzzle and the dataset it refers to, always from the same source: Supabase
 * (/api/puzzle + /api/dataset) when it has an approved puzzle for today, otherwise the files
 * synced from /data. Mixing them would break: file puzzles name companies the database lacks.
 */
export async function loadGame<P extends Puzzle>(mode: GameMode): Promise<{ puzzle: P | null; data: Dataset }> {
  const live = await fetchJson<P>(puzzleUrl(mode));
  if (live) {
    const data = await fetchJson<Dataset>("/api/dataset");
    if (data) return { puzzle: live, data };
  }
  const [puzzle, data] = await Promise.all([loadFilePuzzle<P>(mode), fetchJson<Dataset>("/data/dataset.json")]);
  return { puzzle, data: data! };
}

export function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((i) => [i.id, i]));
}

/** Lowercase, strip accents and punctuation, so "Qonto" matches "qonto" and "Dąbkowski" matches "dabkowski". */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Companies whose name matches the query: prefix matches first, then substring matches. */
export function searchCompanies(companies: Company[], query: string, limit = 6): Company[] {
  const q = normalize(query);
  if (!q) return [];
  const prefix: Company[] = [];
  const contains: Company[] = [];
  for (const c of companies) {
    const name = normalize(c.name);
    if (name.startsWith(q)) prefix.push(c);
    else if (name.includes(q)) contains.push(c);
  }
  return [...prefix, ...contains].slice(0, limit);
}
