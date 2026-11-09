import type { Company, HigherLowerMetric, HigherLowerPuzzle, Hint } from "@eunicorn/schema";
import type { Difficulty } from "./difficulty";

/**
 * Higher or Lower on the web goes beyond the shared contract (packages/schema), like Top 10 does:
 * one more metric, the biggest single funding round, derived from the rounds when the dataset is
 * loaded, and theme days ("Fintech only"). Hand-made puzzles from Supabase still use the schema type.
 */
export type HLMetric = HigherLowerMetric | "biggestRoundUsd" | "lastRoundMonth";

/** One station of a founder's background; weak sources are left out when loading. */
export type FounderStation = { kind: "employer" | "education" | "founded" | "exit"; org: string };

/** A company as the web dataset carries it: the schema fields plus the derived biggest round. */
export type HLCompany = Company & {
  /** What the founders did before: employers, universities, companies they started or sold (founder_stations, web only). */
  stations?: FounderStation[];
  biggestRoundUsd?: number;
  /** When the latest round was announced, as a month count (year × 12 + month − 1): later is higher. */
  lastRoundMonth?: number;
};

/** "2025-03-01" -> month count, the form lastRoundMonth uses. */
export function monthIndex(isoDate: string): number {
  return Number(isoDate.slice(0, 4)) * 12 + Number(isoDate.slice(5, 7)) - 1;
}

export type WebHigherLowerPuzzle = Omit<HigherLowerPuzzle, "metric"> & {
  metric: HLMetric;
  /** Theme day: the chain only has companies of this kind ("Fintech", "German startups"). */
  theme?: string;
  variants?: Partial<Record<Difficulty, { companyIds: string[]; hints: Hint[] }>>;
};

export function metricValue(c: Company, metric: HLMetric): number | undefined {
  return (c as HLCompany)[metric] ?? undefined;
}
