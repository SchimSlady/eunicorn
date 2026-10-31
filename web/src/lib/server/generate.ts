import type {
  Company,
  Dataset,
  GameMode,
  GridCriterion,
  Hint,
  HigherLowerMetric,
  HigherLowerPuzzle,
  ImpostorPuzzle,
  Puzzle,
  UnicornGridPuzzle,
  WhoRaisedThisPuzzle,
} from "@eunicorn/schema";
import { formatUsdAsEur } from "../format";
import { distinctAnswers } from "../grid";

/**
 * Builds the day's puzzle from the verified Supabase dataset when no approved puzzle exists
 * for that day. Deterministic: the same date and data give the same puzzle for every player,
 * all day. Returns null when the data can't support a proper puzzle for a mode; the caller
 * then falls back to the files in /data for that mode.
 */

/** Day 1 of EUnicorn: puzzle numbers count from here. */
const FIRST_DAY = "2026-11-01";

export function generatePuzzle(mode: GameMode, date: string, data: Dataset): Puzzle | null {
  const rng = seeded(`${date}:${mode}`);
  const base = { date, number: puzzleNumber(date), hints: [] as Hint[] };
  const companies = data.companies.filter((c) => c.european);
  switch (mode) {
    case "who-raised-this":
      return whoRaisedThis(base, date, data, companies, rng);
    case "unicorn-grid":
      return unicornGrid(base, data, companies, rng);
    case "higher-lower":
      return higherLower(base, date, companies, rng);
    case "impostor":
      return impostor(base, date, companies, rng);
  }
}

type Base = { date: string; number: number; hints: Hint[] };

/* ---------- Who Raised This? ---------- */

function whoRaisedThis(base: Base, date: string, data: Dataset, companies: Company[], rng: Rng): WhoRaisedThisPuzzle | null {
  const byId = new Map(companies.map((c) => [c.id, c]));
  const investors = new Map(data.investors.map((i) => [i.id, i.name]));
  const people = new Map(data.people.map((p) => [p.id, p.name]));

  // Rounds that make a fair puzzle: a real amount and at least two named investors.
  const rounds = data.rounds.filter((r) => byId.has(r.companyId) && r.amountUsd > 0 && r.investorIds.length >= 2);
  if (!rounds.length) return null;

  // Easier companies early in the week, harder ones at the weekend.
  const answer = pickByDifficulty([...new Set(rounds.map((r) => r.companyId))].map((id) => byId.get(id)!), date, rng);
  const round = pick(
    rounds.filter((r) => r.companyId === answer.id),
    rng,
  );

  const names = shuffle(round.investorIds, rng)
    .map((id) => investors.get(id))
    .filter((n): n is string => !!n);
  const founders = answer.founderIds.map((id) => people.get(id)).filter((n): n is string => !!n);

  const clues: WhoRaisedThisPuzzle["clues"] = [
    { kind: "amount", text: `Raised ${formatUsdAsEur(round.amountUsd)} in a ${STAGE_LABEL[round.stage] ?? round.stage} round` },
    { kind: "year", text: monthYear(round.date) },
    { kind: "sector", text: answer.sectors.map(sectorLabel).join(", ") },
    { kind: "year", text: `Founded in ${answer.founded}` },
    { kind: "city", text: [answer.city, countryName(answer.country)].filter(Boolean).join(", ") },
    { kind: "investors", text: `Backed by ${list(names.slice(0, 2))}` },
  ];
  if (names.length > 2) clues.push({ kind: "investors", text: `Also: ${list(names.slice(2, 5))}` });
  if (founders.length) clues.push({ kind: "founders", text: `Founded by ${list(founders)}` });

  return {
    ...base,
    mode: "who-raised-this",
    answerCompanyId: answer.id,
    roundId: round.id,
    clues,
    hints: [
      { text: `The name has ${letters(answer.name)} letters`, cost: 1 },
      { text: `Starts with ${answer.name[0].toUpperCase()}`, cost: 2 },
      { text: `${answer.totalRaisedUsd ? `Has raised ${formatUsdAsEur(answer.totalRaisedUsd)} in total` : `Based in ${answer.city}`}`, cost: 3 },
    ],
  };
}

/* ---------- Unicorn Grid ---------- */

interface Criterion {
  c: GridCriterion;
  /** Criteria in the same group can't share a cell sensibly (e.g. two countries). */
  group: "place" | "sector" | "founded" | "investor";
  test: (co: Company) => boolean;
}

