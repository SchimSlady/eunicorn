import type { GameMode, Hint, Puzzle } from "@eunicorn/schema";
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
  hints: Hint[];
}

export interface Top10Puzzle extends Top10Round {
  mode: "top-10";
  date: string;
  number: number;
  /** One list per level (Europe / a country / a sector or city); same for everyone at that level. */
  variants?: Partial<Record<"easy" | "medium" | "hard", Top10Round>>;
}

export type AnyPuzzle = Puzzle | Top10Puzzle | WebHigherLowerPuzzle;
