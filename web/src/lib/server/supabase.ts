import type { AnyPuzzle, PlayMode } from "@/lib/top10";
import "server-only";
import { fetchAll } from "./paged";
import type { Company, Dataset, Puzzle, Round } from "@eunicorn/schema";
import { USD_TO_EUR } from "@/lib/format";
import { generatePuzzle } from "./generate";
import logoFiles from "./logos.generated.json";

/**
 * Read-only access to the curated Supabase data (see supabase/migrations). Server-side only:
 * SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are server env vars. RLS already limits the anon
 * role to verified companies and rounds and to approved puzzles up to today (Europe/Berlin).
 *
 * Every function returns null when Supabase is not configured, unreachable or still empty,
 * so callers fall back to the JSON files in /data.
 */

/** How long a response may be cached. Short, so a new day's puzzle shows up soon after midnight. */
const REVALIDATE_SECONDS = 300;

async function request<T>(path: string): Promise<T[] | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      headers: { apikey: key },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) {
      console.error(`Supabase ${path}: ${res.status} ${await res.text()}`);
      return null;
    }
    return (await res.json()) as T[];
  } catch (err) {
    console.error(`Supabase ${path}:`, err);
    return null;
  }
}

/**
 * A query with its own limit (one puzzle) is a single request. Any other is read in full, page by
 * page: Supabase cuts a response at 1,000 rows, so rounds and investors were arriving incomplete.
 * Such a path must carry an `order=`.
 */
function select<T>(path: string): Promise<T[] | null> {
  if (/[?&]limit=/.test(path)) return request<T>(path);
  return fetchAll<T>((offset, limit) => request<T>(`${path}&limit=${limit}&offset=${offset}`));
}

/* ---------- rows as the database returns them (snake_case, money in EUR) ---------- */

interface CompanyRow {
  id: string;
  name: string;
  domain: string;
  logo: string | null;
  country: string;
  city: string | null;
  founded: number | null;
  sectors: Company["sectors"];
  status: Company["status"];
  unicorn: boolean;
  last_valuation_eur: number | null;
  employees: number | null;
  careers_url: string | null;
  fun_fact: string | null;
  difficulty: Company["difficulty"];
  company_founders: { person_id: string }[];
}

interface RoundRow {
  id: string;
  company_id: string;
  stage: Round["stage"];
  announced_month: string;
  amount_eur: number;
  amount_original: number | null;
  currency: string | null;
  post_money_valuation_eur: number | null;
  attribution_url: string | null;
  round_investors: { investor_id: string }[];
  round_sources: { url: string }[];
}

/** A round as the web uses it: the shared type plus the Tech.eu link its licence asks us to show. */
export type WebRound = Round & { attributionUrl?: string };

/**
 * The shared TypeScript contract (packages/schema) still carries USD fields, and the UI shows
 * them converted with USD_TO_EUR. The database stores EUR, so we invert that one rate here and
 * the UI shows the database's euro figure exactly. Goes away when the schema moves to EUR.
 */
const eurAsUsd = (eur: number | null | undefined) => (eur == null ? undefined : eur / USD_TO_EUR);

/** The logo files deployed with the site (web/public/logos, listed at build time), by company id. */
const LOGOS = new Map((logoFiles as string[]).map((f) => [f.replace(/\.(svg|png)$/, ""), `/logos/${f}`]));
const DEPLOYED = new Set(LOGOS.values());
/**
 * Supabase's path only if that file is deployed: the data side may load a company before its
 * logo file reaches main, and a missing file would show as a broken image. Else the file
 * named after the id, else nothing (the UI shows initials).
 */
const logoFor = (id: string, dbPath: string | null) => (dbPath && DEPLOYED.has(dbPath) ? dbPath : LOGOS.get(id));

const ORIGINAL_CURRENCIES = ["EUR", "GBP", "SEK", "CHF"] as const;

export async function getDataset(): Promise<(Omit<Dataset, "rounds"> & { rounds: WebRound[] }) | null> {
  const [companies, totals, rounds, investors, people] = await Promise.all([
    select<CompanyRow>("companies?select=*,company_founders(person_id)&order=id"),
    select<{ company_id: string; total_raised_eur: number }>("company_totals?select=company_id,total_raised_eur&order=company_id"),
    select<RoundRow>("rounds?select=*,round_investors(investor_id),round_sources(url)&order=id"),
    // "*": the `tier` column (1 = top global VCs ... 4 = everyone else) is read when it exists, without breaking before.
    select<{ id: string; name: string; domain: string | null; tier?: 1 | 2 | 3 | 4 | null; logo?: string | null }>("investors?select=*&order=id"),
    select<{ id: string; name: string }>("people?select=id,name&order=id"),
  ]);
  if (!companies?.length || !rounds || !investors || !people) return null;

  const raised = new Map((totals ?? []).map((t) => [t.company_id, t.total_raised_eur]));
  return {
    companies: companies.map(
      (c): Company => ({
        id: c.id,
        name: c.name,
        domain: c.domain,
        logo: logoFor(c.id, c.logo),
        european: true, // the database holds European companies only
        country: c.country,
        city: c.city ?? "",
        founded: c.founded ?? 0,
        sectors: c.sectors,
        status: c.status,
        unicorn: c.unicorn,
        founderIds: c.company_founders.map((f) => f.person_id),
        totalRaisedUsd: eurAsUsd(raised.get(c.id)),
        lastValuationUsd: eurAsUsd(c.last_valuation_eur),
        employees: c.employees ?? undefined,
        careersUrl: c.careers_url ?? undefined,
        funFact: c.fun_fact ?? undefined,
        difficulty: c.difficulty,
        verified: true,
      }),
    ),
    rounds: rounds.map(
      (r): WebRound => ({
        id: r.id,
        companyId: r.company_id,
        stage: r.stage,
        date: r.announced_month,
        amountUsd: eurAsUsd(r.amount_eur)!,
        amountOriginal:
          r.amount_original != null && ORIGINAL_CURRENCIES.includes(r.currency as (typeof ORIGINAL_CURRENCIES)[number])
            ? { value: r.amount_original, currency: r.currency as (typeof ORIGINAL_CURRENCIES)[number] }
            : undefined,
        postMoneyValuationUsd: eurAsUsd(r.post_money_valuation_eur),
        leadInvestorIds: [], // the database deliberately records no leads
        investorIds: r.round_investors.map((i) => i.investor_id),
        sources: r.round_sources.map((s) => s.url),
        verified: true,
        attributionUrl: r.attribution_url ?? undefined,
      }),
    ),
    investors: investors.map((i) => ({ id: i.id, name: i.name, domain: i.domain ?? undefined, tier: i.tier ?? undefined, logo: i.logo ?? undefined })),
    people,
  };
}