function unicornGrid(base: Base, data: Dataset, companies: Company[], rng: Rng): UnicornGridPuzzle | null {
  const pool = gridCriteria(data, companies);
  let best: { rows: Criterion[]; cols: Criterion[]; cells: string[][]; score: number } | null = null;

  // Rows are places (countries, cities) or sectors, like a classic grid; columns mix the rest.
  const sideOk = (side: Criterion[]) =>
    side.filter((p) => p.group === "founded").length <= 1 &&
    side.filter((p) => p.group === "investor").length <= 1 &&
    side.filter((p) => p.c.kind === "city").length <= 1;

  for (let attempt = 0; attempt < 40000; attempt++) {
    const rowGroup = pick(["place", "place", "sector"] as const, rng);
    const rows = pickN(pool.filter((p) => p.group === rowGroup), 3, rng);
    const cols = pickN(pool.filter((p) => p.group !== rowGroup), 3, rng);
    if (rows.length < 3 || cols.length < 3 || !sideOk(rows) || !sideOk(cols)) continue;

    const cells = rows.flatMap((r) => cols.map((col) => companies.filter((co) => r.test(co) && col.test(co)).map((co) => co.id)));
    if (cells.some((ids) => ids.length === 0)) continue;
    // The whole board must be fillable with nine different companies.
    if (!distinctAnswers(cells)) continue;

    // Prefer grids where squares have a few answers but no square takes almost anything.
    const score = cells.reduce((s, ids) => s + Math.min(ids.length, 3) - (ids.length > 6 ? 2 : 0), 0) + rng() * 0.5;
    if (!best || score > best.score) best = { rows, cols, cells, score };
  }
  if (!best) return null;

  const byId = new Map(companies.map((c) => [c.id, c]));
  // Hints point at one complete board of nine different companies, one per square.
  const plan = distinctAnswers(best.cells, undefined, (_, ids) => shuffle(ids, rng))!;
  return {
    ...base,
    mode: "unicorn-grid",
    rows: best.rows.map((r) => r.c) as UnicornGridPuzzle["rows"],
    cols: best.cols.map((c) => c.c) as UnicornGridPuzzle["cols"],
    validAnswers: best.cells,
    cellHints: plan.map((id) => {
      const one = byId.get(id)!;
      return [
        { text: `One answer: ${one.sectors.map(sectorLabel).join(", ")} from ${one.city}`, cost: 1 },
        { text: `One answer starts with ${one.name[0].toUpperCase()}`, cost: 2 },
      ];
    }),
  };
}

function gridCriteria(data: Dataset, companies: Company[]): Criterion[] {
  const out: Criterion[] = [];
  const count = (test: (c: Company) => boolean) => companies.filter(test).length;

  for (const code of unique(companies.map((c) => c.country))) {
    const test = (c: Company) => c.country === code;
    if (count(test) >= 2) out.push({ group: "place", test, c: { kind: "country", value: code, label: `${flag(code)} ${countryName(code)}` } });
  }
  for (const city of unique(companies.map((c) => c.city).filter(Boolean))) {
    const test = (c: Company) => c.city === city;
    if (count(test) >= 3) out.push({ group: "place", test, c: { kind: "city", value: city, label: city } });
  }
  for (const sector of unique(companies.flatMap((c) => c.sectors))) {
    const test = (c: Company) => c.sectors.includes(sector);
    if (count(test) >= 3) out.push({ group: "sector", test, c: { kind: "sector", value: sector, label: sectorLabel(sector) } });
  }
  for (const year of [2010, 2014, 2018]) {
    const after = (c: Company) => c.founded > year;
    const before = (c: Company) => c.founded > 0 && c.founded <= year;
    if (count(after) >= 3) out.push({ group: "founded", test: after, c: { kind: "founded-after", value: year, label: `Founded ${year + 1}+` } });
    if (count(before) >= 3) out.push({ group: "founded", test: before, c: { kind: "founded-before", value: year + 1, label: `Founded ${year} or earlier` } });
  }
  const names = new Map(data.investors.map((i) => [i.id, i.name]));
  const backed = new Map<string, Set<string>>();
  for (const r of data.rounds) for (const id of r.investorIds) (backed.get(id) ?? backed.set(id, new Set()).get(id)!).add(r.companyId);
  for (const [id, cos] of backed) {
    const test = (c: Company) => cos.has(c.id);
    if (names.has(id) && count(test) >= 3) out.push({ group: "investor", test, c: { kind: "investor", value: id, label: `Backed by ${names.get(id)}` } });
  }
  return out;
}

