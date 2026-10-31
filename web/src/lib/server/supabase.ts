import "server-only";
import type { Company, Dataset, GameMode, Puzzle, Round } from "@eunicorn/schema";
import { USD_TO_EUR } from "@/lib/format";
import { generatePuzzle } from "./generate";

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

async function select<T>(path: string): Promise<T[] | null> {
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

const ORIGINAL_CURRENCIES = ["EUR", "GBP", "SEK", "CHF"] as const;

export async function getDataset(): Promise<(Omit<Dataset, "rounds"> & { rounds: WebRound[] }) | null> {
  const [companies, totals, rounds, investors, people] = await Promise.all([
    select<CompanyRow>("companies?select=*,company_founders(person_id)"),
    select<{ company_id: string; total_raised_eur: number }>("company_totals?select=company_id,total_raised_eur"),
    select<RoundRow>("rounds?select=*,round_investors(investor_id),round_sources(url)"),
    select<{ id: string; name: string; domain: string | null }>("investors?select=id,name,domain"),
    select<{ id: string; name: string }>("people?select=id,name"),
  ]);
  if (!companies?.length || !rounds || !investors || !people) return null;

  const raised = new Map((totals ?? []).map((t) => [t.company_id, t.total_raised_eur]));
  return {
    companies: companies.map(
      (c): Company => ({
        id: c.id,
        name: c.name,
        domain: c.domain,
        logo: c.logo ?? undefined,
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
    investors: investors.map((i) => ({ id: i.id, name: i.name, domain: i.domain ?? undefined })),
    people,
  };
}

/**
 * The day's puzzle for this mode. Supabase is the source of truth: an approved puzzle there
 * wins (RLS hides drafts and future days); without one, the puzzle is generated from the
 * verified data. null only when Supabase is unavailable or the data can't support the mode.
 */
export async function getPuzzle(mode: GameMode, date: string): Promise<Puzzle | null> {
  const rows = await select<{ payload: Puzzle }>(
    `puzzles?select=payload&mode=eq.${encodeURIComponent(mode)}&date=eq.${encodeURIComponent(date)}&limit=1`,
  );
  if (rows?.[0]?.payload) return rows[0].payload;
  const data = await getDataset();
  return data ? generatePuzzle(mode, date, data) : null;
}
