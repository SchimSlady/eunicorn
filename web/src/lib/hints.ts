import type { Company, Dataset } from "@eunicorn/schema";
import { sectorLabel } from "./format";

/**
 * Hints (Pablo, 2026-11-02): worked out while playing, one startup per hint, getting stronger with
 * each hint used. Three strengths, from soft to strong:
 *   0. founding year and a sector, e.g. "founded in 2015 · Fintech"
 *   1. a founder or a well-known investor, e.g. "co-founded by Sebastian Siemiatkowski"
 *   2. first letter and length, e.g. "starts with K · 6 letters"
 * A hint never repeats what the board already shows (the caller passes the sectors and investor to leave out).
 */

export type Strength = 0 | 1 | 2;

/** Strength of hint number `i` (0-based) out of `limit`: spread evenly from soft to strong. */
export function strengthOf(i: number, limit: number): Strength {
  if (limit <= 1) return 0;
  return Math.min(2, Math.floor((i * 3) / limit)) as Strength;
}

/** Letters in a name, ignoring spaces and punctuation ("N26" counts 3, "Back Market" 10). */
const letterCount = (name: string) => name.replace(/[^\p{L}\p{N}]/gu, "").length;

export interface HintContext {
  data: Dataset;
  /** Sectors the board already shows for this answer (row/column, or shared by the whole list). */
  hideSectors?: Set<string>;
  /** An investor the board already names ("Backed by Index"), so it isn't the hint. */
  hideInvestor?: string;
}

/** One fact about a company at the given strength; falls back to the next stronger fact when data is missing. */
export function companyFact(c: Company, strength: Strength, ctx: HintContext): string {
  if (strength === 0) {
    const sector = c.sectors.find((s) => !ctx.hideSectors?.has(s));
    return `founded in ${c.founded}${sector ? ` · ${sectorLabel(sector)}` : ""}`;
  }
  if (strength === 1) {
    const founders = c.founderIds.map((id) => ctx.data.people.find((p) => p.id === id)?.name).filter((n): n is string => !!n);
    if (founders.length) return `${founders.length > 1 ? "co-founded" : "founded"} by ${founders[0]}`;
    // Only investors players can know (tier 1–2), the best known first.
    const tier = new Map(ctx.data.investors.map((i) => [i.id, i]));
    const backers = [...new Set(ctx.data.rounds.filter((r) => r.companyId === c.id).flatMap((r) => r.investorIds))]
      .map((id) => tier.get(id))
      .filter((i) => i && (i.tier ?? 4) <= 2 && i.id !== ctx.hideInvestor)
      .sort((a, b) => (a!.tier ?? 4) - (b!.tier ?? 4));
    if (backers[0]) return `backed by ${backers[0].name}`;
    return companyFact(c, 2, ctx);
  }
  return `starts with ${c.name[0].toUpperCase()} · ${letterCount(c.name)} letters`;
}

/** Uniform random pick; hints are drawn when revealed and then saved, so they don't change on reload. */
export const pickRandom = <T,>(xs: T[]): T | undefined => xs[Math.floor(Math.random() * xs.length)];
