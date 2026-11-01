import type { AnyPuzzle, PlayMode, Top10Metric, Top10Puzzle, Top10Round } from "@/lib/top10";
import type { Company, Dataset, GridCriterion, Hint, HigherLowerMetric, HigherLowerPuzzle, ImpostorPuzzle, UnicornGridPuzzle, WhoRaisedThisPuzzle } from "@eunicorn/schema";
import { DIFFICULTIES, FAME_TIERS, INVESTOR_TIER_MAX, type Difficulty } from "../difficulty";
import { formatUsdAsEur, sectorLabel } from "../format";
import { distinctAnswers } from "../grid";

/**
 * Builds the day's puzzle from the verified Supabase dataset when no approved puzzle exists
 * for that day. Deterministic: the same date and data give the same puzzle for every player,
 * all day. Returns null when the data can't support a proper puzzle for a mode; the caller
 * then falls back to the files in /data for that mode.
 *
 * One puzzle per level: the games are identical at every level, only the fame of the companies
 * differs (see FAME_TIERS in lib/difficulty.ts). Each puzzle carries its levels as `variants`.
 */

/** Day 1 of EUnicorn: puzzle numbers count from here. */
const FIRST_DAY = "2026-11-01";

export function generatePuzzle(mode: PlayMode, date: string, data: Dataset, salt?: string): AnyPuzzle | null {
  // salt (test mode only) varies the puzzle within a day; without it the day decides alone.
  const rng = seeded(salt ? `${date}:${mode}:${salt}` : `${date}:${mode}`);
  const base = { date, number: puzzleNumber(date), hints: [] as Hint[] };
  const companies = data.companies.filter((c) => c.european);
  switch (mode) {
    case "who-raised-this":
      return whoRaisedThis(base, data, companies, rng);
    case "unicorn-grid":
      return unicornGrid(base, data, companies, rng);
    case "higher-lower":
      return higherLower(base, date, companies, rng);
    case "impostor":
      return impostor(base, companies, rng);
    case "top-10":
      return top10(base, date, companies, rng);
  }
}

/* ---------- Top 10 ---------- */

/**
 * Name the ten biggest: by last valuation or total raised (alternating by day), and per level a
 * wider or narrower field: Easy all of Europe or a big country, Medium adds other countries and
 * big sectors, Hard adds smaller sectors and cities.
 * A field needs at least 12 companies with the number, and no tie between No. 10 and No. 11.
 */
function top10(base: Base, date: string, companies: Company[], rng: Rng): Top10Puzzle | null {
  const metrics: Top10Metric[] = ["lastValuationUsd", "totalRaisedUsd"];
  const first = puzzleNumber(date) % 2;
  for (const metric of [metrics[first], metrics[1 - first]]) {
    const has = companies.filter((c) => c[metric] != null && c[metric]! > 0);
    const ranked = (cs: Company[]) => [...cs].sort((a, b) => b[metric]! - a[metric]!);
    const ok = (cs: Company[]) => {
      const r = ranked(cs);
      return r.length >= 12 && r[9][metric]! > r[10][metric]!;
    };
    type Field = { scope: string; adjective?: string; cs: Company[] };
    const countries: Field[] = unique(has.map((c) => c.country)).map((code) => ({ scope: `from ${countryName(code)}`, cs: has.filter((c) => c.country === code) }));
    const sectors: Field[] = unique(has.flatMap((c) => c.sectors)).map((sec) => ({ scope: "", adjective: sectorAdjective(sec), cs: has.filter((c) => c.sectors.includes(sec)) }));
    const cities: Field[] = unique(has.map((c) => c.city).filter(Boolean)).map((city) => ({ scope: `in ${city}`, cs: has.filter((c) => c.city === city) }));
    // Easy: the widest, best-known fields; Medium adds other countries and the biggest sectors;
    // Hard adds smaller sectors and cities.
    const bySize = (fs: Field[]) => fs.filter((f) => ok(f.cs)).sort((a, b) => b.cs.length - a.cs.length);
    const bigCountries = bySize(countries).slice(0, 3);
    const bigSectors = bySize(sectors).slice(0, 3);
    const easy: Field[] = [
      { scope: "in Europe", cs: has },
      { scope: "in Europe founded since 2015", cs: has.filter((c) => c.founded >= 2015) },
      ...bigCountries,
    ].filter((f) => ok(f.cs));
    const medium = [...bySize(countries).slice(3), ...bigSectors];
    const hard = [...bySize(sectors).slice(3), ...bySize(cities)];
    // Each level adds harder fields to the easier ones, like the company tiers.
    const fields: Record<Difficulty, Field[]> = { easy, medium: [...easy, ...medium], hard: [...easy, ...medium, ...hard] };
    if (!ok(has)) continue;

    const variants: Partial<Record<Difficulty, Top10Round>> = {};
    for (const level of DIFFICULTIES) {
      const pool = fields[level].length ? fields[level] : fields.medium.length ? fields.medium : fields.easy;
      const f = pick(pool, rng);
      const top = ranked(f.cs).slice(0, 10);
      const who = f.adjective ? `${f.adjective} startups` : "startups";
      const title =
        metric === "lastValuationUsd" ? `The 10 most valuable ${who}${f.scope ? ` ${f.scope}` : ""}` : `The 10 ${who}${f.scope ? ` ${f.scope}` : ""} that raised the most`;
      const k = 3 + Math.floor(rng() * 4); // a middle rank, 4 to 7
      variants[level] = {
        title,
        metric,
        companyIds: top.map((c) => c.id),
        hints: [
          { text: `No. 1 starts with ${top[0].name[0].toUpperCase()}`, cost: 1 },
          { text: `No. ${k + 1} is based in ${top[k].city}`, cost: 1 },
          { text: `No. 10 ${metric === "lastValuationUsd" ? "was last valued at" : "has raised"} ${formatUsdAsEur(top[9][metric]!)}`, cost: 1 },
        ],
      };
    }
    const main = variants.medium ?? variants.easy!;
    return { ...base, mode: "top-10", ...main, variants };
  }
  return null;
}

