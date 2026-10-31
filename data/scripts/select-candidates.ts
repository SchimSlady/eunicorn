// Builds staging.launch_candidates: European companies with at least MIN_EQUITY of equity funding,
// ranked by fame (number of Wikipedia language editions with an article, via Wikidata, CC0).
//   1. Sum each European company's equity rounds from staging (classification: techeu-map.ts).
//   2. Fetch the full Tech.eu profile (website, city) for candidates that only have the short record,
//      at most MAX_PROFILES per run, biggest raisers first. Rate-limited (~550/hour).
//   3. Match each candidate to Wikidata by name, confirmed by its website, count its Wikipedias and
//      read its founding year. staging.launch_ranking leaves out companies founded before 1995.
// Your `include` and `note` decisions survive re-runs.
//
// Run: npm run select:candidates                 companies with >= €100M equity, <= 500 profile requests
//      npm run select:candidates -- 50 800       companies with >= €50M equity, <= 800 profile requests
import type pg from "pg";
import { connect } from "./db.ts";
import { techeuGet } from "./techeu-api.ts";
import { classify, toMonth } from "./techeu-map.ts";

const MIN_EQUITY = Number(process.argv[2] ?? 100) * 1e6;
const MAX_PROFILES = Number(process.argv[3] ?? 500);
const WIKIDATA = "https://www.wikidata.org/w/api.php";
const UA = { "User-Agent": "EUnicorn/0.1 (https://github.com/SchimSlady/eunicorn)" };

// Wikidata items for our countries, to confirm loose website matches (P17 = country).
const COUNTRY_QID: Record<string, string> = {
  AT: "Q40", BE: "Q31", BG: "Q219", HR: "Q224", CY: "Q229", CZ: "Q213", DK: "Q35", EE: "Q191",
  FI: "Q33", FR: "Q142", DE: "Q183", GR: "Q41", HU: "Q28", IE: "Q27", IT: "Q38", LV: "Q211",
  LT: "Q37", LU: "Q32", MT: "Q233", NL: "Q55", PL: "Q36", PT: "Q45", RO: "Q218", SK: "Q214",
  SI: "Q215", ES: "Q29", SE: "Q34", GB: "Q145", NO: "Q20", IS: "Q189", LI: "Q347", CH: "Q39",
};

interface Candidate {
  id: string;
  name: string;
  country: string; // ISO code
  equityEur: number;
  rounds: number;
  lastMonth: string | null;
}

/** Step 1: equity totals per European company, from raw Tech.eu rounds. */
async function equityByCompany(db: pg.Client): Promise<Candidate[]> {
  const { rows } = await db.query(`
    select r.payload, c.code
    from staging.techeu_rounds r
    join public.countries c on c.techeu_name = r.payload->'company'->>'country'`);
  const byCompany = new Map<string, Candidate>();
  for (const { payload: r, code } of rows) {
    if (!classify(r) || !r.amountEur) continue;
    const c = byCompany.get(r.company.id) ??
      { id: r.company.id, name: r.company.name, country: code, equityEur: 0, rounds: 0, lastMonth: null };
    c.equityEur += Number(r.amountEur);
    c.rounds++;
    const month = toMonth(r.date);
    if (month && (!c.lastMonth || month > c.lastMonth)) c.lastMonth = month;
    byCompany.set(c.id, c);
  }
  return [...byCompany.values()].filter((c) => c.equityEur >= MIN_EQUITY);
}

/** Step 2: full Tech.eu profiles for candidates that only have the short record embedded in rounds. */
async function fetchProfiles(db: pg.Client, ids: string[]) {
  const missing = new Set((await db.query(
    `select id from staging.techeu_companies where id = any($1::uuid[]) and not payload ? 'website'`, [ids],
  )).rows.map((r) => r.id.toUpperCase()));
  const rows = ids.filter((id) => missing.has(id.toUpperCase())).slice(0, MAX_PROFILES).map((id) => ({ id }));
  if (rows.length) console.log(`profiles: fetching ${rows.length} from Tech.eu (~${Math.ceil(rows.length / 550)}h)`);
  for (const [i, { id }] of rows.entries()) {
    const profile = await techeuGet(`/companies/${id.toUpperCase()}`);
    await db.query(
      `update staging.techeu_companies set name = $2, country = $3, payload = $4, fetched_at = now() where id = $1`,
      [id, profile.name, profile.country, profile],
    );
    if ((i + 1) % 50 === 0) console.log(`  profiles: ${i + 1}/${rows.length}`);
  }
}

const hostOf = (url?: string | null) => {
  try { return url ? new URL(url).hostname.replace(/^www\./, "").toLowerCase() : null; } catch { return null; }
};
const coreOf = (host: string) => host.split(".").slice(0, -1).join("."); // "personio.de" -> "personio"

async function wikidata(params: Record<string, string>) {
  const res = await fetch(`${WIKIDATA}?${new URLSearchParams({ format: "json", ...params })}`, { headers: UA });
  if (!res.ok) throw new Error(`Wikidata HTTP ${res.status}`);
  return res.json();
}

