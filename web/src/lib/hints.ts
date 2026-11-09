import type { Company, Dataset } from "@eunicorn/schema";
import { sectorLabel } from "./format";
import type { HLCompany } from "./higherLower";

/**
 * Hints (Pablo, 2026-11-02; facts reworked 2026-11-07): worked out while playing, one startup per hint,
 * getting stronger with each hint used. Three strengths, from soft to strong, each a ladder of facts
 * that help a player who hasn't recognised the company yet:
 *   0. sector and city, e.g. "Fintech · based in Berlin" (sector only in a Local game, where everyone shares the region)
 *   1. a well-known investor, a program it went through, who bought it, what the founders did before (employer, university), then (last) a founder's name
 *   2. what it does, then first letter and length, then the founding year as a last resort
 * A hint never repeats what the board already shows (the caller passes the sectors, investor and programs
 * to leave out) and never repeats a fact already given for the same company (ctx.used).
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
  /** A Local game (Munich, Berlin, Germany): every startup is from the region, so where it is based is no clue. */
  hideCity?: boolean;
  /** Programs every company of the board shares (a "YC startups" list), so they aren't a clue. */
  hidePrograms?: Set<string>;
  /** Facts (as returned, lower case) already given for this company, so none is given twice. */
  used?: Set<string>;
}

/**
 * What the founders did before, as hint texts, best known first: employers, then companies they started or
 * sold, then universities. The company's own name never counts (a founder "at Skype" for Skype).
 */
export function backgroundFacts(c: Company): string[] {
  const stations = (c as HLCompany).stations ?? [];
  const one = c.founderIds.length === 1;
  const who = one ? "the founder" : "a founder";
  const own = c.name.toLowerCase();
  const by = (k: string) => stations.filter((s) => s.kind === k && s.org.toLowerCase() !== own);
  // A company a founder both started and sold is told once, as sold.
  const sold = new Set(by("exit").map((s) => s.org));
  return [
    ...by("employer").map((s) => `${who} worked at ${s.org}`),
    ...by("founded").filter((s) => !sold.has(s.org)).map((s) => `${who} started ${s.org} before`),
    ...by("exit").map((s) => `${who} sold ${s.org} before`),
    ...by("education").map((s) => `${who} studied at ${s.org}`),
  ].map((t) => t.replace(/^./, (ch) => ch.toLowerCase()));
}

/** The facts on offer for a company, per strength, best first. */
function ladders(c: Company, ctx: HintContext): [string[], string[], string[]] {
  const soft: string[] = [];
  const sector = c.sectors.find((s) => !ctx.hideSectors?.has(s));
  if (ctx.hideCity) {
    if (sector) soft.push(`${sectorLabel(sector)} startup`);
  } else {
    soft.push(sector ? `${sectorLabel(sector)} · based in ${c.city}` : `based in ${c.city}`);
  }

  const mid: string[] = [];
  // Only investors players can know (tier 1-2), the best known first.
  const tier = new Map(ctx.data.investors.map((i) => [i.id, i]));
  const backers = [...new Set(ctx.data.rounds.filter((r) => r.companyId === c.id).flatMap((r) => r.investorIds))]
    .map((id) => tier.get(id))
    .filter((i) => i && (i.tier ?? 4) <= 2 && i.id !== ctx.hideInvestor)
    .sort((a, b) => (a!.tier ?? 4) - (b!.tier ?? 4));
  if (backers[0]) mid.push(`backed by ${backers[0].name}`);
  for (const p of c.programs ?? []) {
    if (ctx.hidePrograms?.has(p.programId)) continue;
    mid.push(p.kind === "university" ? `founded by ${p.name} alumni` : `went through ${p.name}`);
  }
  if (c.exit?.kind === "acquisition" && c.exit.acquirer) mid.push(`acquired by ${c.exit.acquirer}`);
  mid.push(...backgroundFacts(c));
  const founders = c.founderIds.map((id) => ctx.data.people.find((p) => p.id === id)?.name).filter((n): n is string => !!n);
  if (founders.length) mid.push(`${founders.length > 1 ? "co-founded" : "founded"} by ${founders[0]}`);

  const strong: string[] = [];
  const first = c.name.split(/\s+/)[0].toLowerCase();
  const tagline = c.tagline?.trim().replace(/\.$/, "");
  if (tagline && !tagline.toLowerCase().includes(first) && !tagline.toLowerCase().includes(c.name.toLowerCase())) strong.push(tagline[0].toLowerCase() + tagline.slice(1));
  strong.push(`starts with ${c.name[0].toUpperCase()} · ${letterCount(c.name)} letters`);
  strong.push(`founded in ${c.founded}`);
  return [soft, mid, strong];
}

/**
 * One fact about a company at the given strength. A strength with nothing left gives the next stronger
 * one, then the softer ones; a fact already given for this company is skipped.
 */
export function companyFact(c: Company, strength: Strength, ctx: HintContext): string {
  const all = ladders(c, ctx);
  const order = [strength, ...[0, 1, 2].filter((s) => s > strength), ...[0, 1, 2].filter((s) => s < strength).reverse()];
  for (const s of order) {
    const fact = all[s].find((f) => !ctx.used?.has(f.toLowerCase()));
    if (fact) return fact;
  }
  return all[2].at(-1)!;
}

/** Uniform random pick; hints are drawn when revealed and then saved, so they don't change on reload. */
export const pickRandom = <T,>(xs: T[]): T | undefined => xs[Math.floor(Math.random() * xs.length)];
