import type { CompanyStatus, GameMode, Hint, Puzzle } from "@eunicorn/schema";
import type { Region } from "./regions";
import type { WebHigherLowerPuzzle } from "./higherLower";

/**
 * Top 10 is a web-only mode for now: it lives outside the shared contract (packages/schema)
 * until it settles, so the data side needn't change anything. PlayMode is every mode the web
 * app can run; AnyPuzzle every puzzle it can load.
 */
export type PlayMode = GameMode | "top-10";

export type Top10Metric = "lastValuationUsd" | "totalRaisedUsd";

export interface Top10Round {
  /** "The 10 most valuable startups from Germany" */
  title: string;
  metric: Top10Metric;
  /** Ranked, highest first: companyIds[0] is No. 1. */
  companyIds: string[];
  /**
   * The figure shown next to each company, in USD like the dataset, when the list ranks something
   * other than a company figure (a Local list of "the biggest rounds of 2026"). Without it the row
   * shows the company's `metric`.
   */
  values?: Record<string, number>;
  /**
   * A list of one program's startups (a Local "CDTM startups in Munich" day): the program, whose
   * official logo the game shows in the title bar. Only inside the game, never in the share text.
   */
  program?: { id: string; name: string; logo?: string };
  /** What the list asks for (lib/top10Checks.ts), so the game can say why a wrong guess isn't on it. */
  checks?: Top10Check[];
  /** Nos. 11 and on (up to 40): companies that fit the list but have too little, with their figure in USD. */
  beyond?: { id: string; value: number }[];
  hints: Hint[];
}

/** One rule of a Top 10 list, as data. A list's companies pass every one of its checks. */
export type Top10Check =
  | { kind: "european" }
  | { kind: "country"; value: string }
  | { kind: "city"; value: string }
  | { kind: "region"; value: Region }
  /** Any of these sectors; label names them together ("deep tech"). */
  | { kind: "sector"; values: string[]; label?: string }
  | { kind: "founded-from"; value: number }
  | { kind: "founded-before"; value: number }
  | { kind: "status"; value: CompanyStatus }
  /** Valuation lists of startups count private companies only. */
  | { kind: "private" }
  | { kind: "program"; value: string; name: string }
  /** A round in or after this month ("2026-01"); label: "in 2026", "in the last 12 months". */
  | { kind: "round-since"; value: string; label: string };

export interface Top10Puzzle extends Top10Round {
  mode: "top-10";
  date: string;
  number: number;
  /** One list per level (Europe / a country / a sector or city); same for everyone at that level. */
  variants?: Partial<Record<"easy" | "medium" | "hard", Top10Round>>;
}

export type AnyPuzzle = Puzzle | Top10Puzzle | WebHigherLowerPuzzle;
