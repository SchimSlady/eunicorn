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
 * Wordle-style share text:
 *   EUnicorn #12 · Who Raised This? · Hard · 💡1
 *   🟥🟩⬜⬜ €9m raised
 *   eunicorn.eu
 * No flag emojis: they render as letters on Windows.
 */
export function shareText(opts: {
  number: number;
  modeTitle: string;
  difficulty: Difficulty;
  hintsUsed: number;
  squares: string[];
  score: number;
}): string {
  const head = [`EUnicorn #${opts.number}`, opts.modeTitle, DIFFICULTY_META[opts.difficulty].label];
  if (opts.hintsUsed) head.push(`💡${opts.hintsUsed}`); // share text, not UI. taste-skill-ignore
  return `${head.join(" · ")}\n${opts.squares.join("")} ${formatRaised(opts.score)}\neunicorn.eu`;
}
