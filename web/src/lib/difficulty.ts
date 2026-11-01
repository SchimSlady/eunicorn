export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export const DIFFICULTY_META: Record<Difficulty, { label: string }> = {
  easy: { label: "Easy" },
  medium: { label: "Medium" },
  hard: { label: "Hard" },
};

/**
 * What a level changes, and the only two things it changes. The rules of every game are the same
 * at all levels.
 *
 * 1. Which companies it draws on, by the dataset's `difficulty` field (1 = everyone knows it,
 *    5 = insider). Set per company in the data; the tiers below are the one place that maps them
 *    to levels. If a tier can't build a puzzle it widens by one step until it can.
 * 2. How many hints are on offer (see hintLimit).
 */
export const FAME_TIERS: Record<Difficulty, { min: number; max: number }> = {
  easy: { min: 1, max: 2 },
  medium: { min: 1, max: 3 },
  hard: { min: 1, max: 5 },
};

/** Easy offers every hint, Medium half of them (rounded up), Hard none. */
export function hintLimit(d: Difficulty, total: number): number {
  return d === "easy" ? total : d === "medium" ? Math.ceil(total / 2) : 0;
}

const KEY = "eunicorn:difficulty";

/** The player's preferred difficulty, shared across modes. Defaults to medium. */
export function loadDifficulty(): Difficulty {
  try {
    const d = localStorage.getItem(KEY);
    return DIFFICULTIES.includes(d as Difficulty) ? (d as Difficulty) : "medium";
  } catch {
    return "medium";
  }
}

export function saveDifficulty(d: Difficulty): void {
  try {
    localStorage.setItem(KEY, d);
  } catch {
    // Storage blocked; the choice just won't be remembered.
  }
}
