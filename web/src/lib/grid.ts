import type { Company, Dataset, GridCriterion } from "@eunicorn/schema";
import { USD_TO_EUR } from "./format";

/**
 * Fills the open squares of a Startup Grid so that no company appears twice on the board.
 *
 * `validAnswers` is row-major (9 lists); `fixed` holds what is already placed (null = open).
 * Options are tried in the given order, so callers can prefer e.g. the best-known answer.
 * Backtracking, because filling square by square can paint itself into a corner.
 * Returns the company id per square, or null when no assignment of distinct companies exists.
 */
export function distinctAnswers(
  validAnswers: string[][],
  fixed: (string | null)[] = Array(validAnswers.length).fill(null),
  order: (cell: number, ids: string[]) => string[] = (_, ids) => ids,
): string[] | null {
  const result = fixed.map((id) => id ?? "");
  const taken = new Set(fixed.filter((id): id is string => !!id));
  // Most constrained squares first keeps the search tiny.
  const open = validAnswers
    .map((ids, cell) => ({ cell, ids: order(cell, ids) }))
    .filter(({ cell }) => !fixed[cell])
    .sort((a, b) => a.ids.length - b.ids.length);

  const place = (i: number): boolean => {
    if (i === open.length) return true;
    const { cell, ids } = open[i];
    for (const id of ids) {
      if (taken.has(id)) continue;
      taken.add(id);
      result[cell] = id;
      if (place(i + 1)) return true;
      taken.delete(id);
    }
    return false;
  };
  return place(0) ? result : null;
}

/**
 * Whether a company meets a grid heading, worked out in the browser from the dataset, so a wrong
 * guess can show which headings it meets (✓) and which not (✗). Mirrors gridCriteria in
 * lib/server/generate.ts: "Founded 2015+" is founded-after 2014, "Founded 2014 or earlier" is
 * founded-before 2015, "Valued over €5bn" compares the last valuation in euros.
 */
export function meetsCriterion(c: Company, k: GridCriterion, investorsOf: (companyId: string) => Set<string>): boolean {
  const v = k.value as unknown;
  switch (k.kind as GridCriterion["kind"] | "valuation-over") {
    case "country":
      return c.country === v;
    case "city":
      return c.city === v;
    case "sector":
      return c.sectors.includes(v as Company["sectors"][number]);
    case "unicorn":
      return c.unicorn;
    case "status":
      return c.status === v;
    case "founded-after":
      return c.founded > (v as number);
    case "founded-before":
      return c.founded > 0 && c.founded < (v as number);
    case "investor":
      return investorsOf(c.id).has(v as string);
    case "valuation-over":
      return c.lastValuationUsd != null && c.lastValuationUsd * USD_TO_EUR >= (v as number) * 1e9;
  }
  return false;
}

/** The investors of each company, from the rounds. */
export function investorIndex(data: Dataset): (companyId: string) => Set<string> {
  const by = new Map<string, Set<string>>();
  for (const r of data.rounds) for (const id of r.investorIds) (by.get(r.companyId) ?? by.set(r.companyId, new Set()).get(r.companyId)!).add(id);
  const none = new Set<string>();
  return (companyId) => by.get(companyId) ?? none;
}
