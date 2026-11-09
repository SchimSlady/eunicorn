import type { AnyPuzzle, PlayMode, Top10Check, Top10Metric, Top10Puzzle, Top10Round } from "@/lib/top10";
import { compileChecks } from "../top10Checks";
import type { Company, Dataset, GridCriterion, Hint, ImpostorPuzzle, UnicornGridPuzzle, WhoRaisedThisPuzzle } from "@eunicorn/schema";
import { CATEGORY_LEVEL_MAX, DIFFICULTIES, FAME_TIERS, INVESTOR_TIER_MAX, type Difficulty } from "../difficulty";
import { USD_TO_EUR, countryName, formatMonth, formatUsdAsEur, sectorLabel } from "../format";
import { distinctAnswers } from "../grid";
import { backgroundFacts } from "../hints";
import { TOP10_QUESTIONS, type Top10Question } from "./top10-questions";
import { metricValue, monthIndex, type HLMetric, type WebHigherLowerPuzzle } from "../higherLower";
import { REGIONS, isLocalGame, type Region } from "../regions";

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

export function generatePuzzle(mode: PlayMode, date: string, data: Dataset, region?: Region): AnyPuzzle | null {
  if (region) return localPuzzle(mode, date, data, region);
  const rng = seeded(`${date}:${mode}`);
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

/* ---------- Local tab (one region's startups only) ---------- */

/**
 * From this day on the Local tab has more to ask: Top 10 lists about recent rounds ("the biggest rounds
 * of 2026", "active in the last 12 months") and deep tech, and Higher or Lower's "who raised more
 * recently?". Earlier days keep exactly the puzzle they had.
 */
const LOCAL_EXTRAS_FROM = "2026-11-07";

/**
 * From this day on a Local Top 10 can be about one program's startups ("the 10 CDTM startups in Munich
 * that raised the most", "the 10 German YC startups ..."), with the program's logo in the title bar.
 * Like every local list it only comes up where the region has 12 such companies (today: CDTM in Munich
 * and Germany, YC in Germany). Earlier days keep exactly the puzzle they had.
 */
const LOCAL_PROGRAMS_FROM = "2026-11-08";

/**
 * From this day on the server-made hints are more useful: Who Raised This's third hint says what the company
 * does (never its city, the clues already name it) and the founding year comes last; the Impostor's
 * second hint says what the impostor does instead of city and year; and a local game never repeats the
 * puzzle of the daily game (see localAvoids). Earlier days keep exactly what they had.
 */
const HINTS_V2_FROM = "2026-11-08";

/** From this day on, the Local "active in the last 12 months" list ranks by each startup's latest round in that window instead of its total raised. */
const LOCAL_HOT_LATEST_FROM = "2026-11-09";

/**
 * From this day on, Who Raised This has a hint about what the founders did before ("a founder worked at McKinsey")
 * right after the letter count, when we know something (founder_stations). Earlier days keep their hints.
 */
const FOUNDER_HINTS_FROM = "2026-11-10";

/** What the company does as a hint, or undefined when there is no tagline or it gives the name away. */
function doesHint(c: Company): string | undefined {
  const t = c.tagline?.trim().replace(/\.$/, "");
  if (!t) return undefined;
  const low = t.toLowerCase();
  if (low.includes(c.name.toLowerCase()) || low.includes(c.name.split(/\s+/)[0].toLowerCase())) return undefined;
  return t;
}

/**
 * A Local game: one of the region's games (lib/regions.ts) with only the region's companies. Its own
 * random stream per region, so Munich and Berlin don't share a chain. Higher or Lower has no theme
 * days here (the region is the theme). Same puzzle number as the day's daily games.
 */
function localPuzzle(mode: PlayMode, date: string, data: Dataset, region: Region): AnyPuzzle | null {
  if (!isLocalGame(region, mode)) return null;
  const rng = seeded(`${date}:${mode}:${region}`);
  const base = { date, number: puzzleNumber(date), hints: [] as Hint[] };
  const companies = data.companies.filter((c) => c.european && REGIONS[region].test(c));
  const v2 = date >= HINTS_V2_FROM;
  if (mode === "higher-lower") {
    let metrics: HLMetric[] | undefined = date >= LOCAL_EXTRAS_FROM ? [...HL_METRICS, "lastRoundMonth"] : undefined;
    if (v2) {
      // Never the daily game's number: the local chain asks about another one.
      const daily = generatePuzzle("higher-lower", date, data) as WebHigherLowerPuzzle | null;
      const all = metrics ?? [...HL_METRICS];
      const others = all.filter((m) => m !== daily?.metric);
      if (others.length) metrics = others;
    }
    return higherLower(base, date, companies, rng, false, metrics);
  }
  // Germany's Impostor: the same categories as the daily game but the country (everyone shares it).
  if (mode === "impostor") {
    let avoid: Set<string> | undefined;
    if (v2) {
      // Never a category the daily Impostor uses today, at any level.
      const daily = generatePuzzle("impostor", date, data) as (ImpostorPuzzle & { variants?: ImpostorVariants }) | null;
      avoid = new Set([daily?.prompt, ...DIFFICULTIES.map((l) => daily?.variants?.[l]?.prompt)].filter((p): p is string => !!p).map((p) => p.replace(/: Find the impostors$/, "")));
    }
    return impostor(base, companies, rng, true, avoid);
  }
  return localTop10(base, date, region, companies, data, rng);
}

const sector = (s: string): Top10Check => ({ kind: "sector", values: [s] });
const DEEP_TECH = ["ai", "robotics", "defense", "space"];

/** What a local list can ask; each needs 12 companies with the number in the region, so a small region asks fewer. */
const LOCAL_TOP10: { tag: string; metric: Top10Metric; kind?: string; founded?: string; program?: string; checks: Top10Check[]; from?: string }[] = [
  { tag: "all", metric: "lastValuationUsd", checks: [] },
  { tag: "all", metric: "totalRaisedUsd", checks: [] },
  { tag: "young", metric: "totalRaisedUsd", founded: "founded since 2015", checks: [{ kind: "founded-from", value: 2015 }] },
  { tag: "young", metric: "lastValuationUsd", founded: "founded since 2015", checks: [{ kind: "founded-from", value: 2015 }] },
  { tag: "old", metric: "totalRaisedUsd", founded: "founded before 2015", checks: [{ kind: "founded-before", value: 2015 }] },
  { tag: "ai", metric: "totalRaisedUsd", kind: "AI", checks: [sector("ai")] },
  { tag: "fintech", metric: "totalRaisedUsd", kind: "fintech", checks: [sector("fintech")] },
  { tag: "saas", metric: "totalRaisedUsd", kind: "SaaS", checks: [sector("saas")] },
  { tag: "climate", metric: "totalRaisedUsd", kind: "climate", checks: [sector("climate")] },
  { tag: "mobility", metric: "totalRaisedUsd", kind: "mobility", checks: [sector("mobility")] },
  // Munich's profile: AI, robotics, defence and space together (Helsing, Quantum Systems, Isar ...).
  { tag: "deeptech", metric: "totalRaisedUsd", kind: "deep tech", checks: [{ kind: "sector", values: DEEP_TECH, label: "deep tech" }], from: LOCAL_EXTRAS_FROM },
  // Programs: by total raised only (too few of them have a known valuation).
  { tag: "cdtm", metric: "totalRaisedUsd", kind: "CDTM", program: "cdtm", checks: [{ kind: "program", value: "cdtm", name: "CDTM" }], from: LOCAL_PROGRAMS_FROM },
  { tag: "yc", metric: "totalRaisedUsd", kind: "YC", program: "y-combinator", checks: [{ kind: "program", value: "y-combinator", name: "YC" }], from: LOCAL_PROGRAMS_FROM },
];

/**
 * A local list: what it's about (two days running never share a tag), which list it is (key, the same
 * from day to day) and how to build it from the data.
 */
type LocalList = { tag: string; key: string; build: (rng: Rng) => Top10Round | null };

/** The lists the region's data can make on a day (12 companies with the number, no tie at No. 10). */
function localUsable(date: string, region: Region, companies: Company[], data: Dataset): LocalList[] {
  const lists: LocalList[] = LOCAL_TOP10.filter((x) => !x.from || date >= x.from).map((x) => {
    const who = [REGIONS[region].who(x.kind), x.founded].filter(Boolean).join(" ");
    const q: Top10Question = {
      level: "easy",
      tag: x.tag,
      metric: x.metric,
      title: x.metric === "lastValuationUsd" ? `The 10 most valuable ${who}` : `The 10 ${who} that raised the most`,
      filter: compileChecks(x.checks),
      checks: x.checks,
      privateOnly: x.metric === "lastValuationUsd",
    };
    const p = x.program ? data.programs?.find((p) => p.id === x.program) : undefined;
    const program = p && { id: p.id, name: p.name, ...(p.logo ? { logo: p.logo } : {}) };
    return {
      tag: x.tag,
      key: `${x.tag}:${x.metric}:${x.founded ?? ""}`,
      build: (r: Rng) => {
        const round = top10Round(q, companies, r, true, [{ kind: "european" }, { kind: "region", value: region }]);
        return round && program ? { ...round, program } : round;
      },
    };
  });
  if (date >= LOCAL_EXTRAS_FROM) lists.push(...recentLists(date, region, companies, data));
  return lists.filter((l) => l.build(seeded("check")));
}

/**
 * Walk the days from day 1 through a set of lists, so that "never the same list twice running" also
 * holds across a cycle boundary, where a new order can start with the list the old one ended on (a
 * small region has only a few). Returns the day's list and that cycle's order.
 */
function walkLists(usable: LocalList[], date: string, region: Region): { list: LocalList; order: LocalList[] } {
  let list: LocalList | undefined;
  let order: LocalList[] = [];
  for (let d = 0; d < puzzleNumber(date); d++) {
    order = questionOrder(usable, "easy", Math.floor(d / usable.length), `top-10:${region}`);
    const i = d % order.length;
    list = order[i] === list && order.length > 1 ? order[(i + 1) % order.length] : order[i];
  }
  return { list: list!, order };
}

/** The region's list for a day (see localTop10), or null when the data can't make any. */
function localList(date: string, region: Region, companies: Company[], data: Dataset): LocalList | null {
  const usable = localUsable(date, region, companies, data);
  if (!usable.length) return null;
  const today = walkLists(usable, date, region);
  if (date < LOCAL_PROGRAMS_FROM) return today.list;
  // The walk only knows one day's set of lists, and the program lists change the set from
  // LOCAL_PROGRAMS_FROM on: that day's walk can land on the list the day before had. So from there,
  // day by day, a list that repeats yesterday's gives way to the next one in that day's order (on
  // another topic if there is one). Once a day keeps the walk's list, every later day does too.
  const before = localUsable(dayBefore(LOCAL_PROGRAMS_FROM), region, companies, data);
  let prev = before.length ? walkLists(before, dayBefore(LOCAL_PROGRAMS_FROM), region).list : undefined;
  for (let day = LOCAL_PROGRAMS_FROM; ; day = dayAfter(day)) {
    const u = day === date ? usable : localUsable(day, region, companies, data);
    if (!u.length) {
      prev = undefined;
      continue;
    }
    const { list, order } = day === date ? today : walkLists(u, day, region);
    let real = list;
    if (prev && list.key === prev.key && order.length > 1) {
      const i = order.indexOf(list);
      const rest = [...order.slice(i + 1), ...order.slice(0, i)];
      real = rest.find((l) => l.tag !== prev!.tag) ?? rest[0];
    }
    // Never the topic of the daily Top 10 the same day (a local "AI" list next to the global one).
    const avoid = dailyTags(day, data);
    if (avoid.has(real.tag)) {
      const i = order.indexOf(real);
      const rest = [...order.slice(i + 1), ...order.slice(0, i)].filter((l) => !avoid.has(l.tag));
      real = rest.find((l) => l.tag !== prev?.tag && l.key !== prev?.key) ?? rest[0] ?? real;
    }
    if (day === date) return real;
    prev = real;
  }
}

/** The topics of the day's daily Top 10 (all levels), in the local lists' words: the Europe, German, Berlin and Munich lists are the local "all" lists. */
function dailyTags(day: string, data: Dataset): Set<string> {
  const tags = new Set<string>();
  top10({ date: day, number: puzzleNumber(day), hints: [] }, day, data.companies.filter((c) => c.european), seeded(`${day}:top-10`), tags);
  for (const t of [...tags]) if (["europe", "de", "berlin", "munich"].includes(t)) tags.add("all");
  return tags;
}

function dayAfter(date: string): string {
  return new Date(Date.parse(date) + 86_400_000).toISOString().slice(0, 10);
}

function dayBefore(date: string): string {
  return new Date(Date.parse(date) - 86_400_000).toISOString().slice(0, 10);
}

/**
 * One list for the day, the same at every level: a region has too few companies to split them by
 * fame, so a level only changes the hints on offer. The lists go round in a shuffled order per cycle
 * (like the daily Top 10), never the same list two days running; a list the region's data can't make
 * (fewer than 12, a tie at No. 10) is skipped.
 */
function localTop10(base: Base, date: string, region: Region, companies: Company[], data: Dataset, rng: Rng): Top10Puzzle | null {
  const list = localList(date, region, companies, data);
  if (!list) return null;
  const round = list!.build(rng);
  if (!round) return null;
  return { ...base, mode: "top-10", ...round, variants: { easy: round, medium: round, hard: round } };
}

/**
 * Lists about who is raising now, from the rounds rather than a company figure:
 * - the biggest rounds of this year (each company once, by its biggest round this year), or since last
 *   year when this year has too few (early in the year, or a small region);
 * - "active in the last 12 months": companies with a round in the past 12 months, by total raised.
 */
function recentLists(date: string, region: Region, companies: Company[], data: Dataset): LocalList[] {
  const ids = new Set(companies.map((c) => c.id));
  const byId = new Map(companies.map((c) => [c.id, c]));
  const year = Number(date.slice(0, 4));
  const now = monthIndex(date);
  const rounds = data.rounds.filter((r) => ids.has(r.companyId) && r.date && r.amountUsd > 0);
  const who = REGIONS[region].who();
  const place: Top10Check[] = [{ kind: "european" }, { kind: "region", value: region }];
  const monthOf = (i: number) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;

  const biggestSince = (fromYear: number) => {
    const best = new Map<string, number>();
    for (const r of rounds) if (Number(r.date.slice(0, 4)) >= fromYear) best.set(r.companyId, Math.max(best.get(r.companyId) ?? 0, r.amountUsd));
    return [...best].map(([id, v]) => ({ c: byId.get(id)!, v }));
  };
  const active = new Set(rounds.filter((r) => monthIndex(r.date) > now - 12).map((r) => r.companyId));
  // Each active company with its most recent round in the window (amount of that one round, not its total).
  const latestInWindow = () => {
    const latest = new Map<string, { date: string; v: number }>();
    for (const r of rounds) {
      if (monthIndex(r.date) <= now - 12) continue;
      const cur = latest.get(r.companyId);
      if (!cur || r.date > cur.date) latest.set(r.companyId, { date: r.date, v: r.amountUsd });
    }
    return [...latest].map(([id, x]) => ({ c: byId.get(id)!, v: x.v }));
  };

  return [
    { tag: "recent", key: "recent:year", build: (rng) => rankedRound(`The 10 ${who} with the biggest rounds of ${year}`, "roundUsd", biggestSince(year), rng, [...place, { kind: "round-since", value: `${year}-01`, label: `in ${year}` }]) },
    { tag: "recent", key: "recent:since", build: (rng) => rankedRound(`The 10 ${who} with the biggest rounds since ${year - 1}`, "roundUsd", biggestSince(year - 1), rng, [...place, { kind: "round-since", value: `${year - 1}-01`, label: `since ${year - 1}` }]) },
    {
      tag: "hot",
      key: "hot",
      build: (rng) =>
        date >= LOCAL_HOT_LATEST_FROM
          ? rankedRound(
              `Active in the last 12 months: the 10 ${who} with the biggest latest round`,
              "roundUsd",
              latestInWindow(),
              rng,
              [...place, { kind: "round-since", value: monthOf(now - 11), label: "in the last 12 months" }],
            )
          : rankedRound(
              `Active in the last 12 months: the 10 ${who} that raised the most`,
              "totalRaisedUsd",
              companies.filter((c) => active.has(c.id)).map((c) => ({ c, v: c.totalRaisedUsd ?? 0 })),
              rng,
              [...place, { kind: "round-since", value: monthOf(now - 11), label: "in the last 12 months" }],
            ),
    },
  ];
}

/**
 * A Top 10 from companies with a value each: "roundUsd" is a round's amount (shown from the list's own
 * values), "totalRaisedUsd" the company's total. Same rules as every Top 10: at least 12, no tie at No. 10.
 */
function rankedRound(title: string, kind: "roundUsd" | "totalRaisedUsd", scored: { c: Company; v: number }[], rng: Rng, checks: Top10Check[]): Top10Round | null {
  const ranked = scored.filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
  if (ranked.length < 12 || ranked[9].v <= ranked[10].v) return null;
  const top = ranked.slice(0, 10);
  const k = 3 + Math.floor(rng() * 4);
  return {
    title,
    metric: "totalRaisedUsd",
    companyIds: top.map((x) => x.c.id),
    ...(kind === "roundUsd" ? { values: Object.fromEntries(top.map((x) => [x.c.id, x.v])) } : {}),
    checks,
    beyond: ranked.slice(10, 10 + BEYOND).map((x) => ({ id: x.c.id, value: x.v })),
    hints: [
      { text: `No. 1 starts with ${top[0].c.name[0].toUpperCase()}`, cost: 1 },
      { text: `No. ${k + 1} is based in ${top[k].c.city}`, cost: 1 },
      { text: `No. 10 ${kind === "roundUsd" ? "raised a round of" : "has raised"} ${formatUsdAsEur(top[9].v)}`, cost: 1 },
    ],
  };
}

/* ---------- Top 10 ---------- */

const LEVEL_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };
/** From this day on, "most valuable startups" lists leave out listed, acquired and defunct companies; earlier days keep their list. */
const TOP10_PRIVATE_VALUATIONS_FROM = "2026-11-03";