/**
 * The day's puzzle for this mode. Supabase is the source of truth: an approved puzzle there
 * wins (RLS hides drafts and future days); without one, the puzzle is generated from the
 * verified data. null only when Supabase is unavailable or the data can't support the mode.
 */
export async function getPuzzle(mode: PlayMode, date: string, rotate?: string): Promise<AnyPuzzle | null> {
  // Test mode: skip the approved puzzle and generate a new one from this salt.
  if (rotate) {
    const data = await getDataset();
    return data ? generatePuzzle(mode, date, data, rotate) : null;
  }
  // Top 10 is web-only for now: the puzzles table's mode enum doesn't know it, so it's always generated.
  if (mode === "top-10") {
    const data = await getDataset();
    return data ? generatePuzzle(mode, date, data) : null;
  }
  const rows = await select<{ payload: Puzzle }>(
    `puzzles?select=payload&mode=eq.${encodeURIComponent(mode)}&date=eq.${encodeURIComponent(date)}&limit=1`,
  );
  if (rows?.[0]?.payload) return rows[0].payload;
  const data = await getDataset();
  return data ? generatePuzzle(mode, date, data) : null;
}

/* ---------- anonymous play counter (supabase/migrations/*_play_stats.sql) ---------- */

export interface PlayRow {
  played_on: string;
  mode: PlayMode;
  difficulty: "easy" | "medium" | "hard";
  event: "start" | "finish";
  bucket?: number;
  score_pct?: number;
  won?: boolean;
}

/** Records one start or finish. false if Supabase isn't set up or the table doesn't exist yet. */
export async function insertPlay(row: PlayRow): Promise<boolean> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;
  const res = await fetch(`${url}/rest/v1/plays`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(row),
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) console.error("Supabase plays insert:", res?.status, await res?.text().catch(() => ""));
  return !!res?.ok;
}

export interface PlayStats {
  starts: number;
  finishes: number;
  solved: number;
  /** Result bucket -> players (guess number, rounds right, squares filled; 0 = missed). */
  buckets: Record<string, number>;
  /** Score as % of the maximum -> players. */
  scores: Record<string, number>;
}

/** Aggregates for one day and mode, or null when unavailable. */
export async function getPlayStats(day: string, mode: PlayMode): Promise<PlayStats | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const res = await fetch(`${url}/rest/v1/rpc/play_stats`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ p_day: day, p_mode: mode }),
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json()) as PlayStats;
}

/* ---------- optional daily leaderboard (supabase/migrations/*_leaderboard.sql) ---------- */

export interface LeaderboardRow {
  played_on: string;
  mode: PlayMode;
  difficulty: "easy" | "medium" | "hard";
  name: string;
  /** Random id the browser keeps: one entry per device, game and day. Never read back. */
  device: string;
  score_pct: number;
  hints: number;
}

/** "duplicate": this device is already on the board for that game and day. "error": not set up, or failed. */
export async function insertLeaderboard(row: LeaderboardRow): Promise<"ok" | "duplicate" | "error"> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return "error";
  const res = await fetch(`${url}/rest/v1/leaderboard`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(row),
    cache: "no-store",
  }).catch(() => null);
  if (res?.ok) return "ok";
  if (res?.status === 409) return "duplicate";
  console.error("Supabase leaderboard insert:", res?.status, await res?.text().catch(() => ""));
  return "error";
}

export interface BoardEntry {
  rank: number;
  name: string;
  scorePct: number;
  hints: number;
}

export interface Board {
  total: number;
  top: BoardEntry[];
  /** This device's own entry, wherever it ranks. */
  you: BoardEntry | null;
}

/** The top of one day's board for a game and level, plus the caller's own entry; null when unavailable. */
export async function getLeaderboard(day: string, mode: PlayMode, difficulty: string, device: string): Promise<Board | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const res = await fetch(`${url}/rest/v1/rpc/leaderboard_board`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ p_day: day, p_mode: mode, p_difficulty: difficulty, p_device: device, p_limit: 10 }),
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json()) as Board;
}
