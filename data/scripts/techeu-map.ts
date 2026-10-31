// Maps raw Tech.eu rounds to our model: equity rounds only, stage as a series letter, date as a month.
import type { RoundStage } from "../../packages/schema/src/index.ts";

export type Stage = Exclude<RoundStage, "growth" | "secondary" | "ipo">;

export interface TecheuRound {
  id: string;
  date: string | null;
  stage: string | null; // Tech.eu's bucket: "Seed", "Series A", "Series D+", "Growth/Late", "Other", "Debt", ...
  rawRoundType: string | null; // the original wording: "series g", "convertible", "funding round", ...
  amountEur: number | null;
  amountNative: number | null;
  currency: string | null;
  investors: string[];
  confidence: string | null;
  pageUrl: string;
  company: { id: string; name: string; country: string };
}

// Anything that is clearly not a priced equity round.
const NOT_EQUITY = /debt|loan|credit|grant|subsid|convertible|crowdfund|secondar|ipo|listing|spac|acquisition|bond|notes?\b|lending|facility|revenue.based/i;

/** null = not an equity round (drop it). */
export function classify(r: TecheuRound): { stage: Stage | null } | null {
  const bucket = (r.stage ?? "").toLowerCase();
  const raw = (r.rawRoundType ?? "").toLowerCase().trim();
  if (["debt", "grant", "crowdfunding"].includes(bucket) || NOT_EQUITY.test(raw)) return null;
  return { stage: stageFrom(raw) ?? stageFrom(bucket) };
}

/** Series letter from either label. Unknown stays null and is set by hand during verification. */
function stageFrom(label: string): Stage | null {
  if (/pre[- ]?seed/.test(label)) return "pre-seed";
  if (/pre[- ]?series/.test(label)) return null; // "pre-Series A": fall back to Tech.eu's bucket (Seed)
  if (/\bseed\b/.test(label)) return "seed";
  const m = label.match(/series\s*([a-z])\b/);
  if (!m) return null;
  const letter = m[1];
  if (letter === "d" && /\+/.test(label)) return null; // "Series D+" bucket: D or later, letter unknown
  if (letter >= "f") return "series-f+";
  return `series-${letter}` as Stage;
}

/** "2023-12-14" -> "2023-12-01". Tech.eu dates are often first-of-month already. */
export const toMonth = (date: string | null) => (date ? `${date.slice(0, 7)}-01` : null);
