import type { Company, Dataset, GridCriterion } from "@eunicorn/schema";
import { USD_TO_EUR, countryName, formatUsdAsEur, sectorLabel } from "./format";

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

type ReasonIcon = "place" | "sector" | "founded" | "unicorn" | "status" | "investor" | "money" | "taken";

const STATUS_WORD: Record<Company["status"], string> = { private: "Private", acquired: "Acquired", public: "Listed", defunct: "Shut down" };
const label = (k: GridCriterion) => k.label.replace(/\p{Regional_Indicator}/gu, "").trim();
const orJoin = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} or ${xs.at(-1)}`);
const group = (kind: string) => (kind === "country" || kind === "city" ? "place" : kind.startsWith("founded") ? "founded" : kind);

/** What a company is for one kind of heading ("Germany", "Fintech and SaaS", "Founded 2013"). */
function valueFor(c: Company, kind: string): { icon: ReasonIcon; text: string } {
  switch (group(kind)) {
    case "place":
      return { icon: "place", text: kind === "city" ? c.city || countryName(c.country) : countryName(c.country) };
    case "sector":
      return { icon: "sector", text: c.sectors.length ? c.sectors.map(sectorLabel).join(" and ") : "No sector" };
    case "founded":
      return { icon: "founded", text: c.founded > 0 ? `Founded ${c.founded}` : "Founding year unknown" };
    case "unicorn":
      return { icon: "unicorn", text: "Never a unicorn" };
    case "status":
      return { icon: "status", text: STATUS_WORD[c.status] };
    case "valuation-over":
      return { icon: "money", text: c.lastValuationUsd ? `Valued at ${formatUsdAsEur(c.lastValuationUsd)}` : "No valuation known" };
    default:
      return { icon: "investor", text: "Not backed by them" };
  }
}

/**
 * Why a company fits no open square, in one short line for the toast. One side of the board it meets
 * none of: "Germany, not Sweden, France or UK" when that side is one kind of heading, otherwise what
 * the company is for each ("Mobility and Travel · Founded 2013 · Not backed by Index Ventures").
 * A company that fits a square already filled: "Fits Sweden × Health, but that square is taken".
 */
export function gridMissReason(
  c: Company,
  rows: GridCriterion[],
  cols: GridCriterion[],
  investorsOf: (companyId: string) => Set<string>,
  takenSquare?: string,
): { icon: ReasonIcon; text: string } {
  if (takenSquare) return { icon: "taken", text: `Fits ${takenSquare}, but that square is taken` };
  const rowsMet = rows.some((k) => meetsCriterion(c, k, investorsOf));
  const colsMet = cols.some((k) => meetsCriterion(c, k, investorsOf));
  const side = !rowsMet ? rows : !colsMet ? cols : null;
  if (!side) return { icon: "taken", text: "Fits no open square" };
  const groups = [...new Set(side.map((k) => group(k.kind)))];
  if (groups.length === 1) {
    if (groups[0] === "investor") return { icon: "investor", text: `Not backed by ${orJoin(side.map((k) => label(k).replace(/^Backed by /, "")))}` };
    const v = valueFor(c, side[0].kind);
    return { icon: v.icon, text: `${v.text}, not ${orJoin(side.map(label))}` };
  }
  const parts = groups.map((g) => {
    if (g === "investor") return { icon: "investor" as const, text: `Not backed by ${orJoin(side.filter((k) => k.kind === "investor").map((k) => label(k).replace(/^Backed by /, "")))}` };
    return valueFor(c, side.find((k) => group(k.kind) === g)!.kind);
  });
  return { icon: parts[0].icon, text: parts.map((p) => p.text).join(" · ") };
}
