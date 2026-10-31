// Loads data/verified/<company-id>.json into Supabase as verified companies, rounds, investors and founders.
// Each file is one company whose facts were checked against public sources; every fact carries its source.
// Re-running is safe: the company's founders, rounds and sources are replaced by what the file says.
// All money in euros. Months as "YYYY-MM".
//
// Run: npm run load:verified                 every file
//      npm run load:verified -- mistral-ai   one company
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { connect } from "./db.ts";

interface Source { field: string; url: string; quote?: string }
interface VerifiedRound {
  techeuId?: string;
  stage: string; // pre-seed | seed | series-a ... series-f+
  month: string; // "2023-12"
  amountEur: number;
  amountOriginal?: number;
  currency?: string; // as announced, e.g. "USD"
  postMoneyValuationEur?: number;
  investors: string[]; // full names, e.g. "Andreessen Horowitz"
  sources: Source[]; // needs at least "amount" and "month"
}
interface VerifiedCompany {
  id: string;
  name: string;
  aliases?: string[];
  domain: string;
  country: string;
  city: string;
  founded: number;
  sectors: string[];
  status: "private" | "public" | "acquired" | "defunct";
  unicorn: boolean;
  lastValuationEur?: number;
  employees?: number;
  founders: string[];
  funFact?: string;
  careersUrl?: string;
  difficulty: number;
  techeuId?: string;
  wikidataId?: string;
  sources: Source[];
  rounds: VerifiedRound[];
}

const dir = join(import.meta.dirname, "../verified");
const slug = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Logo path the web app reads (companies.logo): /logos/<id>.svg|png when the file exists, else null.
const logosDir = join(import.meta.dirname, "../../web/public/logos");
const logoPath = (id: string) => {
  const file = ["svg", "png"].map((ext) => `${id}.${ext}`).find((f) => existsSync(join(logosDir, f)));
  return file ? `/logos/${file}` : null;
};

const only = process.argv[2];
const files = readdirSync(dir).filter((f) => f.endsWith(".json") && (!only || f === `${only}.json`));
const db = await connect();
let rounds = 0;
try {
  for (const file of files) {
    const c: VerifiedCompany = JSON.parse(readFileSync(join(dir, file), "utf8"));
    if (`${c.id}.json` !== file) throw new Error(`${file}: id ${c.id} does not match the filename`);
    await db.query("begin");
    try {
      await db.query(
        `insert into public.companies (id, name, aliases, domain, country, city, founded, sectors, status, unicorn,
           last_valuation_eur, employees, careers_url, fun_fact, difficulty, techeu_id, wikidata_id, logo,
           verified, verified_at, verified_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8::public.sector[], $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
           true, now(), 'data/verified')
         on conflict (id) do update set
           name = excluded.name, aliases = excluded.aliases, domain = excluded.domain, country = excluded.country,
           city = excluded.city, founded = excluded.founded, sectors = excluded.sectors, status = excluded.status,
           unicorn = excluded.unicorn, last_valuation_eur = excluded.last_valuation_eur,
           employees = excluded.employees, careers_url = excluded.careers_url, fun_fact = excluded.fun_fact,
           difficulty = excluded.difficulty, techeu_id = excluded.techeu_id, wikidata_id = excluded.wikidata_id,
           logo = excluded.logo, verified = true, verified_at = now(), verified_by = excluded.verified_by`,
        [c.id, c.name, c.aliases ?? [], c.domain, c.country, c.city, c.founded, c.sectors, c.status, c.unicorn,
         c.lastValuationEur ?? null, c.employees ?? null, c.careersUrl ?? null, c.funFact ?? null, c.difficulty,
         c.techeuId ?? null, c.wikidataId ?? null, logoPath(c.id)],
      );

      await db.query("delete from public.company_founders where company_id = $1", [c.id]);
      for (const name of c.founders) {
        await db.query("insert into public.people (id, name) values ($1, $2) on conflict (id) do nothing", [slug(name), name]);
        await db.query("insert into public.company_founders values ($1, $2) on conflict do nothing", [c.id, slug(name)]);
      }
      await db.query("delete from public.company_sources where company_id = $1", [c.id]);
      for (const s of c.sources) {
        await db.query(
          "insert into public.company_sources (company_id, field, url, quote) values ($1, $2, $3, $4) on conflict do nothing",
          [c.id, s.field, s.url, s.quote ?? null]);
      }

      // Rounds: replace the company's rounds with the verified list.
      await db.query("delete from public.rounds where company_id = $1", [c.id]);
      const ids = new Set<string>();
      for (const r of c.rounds) {
        const base = `${c.id}-${r.stage.replace("+", "-plus")}-${r.month.slice(0, 4)}`; // series-f+ -> series-f-plus
        let id = base;
        for (let n = 2; ids.has(id); n++) id = `${base}-${n}`;
        ids.add(id);
        // Insert unverified first: the trigger only allows verified once the sources exist.
        await db.query(
          `insert into public.rounds (id, company_id, stage, announced_month, amount_eur, amount_original, currency,
             post_money_valuation_eur, techeu_id, attribution_url)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [id, c.id, r.stage, `${r.month}-01`, r.amountEur, r.amountOriginal ?? null, r.currency ?? null,
           r.postMoneyValuationEur ?? null, r.techeuId ?? null,
           r.techeuId ? `https://funding.tech.eu/deals/${r.techeuId}` : null],
        );
        for (const name of r.investors) {
          await db.query("insert into public.investors (id, name) values ($1, $2) on conflict (id) do nothing", [slug(name), name]);
          await db.query("insert into public.round_investors values ($1, $2) on conflict do nothing", [id, slug(name)]);
        }
        for (const s of r.sources) {
          await db.query(
            "insert into public.round_sources (round_id, field, url, quote) values ($1, $2, $3, $4) on conflict do nothing",
            [id, s.field, s.url, s.quote ?? null]);
        }
        await db.query(
          "update public.rounds set verified = true, verified_by = 'data/verified' where id = $1", [id]);
        rounds++;
      }
      await db.query("commit");
      console.log(`${c.id}: ${c.rounds.length} rounds`);
    } catch (e) {
      await db.query("rollback");
      throw new Error(`${file}: ${(e as Error).message}`);
    }
  }
  console.log(`loaded ${files.length} companies, ${rounds} rounds`);
} finally {
  await db.end();
}
