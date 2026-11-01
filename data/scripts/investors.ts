// Applies data/investors/aliases.json (merge duplicate investors) and data/investors/tiers.json (tier 1–4).
// Idempotent: safe to re-run after loading new companies.
//
// Run: npx tsx data/scripts/investors.ts            merge + tiers
//      npx tsx data/scripts/investors.ts --rank     also print the tier-3 ranking (top 200 by companies backed)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { connect } from "./db.ts";

const dir = join(import.meta.dirname, "../investors");
const { aliases, names } = JSON.parse(readFileSync(join(dir, "aliases.json"), "utf8")) as {
  aliases: Record<string, string>; names: Record<string, string>;
};
const tiers = JSON.parse(readFileSync(join(dir, "tiers.json"), "utf8")) as Record<"1" | "2" | "3", string[]>;

const db = await connect();
await db.query("begin");

// 1. Merge: move round links to the canonical investor, then drop the alias row.
let merged = 0;
for (const [alias, canonical] of Object.entries(aliases)) {
  const exists = await db.query("select 1 from public.investors where id = $1", [alias]);
  if (!exists.rowCount) continue;
  await db.query(`insert into public.round_investors (round_id, investor_id)
    select round_id, $2 from public.round_investors where investor_id = $1 on conflict do nothing`, [alias, canonical]);
  await db.query("delete from public.investors where id = $1", [alias]); // cascades its round_investors rows
  merged++;
}
for (const [id, name] of Object.entries(names)) await db.query("update public.investors set name = $2 where id = $1", [id, name]);

// 2. Tiers: everyone 4, then the listed ids.
await db.query("update public.investors set tier = 4 where tier <> 4");
const missing: string[] = [];
for (const t of ["1", "2", "3"] as const) {
  for (const id of tiers[t]) {
    const r = await db.query("update public.investors set tier = $2 where id = $1", [id, Number(t)]);
    if (!r.rowCount) missing.push(`${t}:${id}`);
  }
}
await db.query("commit");

const counts = await db.query("select tier, count(*)::int n from public.investors group by tier order by tier");
console.log(`merged ${merged} duplicates; tiers:`, counts.rows.map((r) => `${r.tier}=${r.n}`).join(" "));
if (missing.length) console.log("tier ids not found:", missing.join(", "));

if (process.argv.includes("--rank")) {
  const r = await db.query(`select i.id, i.name, count(distinct rd.company_id)::int companies
    from public.investors i join public.round_investors ri on ri.investor_id = i.id join public.rounds rd on rd.id = ri.round_id
    where i.tier > 2 group by i.id, i.name order by companies desc, count(distinct ri.round_id) desc, i.name limit 260`);
  for (const [n, x] of r.rows.entries()) console.log(n + 1, x.id, `(${x.companies})`);
}
await db.end();
