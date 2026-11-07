import type { Company, Dataset, Investor, Round } from "@eunicorn/schema";

/**
 * What the company overview shows (Pablo, 2026-11-07): who founded it, its best-known backers,
 * and the money in one row. Everything comes from the dataset the game already loaded.
 */
export interface Overview {
  founders: string[];
  /** The 1–2 best-known investors: lowest tier first, then the one in most of its rounds. */
  investors: Investor[];
  totalRaisedUsd?: number;
  latestRound?: Round;
}

const STAGE_LABEL: Record<string, string> = {
  "pre-seed": "Pre-seed",
  seed: "Seed",
  "series-a": "Series A",
  "series-b": "Series B",
  "series-c": "Series C",
  "series-d": "Series D",
  "series-e": "Series E",
  "series-f+": "Series F+",
};

export function stageLabel(stage: string): string {
  return STAGE_LABEL[stage] ?? stage;
}

/** "2025-08-01" -> "Aug 2025". */
export function roundMonth(date: string): string {
  const [y, m] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(Date.UTC(y, (m || 1) - 1, 1));
}

export function overviewOf(company: Company, data: Dataset): Overview {
  const rounds = data.rounds.filter((r) => r.companyId === company.id).sort((a, b) => b.date.localeCompare(a.date));
  const backed = new Map<string, number>();
  for (const r of rounds) for (const id of r.investorIds) backed.set(id, (backed.get(id) ?? 0) + 1);
  const byId = new Map(data.investors.map((i) => [i.id, i]));
  const investors = [...backed.keys()]
    .map((id) => byId.get(id))
    .filter((i): i is Investor => !!i)
    .sort((a, b) => (a.tier ?? 5) - (b.tier ?? 5) || (backed.get(b.id) ?? 0) - (backed.get(a.id) ?? 0))
    .slice(0, 2);
  const founders = company.founderIds
    .map((id) => data.people.find((p) => p.id === id)?.name)
    .filter((n): n is string => !!n);
  return { founders, investors, totalRaisedUsd: company.totalRaisedUsd, latestRound: rounds[0] };
}
