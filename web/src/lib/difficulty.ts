export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export const DIFFICULTY_META: Record<Difficulty, { label: string }> = {
  easy: { label: "Easy" },
  medium: { label: "Medium" },
  hard: { label: "Hard" },
};

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
