import { DIFFICULTY_META, type Difficulty } from "./difficulty";

/**
 * Points are shown as a valuation: every game runs from €0 to €1bn, and a perfect game is a
 * unicorn (a €1bn valuation, as the word means). Rounded to €10m.
 */
export function valuationM(score: number, maxScore: number): number {
  return maxScore > 0 ? Math.round((score / maxScore) * 100) * 10 : 0;
}

/** "€700m", "€1bn" */
export function formatValuation(score: number, maxScore: number): string {
  const m = valuationM(score, maxScore);
  return m >= 1000 ? "€1bn" : m === 0 ? "€0" : `€${m}m`;
}

/** A cost or gain in points as valuation: "€100m" (at least €10m, so it never reads €0m). */
export function formatPoints(points: number, maxScore: number): string {
  return `€${Math.max(10, valuationM(points, maxScore))}m`;
}

/** The stage a valuation would roughly fit: €1bn is a unicorn, below that the funding stages. */
export function verdict(score: number, maxScore: number): string {
  const m = valuationM(score, maxScore);
  if (m >= 1000) return "Unicorn 🦄";
  if (m >= 700) return "Series C";
  if (m >= 400) return "Series B";
  if (m >= 150) return "Series A";
  if (m > 0) return "Seed";
  return "Back to the garage";
}

/**
 * Share text that reads without explanation:
 *   EUnicorn #12 🦄 Who Raised This?
 *   🟥🟥🟩 Got it on guess 3 · 2 hints
 *   €500m valuation · Series B (Medium)
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
    `${formatValuation(opts.score, opts.maxScore)} valuation · ${verdict(opts.score, opts.maxScore)} (${DIFFICULTY_META[opts.difficulty].label})`,
    "eunicorn.eu",
  ].join("\n");
}