/** Step 3: the Wikidata item whose website matches, and how many Wikipedias have an article on it. */
async function matchWikidata(name: string, website: string | null, country: string) {
  const host = hostOf(website);
  const plainName = name.replace(/\s*\(.*\)$/, "").toLowerCase(); // "Stegra (H2 Green Steel)" -> "stegra"
  const search = await wikidata({ action: "wbsearchentities", search: name, language: "en", type: "item", limit: "7" });
  const hits: any[] = search.search ?? [];
  if (!hits.length) return { id: null, languages: 0, founded: null };
  const { entities } = await wikidata({ action: "wbgetentities", ids: hits.map((h) => h.id).join("|"), props: "claims|sitelinks" });
  const items = hits.map((h) => ({ ...entities[h.id], label: String(h.label ?? "").toLowerCase() })).filter((e) => e.id);
  const sites = (e: any) => (e.claims?.P856 ?? []).map((c: any) => hostOf(c.mainsnak.datavalue?.value)).filter(Boolean);
  const inCountry = (e: any) => (e.claims?.P17 ?? []).some((c: any) => c.mainsnak.datavalue?.value.id === COUNTRY_QID[country]);
  // 1. Same website. 2. Same domain name with another ending (personio.de vs .com) in the same country.
  // 3. Exactly the same name in the same country (Wikidata's website is outdated or missing).
  const match = (host && items.find((e) => sites(e).includes(host))) ||
    (host && items.find((e) => inCountry(e) && sites(e).some((s: string) => coreOf(s) === coreOf(host)))) ||
    items.find((e) => inCountry(e) && e.label === plainName);
  if (!match) return { id: null, languages: 0, founded: null };
  const special = /^(commons|species|meta|wikidata|mediawiki|sources|outreach|wikimania|incubator)wiki$/;
  const languages = Object.keys(match.sitelinks ?? {}).filter((k) => k.endsWith("wiki") && !special.test(k)).length;
  // P571 = inception, e.g. "+2015-07-01T00:00:00Z"
  const inception = match.claims?.P571?.[0]?.mainsnak.datavalue?.value.time as string | undefined;
  return { id: match.id as string, languages, founded: inception ? Number(inception.slice(1, 5)) : null };
}

/** Rough start for the Mon→Sun curve; adjust by hand. */
const difficulty = (languages: number) =>
  languages >= 30 ? 1 : languages >= 15 ? 2 : languages >= 6 ? 3 : languages >= 2 ? 4 : 5;

const db = await connect();
try {
  const candidates = await equityByCompany(db);
  console.log(`candidates: ${candidates.length} European companies with >= €${MIN_EQUITY / 1e6}M equity`);
  candidates.sort((a, b) => b.equityEur - a.equityEur);
  await fetchProfiles(db, candidates.map((c) => c.id));

  const { rows: profiles } = await db.query(
    `select id, payload from staging.techeu_companies where id = any($1::uuid[])`, [candidates.map((c) => c.id)]);
  const profile = new Map(profiles.map((p) => [p.id.toUpperCase(), p.payload]));
  const { rows: done } = await db.query(
    `select techeu_id from staging.launch_candidates where wikidata_id is not null and founded is not null`); // retry misses
  const looked = new Set(done.map((d) => d.techeu_id.toUpperCase()));

  let matched = 0;
  for (const [i, c] of candidates.entries()) {
    const p = profile.get(c.id.toUpperCase()) ?? {};
    const wd = looked.has(c.id.toUpperCase()) ? null : await matchWikidata(c.name, p.website, c.country);
    if (wd?.id) matched++;
    await db.query(
      `insert into staging.launch_candidates as lc (techeu_id, name, country, city, website, sectors, equity_eur,
         equity_rounds, last_round_month, wikidata_id, wikipedia_languages, suggested_difficulty, founded)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       on conflict (techeu_id) do update set
         name = excluded.name, country = excluded.country, city = excluded.city, website = excluded.website,
         sectors = excluded.sectors, equity_eur = excluded.equity_eur, equity_rounds = excluded.equity_rounds,
         last_round_month = excluded.last_round_month,
         wikidata_id = coalesce(excluded.wikidata_id, lc.wikidata_id),
         wikipedia_languages = coalesce(excluded.wikipedia_languages, lc.wikipedia_languages),
         suggested_difficulty = coalesce(excluded.suggested_difficulty, lc.suggested_difficulty),
         founded = coalesce(excluded.founded, lc.founded),
         updated_at = now()`,
      [c.id, c.name, c.country, p.city ?? null, p.website ?? null, p.sectors ?? [], Math.round(c.equityEur),
       c.rounds, c.lastMonth, wd?.id ?? null, wd ? wd.languages : null, wd ? difficulty(wd.languages) : null,
       wd?.founded ?? null],
    );
    if ((i + 1) % 100 === 0) console.log(`  wikidata: ${i + 1}/${candidates.length}, ${matched} new matches`);
  }
  const { rows: top } = await db.query(
    `select rank, name, country, founded, round(equity_eur / 1e6) as eq_m, wikipedia_languages as wp
     from staging.launch_ranking order by rank limit 40`);
  console.table(top);
} finally {
  await db.end();
}
