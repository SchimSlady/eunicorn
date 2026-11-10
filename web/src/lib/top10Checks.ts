import type { Company, Dataset } from "@eunicorn/schema";
import { countryName, formatUsdAsEur, sectorLabel } from "./format";
import { REGIONS } from "./regions";
import type { Top10Check, Top10Round } from "./top10";

/**
 * What a Top 10 list asks for, as data rather than code: the server builds the list from these
 * checks, and the game uses the same checks to say why a wrong guess isn't on it ("Hamburg, not
 * Berlin", "Founded 2011, the list is 2015+"), or, when it fits, where it ranks ("No. 14").
 */
export function passes(c: Company, k: Top10Check): boolean {
  switch (k.kind) {
    case "european":
      return c.european;
    case "country":
      return c.country === k.value;
    case "city":
      return c.city === k.value;
    case "region":
      return REGIONS[k.value].test(c);
    case "sector":
      return k.values.some((s) => c.sectors.includes(s as Company["sectors"][number])) || !!k.ids?.includes(c.id);
    case "founded-from":
      return c.founded >= k.value;
    case "founded-before":
      return c.founded > 0 && c.founded < k.value;
    case "status":
      return c.status === k.value;
    case "private":
      return c.status === "private";
    case "program":
      return !!c.programs?.some((p) => p.programId === k.value);
    case "round-since":
      // Rounds aren't on the company; the list's own ranking (beyond) settles who has one. See explainMiss.
      return true;
  }
}

/** A filter from checks: every one must pass. */
export function compileChecks(checks: Top10Check[]): (c: Company) => boolean {
  return (c) => checks.every((k) => passes(c, k));
}

const STATUS: Record<Company["status"], string> = { private: "Private", acquired: "Acquired", public: "Listed", defunct: "Shut down" };
const STATUS_LIST: Record<Company["status"], string> = { private: "private", acquired: "acquired", public: "listed", defunct: "shut-down" };

/** Why a company fails one check, in a few words. */
function why(c: Company, k: Top10Check): { icon: MissIcon; text: string } {
  const sectors = c.sectors.length ? c.sectors.map(sectorLabel).join(" and ") : "No sector";
  switch (k.kind) {
    case "european":
      return { icon: "place", text: `${countryName(c.country)}, not a European startup` };
    case "country":
      return { icon: "place", text: `${countryName(c.country)}, not ${countryName(k.value)}` };
    case "city":
      return { icon: "place", text: c.country === "DE" || c.city ? `${c.city || countryName(c.country)}, not ${k.value}` : `Not in ${k.value}` };
    case "region": {
      const r = REGIONS[k.value];
      return { icon: "place", text: k.value === "germany" ? `${countryName(c.country)}, not Germany` : `${c.city || countryName(c.country)}, not ${r.label}` };
    }
    case "sector":
      return { icon: "sector", text: `${sectors}, not ${k.label ?? k.values.map(sectorLabel).join(" or ")}` };
    case "founded-from":
      return { icon: "founded", text: c.founded > 0 ? `Founded ${c.founded}, the list is ${k.value} or later` : `No founding year in our data` };
    case "founded-before":
      return { icon: "founded", text: c.founded > 0 ? `Founded ${c.founded}, the list is before ${k.value}` : `No founding year in our data` };
    case "status":
      return { icon: "status", text: `${STATUS[c.status]}, the list is ${STATUS_LIST[k.value]} startups only` };
    case "private":
      return { icon: "status", text: `${STATUS[c.status]}, so its valuation doesn't count here` };
    case "program":
      return { icon: "program", text: `Not a ${k.name} startup` };
    case "round-since":
      return { icon: "money", text: `No round ${k.label} in our data` };
  }
}

export type MissIcon = "place" | "sector" | "founded" | "status" | "program" | "money" | "rank";

/** Why a guess isn't on the list. rank: where it would be (11 and up) when it fits but has too little. */
export type MissReason = { icon: MissIcon; text: string; rank?: number };

/**
 * The reason a wrong guess isn't in the Top 10. Lists from before this existed carry no checks:
 * then only "not in this top 10".
 */
export function explainMiss(c: Company, round: Top10Round, data: Pick<Dataset, "rounds">): MissReason | null {
  const metricWord = round.metric === "lastValuationUsd" ? "valuation" : "funding";
  const at = round.beyond?.findIndex((b) => b.id === c.id) ?? -1;
  if (at >= 0) {
    const value = round.beyond![at].value;
    const what = round.values ? `a ${formatUsdAsEur(value)} round` : round.metric === "lastValuationUsd" ? `valued at ${formatUsdAsEur(value)}` : `raised ${formatUsdAsEur(value)}`;
    return { icon: "rank", rank: 11 + at, text: `Fits, but only ${what}` };
  }
  if (!round.checks) return null;
  for (const k of round.checks) {
    if (k.kind === "round-since") {
      const has = data.rounds.some((r) => r.companyId === c.id && r.date && r.date.slice(0, 7) >= k.value);
      if (!has) return why(c, k);
    } else if (!passes(c, k)) return why(c, k);
  }
  // Fits every rule but isn't ranked: no figure for it, or further down than the ranks we send.
  const v = round.values ? undefined : c[round.metric];
  if (!round.values && (v == null || v <= 0)) return { icon: "money", text: `We have no ${metricWord} figure for it` };
  if (v != null) return { icon: "rank", text: `Fits, but only ${round.metric === "lastValuationUsd" ? "valued at" : "raised"} ${formatUsdAsEur(v)}` };
  return { icon: "rank", text: "Fits, but its round was smaller" };
}