/** "AI", "SaaS" stay as they are; "Fintech" -> "fintech" mid-sentence. */
function sectorAdjective(s: string): string {
  const l = sectorLabel(s);
  return /^[A-Z]{2,}|^SaaS$/.test(l) ? l : l.toLowerCase();
}

type Base = { date: string; number: number; hints: Hint[] };

/** The companies of a level's fame tier and the tier itself. */
type Tier = { min: number; max: number };

/**
 * Builds a puzzle for one level from the companies of its fame tier. If the tier is too thin to
 * build one, it widens a step (Easy towards harder, Hard towards easier, Medium both ways) and tries again.
 */
function forLevel<T>(level: Difficulty, companies: Company[], build: (pool: Company[], tier: Tier) => T | null): T | null {
  let { min, max } = FAME_TIERS[level];
  for (let step = 0; step < 5; step++) {
    const pool = companies.filter((c) => c.difficulty >= min && c.difficulty <= max);
    const built = pool.length ? build(pool, { min, max }) : null;
    if (built) return built;
    if (level !== "hard") max = Math.min(5, max + 1);
    if (level !== "easy") min = Math.max(1, min - 1);
  }
  return null;
}

/** The medium puzzle stands for the whole thing (hand-made puzzles have no levels); else any level. */
const mainOf = <T>(v: Partial<Record<Difficulty, T>>): T | undefined => v.medium ?? v.easy ?? v.hard;

/* ---------- Who Raised This? ---------- */

export type WhoRaisedThisVariants = Partial<
  Record<Difficulty, Pick<WhoRaisedThisPuzzle, "answerCompanyId" | "roundId" | "clues" | "hints">>
>;

function whoRaisedThis(
  base: Base,
  data: Dataset,
  companies: Company[],
  rng: Rng,
): (WhoRaisedThisPuzzle & { variants: WhoRaisedThisVariants }) | null {
  const byId = new Map(companies.map((c) => [c.id, c]));
  const investors = new Map(data.investors.map((i) => [i.id, i.name]));
  const people = new Map(data.people.map((p) => [p.id, p.name]));

  // Rounds that make a fair puzzle: a real amount and at least two named investors.
  const rounds = data.rounds.filter((r) => byId.has(r.companyId) && r.amountUsd > 0 && r.investorIds.length >= 2);
  if (!rounds.length) return null;

  const variants: WhoRaisedThisVariants = {};
  for (const level of DIFFICULTIES) {
    const built = forLevel(level, companies, (pool) => {
      const inPool = new Set(pool.map((c) => c.id));
      const options = unique(rounds.filter((r) => inPool.has(r.companyId)).map((r) => r.companyId));
      if (!options.length) return null;
      const answer = byId.get(pick(options, rng))!;
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
        answerCompanyId: answer.id,
        roundId: round.id,
        clues,
        hints: [
          { text: `The name has ${letters(answer.name)} letters`, cost: 1 },
          { text: `Starts with ${answer.name[0].toUpperCase()}`, cost: 2 },
          { text: `${answer.totalRaisedUsd ? `Has raised ${formatUsdAsEur(answer.totalRaisedUsd)} in total` : `Based in ${answer.city}`}`, cost: 3 },
        ],
      };
    });
    if (built) variants[level] = built;
  }
  const main = mainOf(variants);
  return main ? { ...base, mode: "who-raised-this", ...main, variants } : null;
}