/**
 * Name the ten biggest. Each level goes through its questions from the bank (top10-questions.ts) in a
 * shuffled order that changes every cycle: no question repeats until all have been asked, and two days in
 * a row never share a topic. A question the data can't support today (fewer than 12 companies with the
 * number, or a tie at No. 10) is skipped for the next one.
 */
function top10(base: Base, date: string, companies: Company[], rng: Rng, tagsOut?: Set<string>): Top10Puzzle | null {
  const day = puzzleNumber(date) - 1;
  const variants: Partial<Record<Difficulty, Top10Round>> = {};
  for (const level of DIFFICULTIES) {
    const pool = TOP10_QUESTIONS.filter((q) => LEVEL_RANK[q.level] <= LEVEL_RANK[level] && (!q.from || date >= q.from));
    const order = questionOrder(pool, level, Math.floor(day / pool.length));
    for (let i = 0; i < order.length; i++) {
      const round = top10Round(order[(day + i) % order.length], companies, rng, date >= TOP10_PRIVATE_VALUATIONS_FROM, [{ kind: "european" }]);
      if (round) {
        variants[level] = round;
        tagsOut?.add(order[(day + i) % order.length].tag);
        break;
      }
    }
  }
  const main = mainOf(variants);
  return main ? { ...base, mode: "top-10", ...main, variants } : null;
}

