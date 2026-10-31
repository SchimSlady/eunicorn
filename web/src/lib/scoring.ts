import { DIFFICULTY_META, type Difficulty } from "./difficulty";

/** Points are shown as money raised: 8 points = "€8m raised". */
export function formatRaised(score: number): string {
  return `€${score}m raised`;
}

/** Slightly ironic, insider-flavoured verdict for the result screen. */
export function verdict(score: number, maxScore: number): string {
  if (score >= maxScore) return "Unicorn status";
  const ratio = score / maxScore;
  if (ratio >= 0.7) return "Series A material";
  if (ratio >= 0.4) return "Seed stage";
  if (score > 0) return "Pre-seed vibes";
  return "Back to the garage";
}

/**
 * Share text that reads without explanation:
 *   EUnicorn #12 🦄 Who Raised This?
 *   🟥🟥🟩 Got it on guess 3 · 2 hints
 *   €5m of €10m raised (Medium)
 *   eunicorn.eu
 * Squares only for what was played (no empty ones), except the grid, which is its own shape:
 * its rows go on their own lines above the summary. No flag emojis (letters on Windows).
 */
export function shareText(opts: {
  number: number;
  modeTitle: string;
  difficulty: Difficulty;
  hintsUsed: number;
  /** One per guess/round; a "\n" inside starts a new row (Unicorn Grid). */
  squares: string[];
  /** Plain words: "Got it on guess 3", "4 of 6 right". */
  summary: string;
  score: number;
  maxScore: number;
}): string {
  const squares = opts.squares.join("");
  const hints = opts.hintsUsed ? ` · ${opts.hintsUsed} ${opts.hintsUsed === 1 ? "hint" : "hints"}` : "";
  const result = squares.includes("\n") ? `${squares}\n${opts.summary}${hints}` : `${squares} ${opts.summary}${hints}`;
  return [
    `EUnicorn #${opts.number} 🦄 ${opts.modeTitle}`, // share text, not UI. taste-skill-ignore
    result,
    `€${opts.score}m of €${opts.maxScore}m raised (${DIFFICULTY_META[opts.difficulty].label})`,
    "eunicorn.eu",
  ].join("\n");
}