/* ---------- Unicorn Grid ---------- */

interface Criterion {
  c: GridCriterion;
  /** Criteria in the same group can't share a cell sensibly (e.g. two countries). */
  group: "place" | "sector" | "founded" | "investor";
  test: (co: Company) => boolean;
  /** Investors only: 1 = top global VCs ... 4 = everyone else (investors.tier). */
  tier?: number;
}

export type UnicornGridVariants = Partial<Record<Difficulty, Pick<UnicornGridPuzzle, "rows" | "cols" | "validAnswers" | "cellHints">>>;

function unicornGrid(
  base: Base,
  data: Dataset,
  companies: Company[],
  rng: Rng,
): (UnicornGridPuzzle & { variants: UnicornGridVariants }) | null {
  const criteria = gridCriteria(data, companies);
  const members = new Map(criteria.map((k) => [k, new Set(companies.filter(k.test).map((c) => c.id))]));
  // The companies two criteria share, worked out once however often a search comes back to the pair.
  const meetings = new Map<Criterion, Map<Criterion, string[]>>();
  const meet = (a: Criterion, b: Criterion): string[] => {
    let row = meetings.get(a);
    if (!row) meetings.set(a, (row = new Map()));
    let shared = row.get(b);
    if (!shared) {
      const [small, big] = members.get(a)!.size <= members.get(b)!.size ? [members.get(a)!, members.get(b)!] : [members.get(b)!, members.get(a)!];
      row.set(b, (shared = [...small].filter((id) => big.has(id))));
    }
    return shared;
  };
  const byId = new Map(companies.map((c) => [c.id, c]));

  const variants: UnicornGridVariants = {};
  for (const level of DIFFICULTIES) {
    // Investor squares only with investors players can know (tier 1 and 2), at every level.
    const allowed = criteria.filter((k) => k.group !== "investor" || (k.tier ?? 4) <= INVESTOR_TIER_MAX);
    const built = forLevel(level, companies, (pool, tier) => gridFor(allowed, meet, byId, new Set(pool.map((c) => c.id)), tier, rng));
    if (built) variants[level] = built;
  }
  const main = mainOf(variants);
  return main ? { ...base, mode: "unicorn-grid", ...main, variants } : null;
}

/**
 * One grid for a level. Any company that fits a square is accepted from the player, but every
 * square must have an answer from the level's fame tier, and the whole board must be fillable
 * with nine different tier companies, so the hints (which point at tier companies) always work.
 */