/** One cycle of a level's questions: shuffled, with a question moved down when it shares its topic with the one before. */
function questionOrder<Q extends { tag: string }>(pool: Q[], level: Difficulty, cycle: number, stream = "top-10"): Q[] {
  const rest = shuffle(pool, seeded(`${stream}:${level}:${cycle}`));
  const order: Q[] = [];
  while (rest.length) {
    const i = Math.max(0, rest.findIndex((q) => q.tag !== order.at(-1)?.tag));
    order.push(...rest.splice(i, 1));
  }
  return order;
}

/** The list for a question, or null if the data can't make a fair one today. */
/** How many places past No. 10 a list sends along, so a wrong guess that fits can say "No. 14". */
const BEYOND = 40;

/** The list for a question, or null if the data can't make a fair one today. base: checks every list of the game has (European, the region). */
function top10Round(q: Top10Question, companies: Company[], rng: Rng, privateValuations: boolean, base: Top10Check[] = []): Top10Round | null {
  const metric = q.metric;
  const privateOnly = privateValuations && q.privateOnly;
  const ranked = companies
    .filter((c) => q.filter(c) && (!privateOnly || c.status === "private") && c[metric] != null && c[metric]! > 0).sort((a, b) => b[metric]! - a[metric]!);
  if (ranked.length < 12 || ranked[9][metric]! <= ranked[10][metric]!) return null;
  const top = ranked.slice(0, 10);
  const k = 3 + Math.floor(rng() * 4); // a middle rank, 4 to 7
  return {
    title: q.title,
    metric,
    companyIds: top.map((c) => c.id),
    ...(q.checks ? { checks: [...base, ...q.checks, ...(privateOnly ? [{ kind: "private" } as const] : [])] } : {}),
    beyond: ranked.slice(10, 10 + BEYOND).map((c) => ({ id: c.id, value: c[metric]! })),
    hints: [
      { text: `No. 1 starts with ${top[0].name[0].toUpperCase()}`, cost: 1 },
      { text: `No. ${k + 1} is based in ${top[k].city}`, cost: 1 },
      { text: `No. 10 ${metric === "lastValuationUsd" ? "was last valued at" : "has raised"} ${formatUsdAsEur(top[9][metric]!)}`, cost: 1 },
    ],
  };
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
  const tiers = new Map(data.investors.map((i) => [i.id, i.tier]));
  // Only investors players can know (tier 1 and 2) go into a clue; data without tiers (seed files) counts them all.
  const known = (id: string) => (tiers.get(id) ?? 1) <= INVESTOR_TIER_MAX;
  const people = new Map(data.people.map((p) => [p.id, p.name]));

  // Rounds that make a fair puzzle: a real amount and at least one investor worth naming.
  const rounds = data.rounds.filter((r) => byId.has(r.companyId) && r.amountUsd > 0 && r.investorIds.filter(known).length >= 1);
  if (!rounds.length) return null;

  const v2 = base.date >= HINTS_V2_FROM;
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

      const names = shuffle(round.investorIds.filter(known), rng)
        .map((id) => investors.get(id))
        .filter((n): n is string => !!n);
      const founders = answer.founderIds.map((id) => people.get(id)).filter((n): n is string => !!n);

      const clues: WhoRaisedThisPuzzle["clues"] = [
        { kind: "amount", text: `Raised ${formatUsdAsEur(round.amountUsd)} in a ${STAGE_LABEL[round.stage] ?? round.stage} round` },
        { kind: "year", text: monthYear(round.date) },
        { kind: "sector", text: answer.sectors.map(sectorLabel).join(", ") },
        ...(v2 ? [] : [{ kind: "year" as const, text: `Founded in ${answer.founded}` }]),
        { kind: "city", text: [answer.city, countryName(answer.country)].filter(Boolean).join(", ") },
        { kind: "investors", text: `Backed by ${list(names.slice(0, 2))}` },
      ];
      if (names.length > 2) clues.push({ kind: "investors", text: `Also: ${list(names.slice(2, 5))}` });
      if (founders.length) clues.push({ kind: "founders", text: `Founded by ${list(founders)}` });
      if (v2) clues.push({ kind: "year", text: `Founded in ${answer.founded}` });
      const does = doesHint(answer);
      const third = v2
        ? does
          ? { text: `What it does: ${does}`, cost: 3 }
          : answer.totalRaisedUsd
            ? { text: `Has raised ${formatUsdAsEur(answer.totalRaisedUsd)} in total`, cost: 3 }
            : undefined
        : { text: `${answer.totalRaisedUsd ? `Has raised ${formatUsdAsEur(answer.totalRaisedUsd)} in total` : `Based in ${answer.city}`}`, cost: 3 };

      return {
        answerCompanyId: answer.id,
        roundId: round.id,
        clues,
        hints: [
          { text: `The name has ${letters(answer.name)} letters`, cost: 1 },
          ...(base.date >= FOUNDER_HINTS_FROM && backgroundFacts(answer)[0]
            ? [{ text: backgroundFacts(answer)[0].replace(/^./, (ch) => ch.toUpperCase()), cost: 2 }]
            : []),
          { text: `Starts with ${answer.name[0].toUpperCase()}`, cost: 2 },
          ...(third ? [third] : []),
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
  group: "place" | "sector" | "founded" | "investor" | "valuation";
  /** How hard the heading is, 1 (anyone) to 3 (a lot of knowledge); see CATEGORY_LEVEL_MAX. */
  level: 1 | 2 | 3;
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
  const criteria = gridCriteria(data, companies, base.date);
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
    // Headings no harder than the level allows; investors only the ones players can know (tier 1 and 2).
    const allowed = criteria.filter(
      (k) => k.level <= CATEGORY_LEVEL_MAX[level] && (k.group !== "investor" || (k.tier ?? 4) <= INVESTOR_TIER_MAX),
    );
    // With simple headings only a handful of boards give every square a famous answer, so a square needs one
    // from a fame step wider than the level's (Easy: up to 3). Any fitting company is accepted anyway.
    const built = forLevel(level, companies, (_, tier) => {
      const known = new Set(companies.filter((c) => c.difficulty <= Math.min(5, tier.max + 1)).map((c) => c.id));
      return gridFor(allowed, meet, byId, known, tier, rng, base.date >= GRID_NO_NESTED_PLACES_FROM);
    });
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
  /** No city on the same side as its own country (from GRID_NO_NESTED_PLACES_FROM on). */
  noNestedPlaces = false,
): Pick<UnicornGridPuzzle, "rows" | "cols" | "validAnswers" | "cellHints"> | null {
  let best: { rows: Criterion[]; cols: Criterion[]; cells: string[][]; solvable: string[][]; score: number } | null = null;

  // The country a city belongs to (the most common country of the companies founded there).
  const cityCountry = new Map<string, string>();
  if (noNestedPlaces) {
    const tally = new Map<string, Map<string, number>>();
    for (const c of byId.values()) {
      const t = tally.get(c.city) ?? new Map<string, number>();
      t.set(c.country, (t.get(c.country) ?? 0) + 1);
      tally.set(c.city, t);
    }
    for (const [city, t] of tally) cityCountry.set(city, [...t.entries()].sort((a, b) => b[1] - a[1])[0][0]);
  }
  // A city and its own country on one side ("Sweden" and "Stockholm") overlap: every answer of the
  // city also fits the country, so those squares aren't really different.
  const nested = (side: Criterion[]) =>
    side.some((p) => p.c.kind === "city" && side.some((q) => q.c.kind === "country" && q.c.value === cityCountry.get(String(p.c.value))));

  // Rows are places (countries, cities) or sectors, like a classic grid; columns mix the rest.
  const sideOk = (side: Criterion[]) =>
    side.filter((p) => p.group === "founded").length <= 1 &&
    side.filter((p) => p.group === "investor").length <= 1 &&
    side.filter((p) => p.group === "valuation").length <= 1 &&
    side.filter((p) => p.c.kind === "city").length <= 1 &&
    !(noNestedPlaces && nested(side));

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

/**
 * Sectors the grid doesn't use as a heading: too fuzzy to place a company in ("is Personio SaaS
 * or HR tech?"). From GRID_SKIP_FROM on; earlier days keep exactly the grid they had.
 */
const GRID_SKIP_SECTORS = ["saas"];
const GRID_SKIP_FROM = "2026-11-03";
/** From this day on a grid side never has a city next to its own country; earlier days keep their grid. */
const GRID_NO_NESTED_PLACES_FROM = "2026-11-03";

function gridCriteria(data: Dataset, companies: Company[], date: string): Criterion[] {
  const out: Criterion[] = [];
  const count = (test: (c: Company) => boolean) => companies.filter(test).length;
  // How well known a heading is follows from how many of the companies are in it: a big country, a big
  // sector or a big city is one players know; a small one (Helsinki, Estonia, quantum) takes a lot of knowledge.
  const share = (n: number) => n / companies.length;

  for (const code of unique(companies.map((c) => c.country))) {
    const test = (c: Company) => c.country === code;
    const n = count(test);
    const level = share(n) >= 0.04 ? 1 : share(n) >= 0.02 ? 2 : 3;
    if (n >= 2) out.push({ group: "place", level, test, c: { kind: "country", value: code, label: `${flag(code)} ${countryName(code)}` } });
  }
  for (const city of unique(companies.map((c) => c.city).filter(Boolean))) {
    const test = (c: Company) => c.city === city;
    const n = count(test);
    // Never Easy: even a big city is a harder question than its country.
    if (n >= 3) out.push({ group: "place", level: share(n) >= 0.035 ? 2 : 3, test, c: { kind: "city", value: city, label: city } });
  }
  const skip = date >= GRID_SKIP_FROM ? GRID_SKIP_SECTORS : [];
  for (const sector of unique(companies.flatMap((c) => c.sectors)).filter((s) => !skip.includes(s))) {
    const test = (c: Company) => c.sectors.includes(sector);
    const n = count(test);
    const level = share(n) >= 0.07 ? 1 : share(n) >= 0.02 ? 2 : 3;
    if (n >= 3) out.push({ group: "sector", level, test, c: { kind: "sector", value: sector, label: sectorLabel(sector) } });
  }
  for (const year of [2010, 2014, 2018]) {
    const after = (c: Company) => c.founded > year;
    const before = (c: Company) => c.founded > 0 && c.founded <= year;
    if (count(after) >= 3) out.push({ group: "founded", level: 2, test: after, c: { kind: "founded-after", value: year, label: `Founded ${year + 1}+` } });
    if (count(before) >= 3) out.push({ group: "founded", level: 2, test: before, c: { kind: "founded-before", value: year + 1, label: `Founded ${year} or earlier` } });
  }
  // "Valued over €5bn" is a question anyone can answer about the big names; €10bn is a narrower club.
  for (const [bn, level] of [[5, 1], [10, 2]] as const) {
    const test = (c: Company) => c.lastValuationUsd != null && c.lastValuationUsd * USD_TO_EUR >= bn * 1e9;
    // The schema has no valuation heading yet; nothing but the label and the games look at its kind.
    if (count(test) >= 3) out.push({ group: "valuation", level, test, c: { kind: "valuation-over", value: bn, label: `Valued over €${bn}bn` } as unknown as GridCriterion });
  }
  const names = new Map(data.investors.map((i) => [i.id, i.name]));
  const set = new Map(data.investors.map((i) => [i.id, i.tier]));
  const backed = new Map<string, Set<string>>();
  for (const r of data.rounds) for (const id of r.investorIds) (backed.get(id) ?? backed.set(id, new Set()).get(id)!).add(r.companyId);
  for (const [id, cos] of backed) {
    const test = (c: Company) => cos.has(c.id);
    if (names.has(id) && count(test) >= 3)
      out.push({ group: "investor", level: 3, test, tier: set.get(id) ?? investorTier(cos.size), c: { kind: "investor", value: id, label: `Backed by ${names.get(id)}` } });
  }
  return out;
}

/* ---------- Higher or Lower ---------- */

/** Consecutive values are at least this far apart (bigger / smaller): no coin flips on estimated figures. */
const HL_MIN_GAP = 1.3;

/**
 * From this day on a step between two companies in a money chain has a size per level (ratio of the bigger to
 * the smaller): Easy clear steps, Medium moderate ones (no jump from a small startup to a giant), Hard close
 * ones. Before, every level only had the minimum of 1.3 and no cap, so Medium could jump by a billion.
 * Earlier days keep their chain.
 */
const HL_GAPS_FROM = "2026-11-09";
const HL_GAPS: Record<Difficulty, { min: number; max: number }> = {
  easy: { min: 1.5, max: Infinity },
  medium: { min: 1.3, max: 3 },
  hard: { min: 1.2, max: 2 },
};

/** A Higher or Lower chain whose every step is a clear gap; null if the data can't make one. */
/** At most 15 rounds (16 companies); a thinner tier gets a shorter chain. */
function hlChain(cs: Company[], metric: HLMetric, rng: Rng, length = 16, gap?: { min: number; max: number }): Company[] | null {
  const v = (c: Company) => metricValue(c, metric)!;
  // Founding years only need to differ (no ties); money needs a clear ratio.
  const fits =
    metric === "founded"
      ? (a: Company, b: Company) => v(a) !== v(b)
      : metric === "lastRoundMonth"
        ? // At least three months apart: two rounds a month apart are a coin flip.
          (a: Company, b: Company) => Math.abs(v(a) - v(b)) >= 3
      : (a: Company, b: Company) => {
          const ratio = Math.max(v(a), v(b)) / Math.min(v(a), v(b));
          return ratio >= (gap?.min ?? HL_MIN_GAP) && ratio <= (gap?.max ?? Infinity);
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

/** Higher or Lower: one chain per level. Web-only extra. */
export type HigherLowerVariants = Partial<Record<Difficulty, { companyIds: string[]; hints: Hint[] }>>;

/**
 * From this day on, Higher or Lower also has "biggest round" days and theme days. Earlier days
 * keep exactly the puzzle they had (same metric, same chain), so a deploy never swaps a puzzle
 * someone is playing.
 */
const HL_EXTRAS_FROM = "2026-11-04";
/** A theme needs this many companies with the day's metric, and this many per level. */
const HL_THEME_MIN = 30;
const HL_THEME_MIN_PER_LEVEL = 14;
/** A theme day's chains must have at least this many companies at every level, else no theme. */
const HL_THEME_MIN_CHAIN = 11;
const HL_METRICS: HLMetric[] = ["totalRaisedUsd", "lastValuationUsd", "founded", "biggestRoundUsd"];

type HLTheme = {
  label: string;
  test: (c: Company) => boolean;
  /** Fewer startups per fame level than usual (a young theme is mostly obscure companies); the level then widens its tier. */
  minPerLevel?: number;
  /** A shorter chain is enough on this theme day (young startups are few); default HL_THEME_MIN_CHAIN. */
  minChain?: number;
  /** Metrics this theme makes no sense with (founding year in "founded in the last 5 years"). */
  skipMetrics?: HLMetric[];
};

/** From this day on "Founded 2015 or later" is "Founded in the last 5 years" (2015 isn't special any more). Same place in the rotation. */
const HL_YOUNG_FROM = "2026-11-09";
const HL_OLD_YOUNG_LABEL = "Founded 2015 or later";
const hlYoung = (date: string): HLTheme => {
  const from = Number(date.slice(0, 4)) - 4;
  return { label: "Founded in the last 5 years", test: (c) => c.founded >= from, minPerLevel: 0, minChain: 8, skipMetrics: ["founded"] };
};
/** The themes as they are on a day: the same list and order, the young theme swapped in from HL_YOUNG_FROM. */
const hlThemeOn = (theme: HLTheme, date: string): HLTheme => (theme.label === HL_OLD_YOUNG_LABEL && date >= HL_YOUNG_FROM ? hlYoung(date) : theme);

/** Mostly broad themes, just for variety; a few specific ones for fun. */
const HL_THEMES: HLTheme[] = [
  { label: "Unicorns only", test: (c) => c.unicorn },
  { label: "Founded 2015 or later", test: (c) => c.founded >= 2015 },
  { label: "Founded before 2015", test: (c) => c.founded > 0 && c.founded < 2015 },
  // Now and then something more specific, for fun. A theme only runs once the data has enough
  // companies for it at every level (see hlThemeFits), so a thin one simply waits.
  { label: "Startups from Germany", test: (c) => c.country === "DE" },
  { label: "AI only", test: (c) => c.sectors.includes("ai") },
  { label: "Defence only", test: (c) => c.sectors.includes("defense") },
];

/** Whether a day (from HL_EXTRAS_FROM on) is a theme day: about one day in three, from its own random stream. */
const hlThemed = (date: string) => date >= HL_EXTRAS_FROM && seeded(`${date}:higher-lower:theme`)() < 0.33;

function nextDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Enough companies with this metric overall and in every level's fame tier. */
function hlThemeFits(theme: HLTheme, metric: HLMetric, companies: Company[]): boolean {
  if (theme.skipMetrics?.includes(metric)) return false;
  const pool = companies.filter((c) => (metricValue(c, metric) ?? 0) > 0 && theme.test(c));
  if (pool.length < HL_THEME_MIN) return false;
  const per = theme.minPerLevel ?? HL_THEME_MIN_PER_LEVEL;
  return DIFFICULTIES.every((l) => pool.filter((c) => c.difficulty >= FAME_TIERS[l].min && c.difficulty <= FAME_TIERS[l].max).length >= per);
}

/**
 * The day's theme, if it's a theme day. Theme days go through the themes in a fixed shuffled
 * order, each taking the next one after the previous theme day's that fits its metric, so a
 * theme never comes twice in a row and only returns once the others have had a turn.
 */
function hlThemeFor(date: string, companies: Company[]): HLTheme | undefined {
  if (!hlThemed(date)) return undefined;
  const order = shuffle(HL_THEMES, seeded("higher-lower:themes"));
  let last = -1;
  for (let d = HL_EXTRAS_FROM; d <= date; d = nextDay(d)) {
    if (!hlThemed(d)) continue;
    const metric = HL_METRICS[puzzleNumber(d) % HL_METRICS.length];
    for (let step = 1; step <= order.length; step++) {
      const i = (last + step) % order.length;
      if (hlThemeFits(hlThemeOn(order[i], d), metric, companies)) {
        last = i;
        break;
      }
    }
  }
  return last >= 0 ? hlThemeOn(order[last], date) : undefined;
}

function higherLower(base: Base, date: string, companies: Company[], rng: Rng, themes = true, only?: HLMetric[]): WebHigherLowerPuzzle | null {
  const extras = date >= HL_EXTRAS_FROM;
  const metrics: HLMetric[] = only ?? (extras ? HL_METRICS : ["totalRaisedUsd", "lastValuationUsd", "founded"]);
  // Rotate the metric by day, falling back to the next one if the data is too thin.
  const start = puzzleNumber(date) % metrics.length;
  const theme = themes ? hlThemeFor(date, companies) : undefined;
  for (const metric of metrics.map((_, i) => metrics[(start + i) % metrics.length])) {
    const usable = companies.filter((c) => (metricValue(c, metric) ?? 0) > 0);
    const label =
      metric === "totalRaisedUsd"
        ? "has raised"
        : metric === "founded"
          ? "was founded in"
          : metric === "biggestRoundUsd"
            ? "raised in its biggest round"
            : metric === "lastRoundMonth"
              ? "last raised in"
              : "was last valued at";
    const value = (c: Company) =>
      metric === "founded" ? String(c.founded) : metric === "lastRoundMonth" ? formatMonth(metricValue(c, metric)!) : formatUsdAsEur(metricValue(c, metric)!);

    const build = (pool: Company[], chainRng: Rng): HigherLowerVariants => {
      const variants: HigherLowerVariants = {};
      for (const level of DIFFICULTIES) {
        const built = forLevel(level, pool, (tier) => {
          const chain = hlChain(tier, metric, chainRng, 16, date >= HL_GAPS_FROM ? HL_GAPS[level] : undefined);
          if (!chain) return null;
          const [a, b] = pickN(chain.slice(1), 2, chainRng);
          return {
            companyIds: chain.map((c) => c.id),
            hints: [
              { text: `${a.name} ${label} ${value(a)}`, cost: 1 },
              { text: `${b.name} ${label} ${value(b)}`, cost: 1 },
            ],
          };
        });
        if (built) variants[level] = built;
      }
      return variants;
    };

    // Only on the metric the theme was chosen for (the day's first); a fallback metric plays without.
    if (theme && metric === metrics[start] && usable.some(theme.test)) {
      const variants = build(usable.filter(theme.test), seeded(`${date}:higher-lower:${theme.label}`));
      const full = DIFFICULTIES.every((l) => (variants[l]?.companyIds.length ?? 0) >= (theme.minChain ?? HL_THEME_MIN_CHAIN));
      const main = mainOf(variants);
      if (full && main) return { ...base, mode: "higher-lower", metric, theme: theme.label, companyIds: main.companyIds, hints: main.hints, variants };
    }

    const variants = build(usable, rng);
    const main = mainOf(variants);
    if (!main) continue;
    return { ...base, mode: "higher-lower", metric, companyIds: main.companyIds, hints: main.hints, variants };
  }
  return null;
}

/* ---------- Impostor ---------- */

/** Impostor's exit categories (acquired, listed, went bust) start here; earlier days keep their puzzle. */
const IMPOSTOR_EXITS_FROM = "2026-11-08";

/** How a company's story ended, for an Impostor explanation: "was bought by SAP in 2026". */
function fate(c: Company): string {
  const year = c.exit?.month.slice(0, 4);
  const when = year ? ` in ${year}` : "";
  switch (c.status) {
    case "acquired":
      return c.exit?.acquirer ? `was bought by ${c.exit.acquirer}${when}` : `was bought by another company${when}`;
    case "public":
      return `went public${when}`;
    case "defunct":
      return `went bust${when}`;
    default:
      return "is still an independent private company";
  }
}

interface Group {
  members: (c: Company) => boolean;
  /** What the group has in common, short, as the prompt opens: "Based in Paris". */
  prompt: string;
  /** What the others have in common, for the explanation: "are German companies". */
  shared: string;
  /** What sets the impostor apart: "comes from France". */
  odd: (c: Company) => string;
}

/** Companies per puzzle: one impostor among five that fit. */
const IMPOSTOR_MIN_OPTIONS = 6;

/** `impostorIds` lists every company that doesn't belong (usually one, sometimes two or three); `impostorId` is the first. */
export type ImpostorVariants = Partial<
  Record<Difficulty, Pick<ImpostorPuzzle, "prompt" | "companyIds" | "impostorId" | "explanation" | "hints"> & { impostorIds: string[] }>
>;

/** How many startups on the circle: mostly more than six, never fewer than six. */
function optionCount(rng: Rng): number {
  const r = rng();
  return r < 0.15 ? 6 : r < 0.45 ? 7 : r < 0.75 ? 8 : 9;
}

/** How many impostors: mostly one, now and then two or three. */
/**
 * From this day on every circle hides at least two impostors (one was too easy to spot): six or seven
 * options two, eight two or three, nine mostly three. Earlier days keep their puzzle.
 */
const IMPOSTOR_SCALED_FROM = "2026-11-08";

function impostorsFor(options: number, rng: Rng): number {
  const r = rng();
  if (options <= 7) return 2;
  if (options === 8) return r < 0.6 ? 2 : 3;
  return r < 0.35 ? 2 : 3;
}

function impostorCount(rng: Rng): number {
  const r = rng();
  return r < 0.6 ? 1 : r < 0.9 ? 2 : 3;
}

/**
 * local: a Local game, whose companies all come from one country, so there are no country categories,
 * and the impostors come from the same companies ("Based in Munich" with impostors from Berlin).
 */
function impostor(base: Base, companies: Company[], rng: Rng, local = false, avoid?: Set<string>): (ImpostorPuzzle & { variants: ImpostorVariants }) | null {
  const groups: Group[] = [];
  for (const code of local ? [] : unique(companies.map((c) => c.country))) {
    groups.push({
      members: (c) => c.country === code,
      prompt: `From ${countryName(code)}`,
      shared: `come from ${countryName(code)}`,
      odd: (c) => `comes from ${countryName(c.country)}`,
    });
  }
  for (const city of unique(companies.map((c) => c.city).filter(Boolean))) {
    groups.push({
      members: (c) => c.city === city,
      prompt: `Based in ${city}`,
      shared: `are based in ${city}`,
      odd: (c) => `is based in ${c.city}`,
    });
  }
  for (const sector of unique(companies.flatMap((c) => c.sectors))) {
    groups.push({
      members: (c) => c.sectors.includes(sector),
      prompt: sectorPlural(sector).replace(/^./, (c) => c.toUpperCase()),
      shared: `are ${sectorPlural(sector)}`,
      odd: (c) => `is ${c.sectors.map(sectorLabel).join(" and ")}`,
    });
  }
  groups.push({
    members: (c) => c.unicorn,
    prompt: "Unicorns",
    shared: "have been valued at €1bn or more",
    odd: () => "has never been valued at €1bn or more",
  });
  // How the story ended (Company.exit, set for acquired, listed and failed companies), from
  // IMPOSTOR_EXITS_FROM on; earlier days keep their puzzle. The generator only picks a group when
  // the day's tier has enough members, so a thin one simply waits.
  if (base.date >= IMPOSTOR_EXITS_FROM) groups.push({
    members: (c) => c.status === "acquired",
    prompt: "Bought by another company",
    shared: "were bought by another company",
    odd: fate,
  });
  if (base.date >= IMPOSTOR_EXITS_FROM) groups.push({
    members: (c) => c.status === "public",
    prompt: "Listed on a stock exchange",
    shared: "went public",
    odd: fate,
  });
  if (base.date >= IMPOSTOR_EXITS_FROM) groups.push({
    members: (c) => c.status === "defunct",
    prompt: "Went bust",
    shared: "went bust or shut down",
    odd: fate,
  });
  for (const year of [2012, 2015, 2019]) {
    groups.push({
      members: (c) => c.founded >= year,
      prompt: `Founded in ${year} or later`,
      shared: `were founded in ${year} or later`,
      odd: (c) => `was founded in ${c.founded}`,
    });
  }

  const variants: ImpostorVariants = {};
  for (const level of DIFFICULTIES) {
    const built = forLevel(level, companies, (pool) => {
      // A category of the day for this level: enough members in the tier, and someone who doesn't belong.
      // From IMPOSTOR_SCALED_FROM on, the circle's size comes first and the impostors scale with it.
      const scaled = base.date >= IMPOSTOR_SCALED_FROM;
      const first = scaled ? optionCount(rng) : impostorCount(rng);
      const second = scaled ? impostorsFor(first, rng) : optionCount(rng);
      const [n, wanted] = scaled ? [second, first] : [first, second];
      for (const g of shuffle(avoid?.size ? groups.filter((x) => !avoid.has(x.prompt)) : groups, rng)) {
        const fits = pool.filter(g.members);
        // As many options as the wish, or as many as this category can fill (but at least six).
        let options = Math.min(wanted, fits.length + n);
        // A small category shrinks the circle; on six or seven, two impostors (not three of six).
        let k = n;
        if (scaled && options <= 7 && n > 2) {
          k = 2;
          options = Math.min(wanted, fits.length + k);
        }
        if (options < IMPOSTOR_MIN_OPTIONS) continue;
        // The impostors are from the tier too; a category the whole tier shares (e.g. all unicorns) takes anyone else.
        const inTier = pool.filter((c) => !g.members(c));
        const outsiders = inTier.length >= k ? inTier : companies.filter((c) => !g.members(c));
        if (outsiders.length < k) continue;
        const fit = pickN(fits, options - k, rng);
        const imps = pickN(outsiders, k, rng);
        const first = imps[0];
        return {
          prompt: `${g.prompt}: Find the impostors`, // never how many: the game ends when all are found
          companyIds: shuffle([...fit, ...imps], rng).map((c) => c.id),
          impostorId: first.id,
          impostorIds: imps.map((c) => c.id),
          explanation: `${list(imps.map((c) => `${c.name} ${g.odd(c)}`))}. ${list(fit.map((c) => c.name))} ${g.shared}.`,
          hints: [
            { text: `Remove one wrong option (${fit[0].name} fits)`, cost: 1 },
            base.date >= HINTS_V2_FROM
              ? { text: doesHint(first) ? `One impostor: ${doesHint(first)}` : `One impostor is based in ${first.city}`, cost: 2 }
              : { text: `One impostor is based in ${first.city}, founded in ${first.founded}`, cost: 2 },
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
  const label = sectorLabel(s).toLowerCase();
  // "semiconductors" is already a plural; "dev tools" too.
  return SECTOR_PLURAL[s] ?? (label.endsWith("s") ? label : `${label} companies`);
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