/* ---------- Higher or Lower ---------- */

/**
 * How far apart consecutive values are, by difficulty: a ratio band (bigger / smaller).
 * Easy: clear gaps; medium: noticeable; hard: close calls.
 */
const HL_BANDS: Record<"easy" | "medium" | "hard", [number, number]> = {
  easy: [2, Infinity],
  medium: [1.3, 2],
  hard: [1.02, 1.3],
};

/** A Higher or Lower chain whose every step lies in the band; null if the data can't make one. */
function hlChain(cs: Company[], metric: HigherLowerMetric, [lo, hi]: [number, number], rng: Rng, length = 7): Company[] | null {
  const v = (c: Company) => c[metric]!;
  const fits = (a: Company, b: Company) => {
    const r = Math.max(v(a), v(b)) / Math.min(v(a), v(b));
    return r >= lo && r < hi;
  };
  let best: Company[] = [];
  for (let attempt = 0; attempt < 200 && best.length < length; attempt++) {
    const chain = [pick(cs, rng)];
    while (chain.length < length) {
      const last = chain.at(-1)!;
      const next = shuffle(cs, rng).find((c) => !chain.includes(c) && fits(last, c));
      if (!next) break;
      chain.push(next);
    }
    if (chain.length > best.length) best = chain;
  }
  return best.length >= 5 ? best : null;
}

/** Higher or Lower: one chain per difficulty (same for everyone at that level). Web-only extra. */
export type HigherLowerVariants = Partial<Record<"easy" | "medium" | "hard", { companyIds: string[]; hints: Hint[] }>>;

function higherLower(base: Base, date: string, companies: Company[], rng: Rng): (HigherLowerPuzzle & { variants: HigherLowerVariants }) | null {
  const metrics: HigherLowerMetric[] = ["totalRaisedUsd", "lastValuationUsd"];
  // Alternate the metric by day, falling back to the other one if the data is too thin.
  const start = puzzleNumber(date) % metrics.length;
  for (const metric of [metrics[start], metrics[1 - start]]) {
    const usable = companies.filter((c) => c[metric] != null && c[metric]! > 0);
    const label = metric === "totalRaisedUsd" ? "has raised" : "was last valued at";
    const variants: HigherLowerVariants = {};
    for (const level of ["easy", "medium", "hard"] as const) {
      const chain = hlChain(usable, metric, HL_BANDS[level], rng);
      if (!chain) continue;
      const [a, b] = pickN(chain.slice(1), 2, rng);
      variants[level] = {
        companyIds: chain.map((c) => c.id),
        hints: [
          { text: `${a.name} ${label} ${formatUsdAsEur(a[metric]!)}`, cost: 1 },
          { text: `${b.name} ${label} ${formatUsdAsEur(b[metric]!)}`, cost: 1 },
        ],
      };
    }
    const main = variants.medium ?? variants.easy ?? variants.hard;
    if (!main) continue;
    return { ...base, mode: "higher-lower", metric, companyIds: main.companyIds, hints: main.hints, variants };
  }
  return null;
}

/* ---------- Impostor ---------- */

interface Group {
  members: (c: Company) => boolean;
  prompt: string;
  /** What the four have in common, for the explanation: "are German companies". */
  shared: string;
  /** What sets the impostor apart: "comes from France". */
  odd: (c: Company) => string;
}