function gridFor(
  criteria: Criterion[],
  meet: (a: Criterion, b: Criterion) => string[],
  byId: Map<string, Company>,
  known: Set<string>,
  tier: Tier,
  rng: Rng,
): Pick<UnicornGridPuzzle, "rows" | "cols" | "validAnswers" | "cellHints"> | null {
  let best: { rows: Criterion[]; cols: Criterion[]; cells: string[][]; solvable: string[][]; score: number } | null = null;

  // Rows are places (countries, cities) or sectors, like a classic grid; columns mix the rest.
  const sideOk = (side: Criterion[]) =>
    side.filter((p) => p.group === "founded").length <= 1 &&
    side.filter((p) => p.group === "investor").length <= 1 &&
    side.filter((p) => p.c.kind === "city").length <= 1;

  // Rows come from one group, columns from the others; the pools are made once, not per attempt.
  const places = criteria.filter((p) => p.group === "place");
  const sectors = criteria.filter((p) => p.group === "sector");
  const pools = {
    place: { rows: places, cols: criteria.filter((p) => p.group !== "place") },
    sector: { rows: sectors, cols: criteria.filter((p) => p.group !== "sector") },
  };

  // Valid grids are rare: search a lot, but stop once there are enough candidates to pick the best of.
  let found = 0;
  for (let attempt = 0; attempt < 40000 && found < 15; attempt++) {
    const pool = pools[pick(["place", "place", "sector"] as const, rng)];
    const rows = pick3(pool.rows, rng);
    const cols = pick3(pool.cols, rng);
    if (!rows || !cols || !sideOk(rows) || !sideOk(cols)) continue;

    const cells: string[][] = [];
    const solvable: string[][] = [];
    for (const r of rows) {
      for (const col of cols) {
        const there = meet(r, col);
        const inTier = there.filter((id) => known.has(id));
        if (!inTier.length) break;
        cells.push(there);
        solvable.push(inTier);
      }
    }
    if (cells.length < 9) continue;
    // The whole board must be fillable with nine different tier companies.
    if (!distinctAnswers(solvable)) continue;
    found++;

    // Prefer squares with a few tier answers; no square should take almost anything. Companies
    // better known than the tier make a square easier than the level promises: count against it.
    const score =
      cells.reduce(
        (s, ids, i) =>
          s + Math.min(solvable[i].length, 3) - (ids.length > 6 ? 2 : 0) - 0.25 * ids.filter((id) => byId.get(id)!.difficulty < tier.min).length,
        0,
      ) + rng() * 0.5;
    if (!best || score > best.score) best = { rows, cols, cells, solvable, score };
  }
  if (!best) return null;

  // Hints point at one complete board of nine different tier companies, one per square.
  const plan = distinctAnswers(best.solvable, undefined, (_, ids) => shuffle(ids, rng))!;
  return {
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

/**
 * An investor's tier when the data has none (an older database, or the seed files): the more of
 * our companies it backed, the better known it is.
 */
function investorTier(backedCompanies: number): number {
  return backedCompanies >= 14 ? 1 : backedCompanies >= 8 ? 2 : backedCompanies >= 4 ? 3 : 4;
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
  const set = new Map(data.investors.map((i) => [i.id, (i as { tier?: number }).tier]));
  const backed = new Map<string, Set<string>>();
  for (const r of data.rounds) for (const id of r.investorIds) (backed.get(id) ?? backed.set(id, new Set()).get(id)!).add(r.companyId);
  for (const [id, cos] of backed) {
    const test = (c: Company) => cos.has(c.id);
    if (names.has(id) && count(test) >= 3)
      out.push({ group: "investor", test, tier: set.get(id) ?? investorTier(cos.size), c: { kind: "investor", value: id, label: `Backed by ${names.get(id)}` } });
  }
  return out;
}

/* ---------- Higher or Lower ---------- */

/** Consecutive values are at least this far apart (bigger / smaller): no coin flips on estimated figures. */
const HL_MIN_GAP = 1.3;

/** A Higher or Lower chain whose every step is a clear gap; null if the data can't make one. */
/** At most 15 rounds (16 companies); a thinner tier gets a shorter chain. */
function hlChain(cs: Company[], metric: HigherLowerMetric, rng: Rng, length = 16): Company[] | null {
  const v = (c: Company) => c[metric]!;
  const fits = (a: Company, b: Company) => Math.max(v(a), v(b)) / Math.min(v(a), v(b)) >= HL_MIN_GAP;
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

/** Higher or Lower: one chain per level. Web-only extra. */
export type HigherLowerVariants = Partial<Record<Difficulty, { companyIds: string[]; hints: Hint[] }>>;

function higherLower(base: Base, date: string, companies: Company[], rng: Rng): (HigherLowerPuzzle & { variants: HigherLowerVariants }) | null {
  const metrics: HigherLowerMetric[] = ["totalRaisedUsd", "lastValuationUsd"];
  // Alternate the metric by day, falling back to the other one if the data is too thin.
  const start = puzzleNumber(date) % metrics.length;
  for (const metric of [metrics[start], metrics[1 - start]]) {
    const usable = companies.filter((c) => c[metric] != null && c[metric]! > 0);
    const label = metric === "totalRaisedUsd" ? "has raised" : "was last valued at";
    const variants: HigherLowerVariants = {};
    for (const level of DIFFICULTIES) {
      const built = forLevel(level, usable, (pool) => {
        const chain = hlChain(pool, metric, rng);
        if (!chain) return null;
        const [a, b] = pickN(chain.slice(1), 2, rng);
        return {
          companyIds: chain.map((c) => c.id),
          hints: [
            { text: `${a.name} ${label} ${formatUsdAsEur(a[metric]!)}`, cost: 1 },
            { text: `${b.name} ${label} ${formatUsdAsEur(b[metric]!)}`, cost: 1 },
          ],
        };
      });
      if (built) variants[level] = built;
    }
    const main = mainOf(variants);
    if (!main) continue;
    return { ...base, mode: "higher-lower", metric, companyIds: main.companyIds, hints: main.hints, variants };
  }
  return null;
}

/* ---------- Impostor ---------- */

interface Group {
  members: (c: Company) => boolean;
  /** The sentence before "Except two.": "All of these come from Germany". */
  prompt: string;
  /** What the others have in common, for the explanation: "are German companies". */
  shared: string;
  /** What sets the impostor apart: "comes from France". */
  odd: (c: Company) => string;
}

/** Companies per puzzle: one impostor among five that fit. */
const IMPOSTOR_OPTIONS = 6;

/** `impostorIds` lists every company that doesn't belong (usually one, sometimes two or three); `impostorId` is the first. */
export type ImpostorVariants = Partial<
  Record<Difficulty, Pick<ImpostorPuzzle, "prompt" | "companyIds" | "impostorId" | "explanation" | "hints"> & { impostorIds: string[] }>
>;

/** How many impostors: mostly one, now and then two or three. */
function impostorCount(rng: Rng): number {
  const r = rng();
  return r < 0.6 ? 1 : r < 0.9 ? 2 : 3;
}
const COUNT_WORD = ["", "one", "two", "three"];

function impostor(base: Base, companies: Company[], rng: Rng): (ImpostorPuzzle & { variants: ImpostorVariants }) | null {
  const groups: Group[] = [];
  for (const code of unique(companies.map((c) => c.country))) {
    groups.push({
      members: (c) => c.country === code,
      prompt: `All of these come from ${countryName(code)}`,
      shared: `come from ${countryName(code)}`,
      odd: (c) => `comes from ${countryName(c.country)}`,
    });
  }
  for (const city of unique(companies.map((c) => c.city).filter(Boolean))) {
    groups.push({
      members: (c) => c.city === city,
      prompt: `All of these are based in ${city}`,
      shared: `are based in ${city}`,
      odd: (c) => `is based in ${c.city}`,
    });
  }
  for (const sector of unique(companies.flatMap((c) => c.sectors))) {
    groups.push({
      members: (c) => c.sectors.includes(sector),
      prompt: `All of these are ${sectorPlural(sector)}`,
      shared: `are ${sectorPlural(sector)}`,
      odd: (c) => `is ${c.sectors.map(sectorLabel).join(" and ")}`,
    });
  }
  groups.push({
    members: (c) => c.unicorn,
    prompt: "All of these are unicorns",
    shared: "have been valued at €1bn or more",
    odd: () => "has never been valued at €1bn or more",
  });
  for (const year of [2012, 2015, 2019]) {
    groups.push({
      members: (c) => c.founded >= year,
      prompt: `All of these were founded in ${year} or later`,
      shared: `were founded in ${year} or later`,
      odd: (c) => `was founded in ${c.founded}`,
    });
  }

  const variants: ImpostorVariants = {};
  for (const level of DIFFICULTIES) {
    const built = forLevel(level, companies, (pool) => {
      // A category of the day for this level: enough members in the tier, and someone who doesn't belong.
      const n = impostorCount(rng);
      for (const g of shuffle(groups, rng)) {
        const fits = pool.filter(g.members);
        if (fits.length < IMPOSTOR_OPTIONS - n) continue;
        // The impostors are from the tier too; a category the whole tier shares (e.g. all unicorns) takes anyone else.
        const inTier = pool.filter((c) => !g.members(c));
        const outsiders = inTier.length >= n ? inTier : companies.filter((c) => !g.members(c));
        if (outsiders.length < n) continue;
        const fit = pickN(fits, IMPOSTOR_OPTIONS - n, rng);
        const imps = pickN(outsiders, n, rng);
        const first = imps[0];
        return {
          prompt: `${g.prompt}. Except ${COUNT_WORD[n]}.`,
          companyIds: shuffle([...fit, ...imps], rng).map((c) => c.id),
          impostorId: first.id,
          impostorIds: imps.map((c) => c.id),
          explanation: `${list(imps.map((c) => `${c.name} ${g.odd(c)}`))}. ${list(fit.map((c) => c.name))} ${g.shared}.`,
          hints: [
            { text: `Remove one wrong option (${fit[0].name} fits)`, cost: 1 },
            { text: `${n === 1 ? "The impostor is" : "One impostor is"} based in ${first.city}, founded in ${first.founded}`, cost: 2 },
          ],
        };
      }
      return null;
    });
    if (built) variants[level] = built;
  }
  const main = mainOf(variants);
  return main ? { ...base, mode: "impostor", ...main, variants } : null;
}

/* ---------- helpers ---------- */

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

/** Three different items without shuffling the whole list (hot loop). */
function pick3<T>(xs: readonly T[], rng: Rng): T[] | null {
  if (xs.length < 3) return null;
  const a = Math.floor(rng() * xs.length);
  let b = Math.floor(rng() * xs.length);
  while (b === a) b = Math.floor(rng() * xs.length);
  let c = Math.floor(rng() * xs.length);
  while (c === a || c === b) c = Math.floor(rng() * xs.length);
  return [xs[a], xs[b], xs[c]];
}

function pickN<T>(xs: readonly T[], n: number, rng: Rng): T[] {
  return shuffle(xs, rng).slice(0, n);
}
