// Loads data/founders/<company-id>.json (founder stations) into Supabase.
// Needs the company and its founders (people) to exist: run load-verified first.
// Re-running is safe: a company's stations are replaced by what its file says.
//
// Run: npx tsx data/scripts/load-founders.ts            every file
//      npx tsx data/scripts/load-founders.ts spotify    one company
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { connect } from "./db.ts";

interface Station { kind: string; org: string; orgCanonical: string; role?: string; years?: string; source: string; quote: string; weakSource?: boolean }
interface File { id: string; founders: { name: string; stations: Station[] }[] }

const slug = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const dir = join(import.meta.dirname, "../founders");
const only = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "aliases.json" && (!only.length || only.includes(f.slice(0, -5))));
const data = files.map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as File);

// An organisation is a university when only education stations name it, a company when none does.
const kinds = new Map<string, Set<string>>();
for (const c of data) for (const p of c.founders) for (const s of p.stations) {
  const k = kinds.get(s.orgCanonical) ?? new Set();
  k.add(s.kind === "education" ? "education" : "work");
  kinds.set(s.orgCanonical, k);
}
const orgKind = (name: string) => { const k = kinds.get(name)!; return k.size > 1 ? "other" : k.has("education") ? "university" : "company"; };

const db = await connect();
const verified = new Set((await db.query("select id from public.companies where verified")).rows.map((r) => r.id));
const people = new Set((await db.query("select id from public.people")).rows.map((r) => r.id));
let stations = 0, skipped = 0;
const missing: string[] = [];
try {
  await db.query("begin");
  for (const c of data) {
    if (!verified.has(c.id)) { missing.push(c.id); continue; }
    await db.query("delete from public.founder_stations where company_id = $1", [c.id]);
    for (const p of c.founders) {
      const pid = slug(p.name);
      if (!people.has(pid)) { if (p.stations.length) skipped += p.stations.length; continue; }
      for (const s of p.stations) {
        const oid = slug(s.orgCanonical);
        await db.query(
          `insert into public.organisations (id, name, kind) values ($1, $2, $3)
           on conflict (id) do update set name = excluded.name, kind = excluded.kind`, [oid, s.orgCanonical, orgKind(s.orgCanonical)]);
        await db.query(
          `insert into public.founder_stations (person_id, company_id, kind, organisation_id, org_as_stated, role, years, source_url, quote, weak_source)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) on conflict do nothing`,
          [pid, c.id, s.kind, oid, s.org, s.role ?? null, s.years ?? null, s.source, s.quote, !!s.weakSource]);
        stations++;
      }
    }
  }
  await db.query("delete from public.organisations o where not exists (select 1 from public.founder_stations s where s.organisation_id = o.id)");
  await db.query("commit");
} catch (e) { await db.query("rollback"); throw e; } finally { await db.end(); }
console.log(`loaded ${stations} stations from ${data.length - missing.length} companies`);
if (missing.length) console.log("not in the database (verified), skipped:", missing.join(", "));
if (skipped) console.log(`${skipped} stations skipped: founder not in people`);