function impostor(base: Base, date: string, companies: Company[], rng: Rng): ImpostorPuzzle | null {
  const groups: Group[] = [];
  for (const code of unique(companies.map((c) => c.country))) {
    groups.push({
      members: (c) => c.country === code,
      prompt: `All of these come from ${countryName(code)}. Except one.`,
      shared: `come from ${countryName(code)}`,
      odd: (c) => `comes from ${countryName(c.country)}`,
    });
  }
  for (const city of unique(companies.map((c) => c.city).filter(Boolean))) {
    groups.push({
      members: (c) => c.city === city,
      prompt: `All of these are based in ${city}. Except one.`,
      shared: `are based in ${city}`,
      odd: (c) => `is based in ${c.city}`,
    });
  }
  for (const sector of unique(companies.flatMap((c) => c.sectors))) {
    groups.push({
      members: (c) => c.sectors.includes(sector),
      prompt: `All of these are ${sectorPlural(sector)}. Except one.`,
      shared: `are ${sectorPlural(sector)}`,
      odd: (c) => `is ${c.sectors.map(sectorLabel).join(" and ")}`,
    });
  }
  groups.push({
    members: (c) => c.unicorn,
    prompt: "All of these are unicorns. Except one.",
    shared: "have been valued at €1bn or more",
    odd: () => "has never been valued at €1bn or more",
  });
  for (const year of [2012, 2015, 2019]) {
    groups.push({
      members: (c) => c.founded >= year,
      prompt: `All of these were founded in ${year} or later. Except one.`,
      shared: `were founded in ${year} or later`,
      odd: (c) => `was founded in ${c.founded}`,
    });
  }

  const usable = groups.filter((g) => companies.filter(g.members).length >= 4 && companies.some((c) => !g.members(c)));
  if (!usable.length) return null;
  const g = pick(usable, rng);
  const four = pickN(companies.filter(g.members), 4, rng);
  const imp = pickByDifficulty(
    companies.filter((c) => !g.members(c)),
    date,
    rng,
  );
  const ids = shuffle([...four, imp], rng).map((c) => c.id);
  const fits = four[0];

  return {
    ...base,
    mode: "impostor",
    prompt: g.prompt,
    companyIds: ids,
    impostorId: imp.id,
    explanation: `${imp.name} ${g.odd(imp)}. ${list(four.map((c) => c.name))} ${g.shared}.`,
    hints: [
      { text: `Remove one wrong option (${fits.name} fits)`, cost: 1 },
      { text: `The impostor is based in ${imp.city}, founded in ${imp.founded}`, cost: 2 },
    ],
  };
}

/* ---------- helpers ---------- */

const SECTOR_LABEL: Record<string, string> = {
  fintech: "Fintech",
  ai: "AI",
  mobility: "Mobility",
  climate: "Climate",
  health: "Health",
  defense: "Defence",
  consumer: "Consumer",
  saas: "SaaS",
  gaming: "Gaming",
  travel: "Travel",
  crypto: "Crypto",
  "quick-commerce": "Quick commerce",
  space: "Space",
  semiconductors: "Semiconductors",
  biotech: "Biotech",
  robotics: "Robotics",
  quantum: "Quantum",
  cybersecurity: "Cybersecurity",
};

const SECTOR_PLURAL: Record<string, string> = { fintech: "fintechs", saas: "SaaS companies", ai: "AI companies" };

const STAGE_LABEL: Record<string, string> = {
  "pre-seed": "pre-seed",
  seed: "seed",
  "series-a": "Series A",
  "series-b": "Series B",
  "series-c": "Series C",
  "series-d": "Series D",
  "series-e": "Series E",
  "series-f+": "Series F+",
  growth: "growth",
  secondary: "secondary",
  ipo: "IPO",
};

function sectorLabel(s: string): string {
  return SECTOR_LABEL[s] ?? s;
}

function sectorPlural(s: string): string {
  return SECTOR_PLURAL[s] ?? `${sectorLabel(s).toLowerCase()} companies`;
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryName(code: string): string {
  if (code === "GB") return "the UK";
  if (code === "NL") return "the Netherlands";
  return regionNames.of(code) ?? code;
}

function flag(code: string): string {
  return [...code.toUpperCase()].map((ch) => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65)).join("");
}

function monthYear(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(iso));
}

function list(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function letters(name: string): number {
  return name.replace(/[^\p{L}\p{N}]/gu, "").length;
}

function unique<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

export function puzzleNumber(date: string): number {
  const days = Math.round((Date.parse(date) - Date.parse(FIRST_DAY)) / 86_400_000);
  return Math.max(1, days + 1);
}

/** Target difficulty by weekday: Monday 1 (everyone knows it) to Sunday 5 (insider). */
function pickByDifficulty(cs: Company[], date: string, rng: Rng): Company {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  const target = [5, 1, 2, 2, 3, 3, 4][weekday];
  const near = cs.filter((c) => Math.abs(c.difficulty - target) <= 1);
  return pick(near.length ? near : cs, rng);
}

/* Seeded randomness, so a day's puzzle is the same on every server and every request. */

type Rng = () => number;

function seeded(key: string): Rng {
  let h = 1779033703 ^ key.length;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(xs: readonly T[], rng: Rng): T {
  return xs[Math.floor(rng() * xs.length)];
}

function shuffle<T>(xs: readonly T[], rng: Rng): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickN<T>(xs: readonly T[], n: number, rng: Rng): T[] {
  return shuffle(xs, rng).slice(0, n);
}
