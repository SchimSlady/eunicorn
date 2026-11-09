// Reads data/founders/*.json and lists organisations shared by founders of different companies.
// Run: npx tsx data/scripts/founder-groups.ts [minCompanies=3]
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../founders");
const min = Number(process.argv[2] ?? 3);
const orgs = new Map<string, Map<string, Set<string>>>();
let founders = 0, covered = 0, stations = 0;
for (const f of readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "aliases.json")) {
  const c = JSON.parse(readFileSync(join(dir, f), "utf8"));
  for (const p of c.founders) {
    founders++;
    if (p.stations.length) covered++;
    for (const s of p.stations) {
      stations++;
      const byCompany = orgs.get(s.orgCanonical) ?? new Map<string, Set<string>>();
      byCompany.set(c.id, (byCompany.get(c.id) ?? new Set()).add(p.name));
      orgs.set(s.orgCanonical, byCompany);
    }
  }
}
console.log(`${founders} founders, ${covered} with stations, ${stations} stations`);
const rows = [...orgs].map(([org, m]) => ({ org, companies: m.size, people: [...m.values()].reduce((a, s) => a + s.size, 0), ids: [...m.keys()] }))
  .filter((r) => r.companies >= min).sort((a, b) => b.companies - a.companies || b.people - a.people);
for (const r of rows) console.log(`${r.org}: ${r.companies} companies, ${r.people} founders (${r.ids.join(", ")})`);
if (!rows.length) console.log(`no organisation shared by ${min}+ companies`);
