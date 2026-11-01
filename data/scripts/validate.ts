// Validates data/seed/dataset.json and every puzzle in data/puzzles/<date>/<mode>.json.
// Run: npm run validate  (Node >= 22.6, uses native TypeScript type stripping)
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Company, Dataset, GridCriterion, Puzzle } from "../../packages/schema/src/index.ts";

const root = join(import.meta.dirname, "..");
const data: Dataset = JSON.parse(readFileSync(join(root, "seed/dataset.json"), "utf8"));
const errors: string[] = [];
const fail = (where: string, msg: string) => errors.push(`${where}: ${msg}`);

const companies = new Map(data.companies.map((c) => [c.id, c]));
const investors = new Set(data.investors.map((i) => i.id));
const people = new Set(data.people.map((p) => p.id));
const rounds = new Map(data.rounds.map((r) => [r.id, r]));

// --- dataset referential integrity ---
for (const c of data.companies) {
  for (const f of c.founderIds) if (!people.has(f)) fail(`company ${c.id}`, `unknown founder ${f}`);
}
for (const r of data.rounds) {
  if (!companies.has(r.companyId)) fail(`round ${r.id}`, `unknown company ${r.companyId}`);
  for (const i of [...r.leadInvestorIds, ...r.investorIds]) {
    if (!investors.has(i)) fail(`round ${r.id}`, `unknown investor ${i}`);
  }
}

// --- puzzles ---
function matches(c: Company, k: GridCriterion): boolean {
  switch (k.kind) {
    case "country": return c.country === k.value;
    case "city": return c.city === k.value;
    case "sector": return c.sectors.includes(k.value);
    case "unicorn": return c.unicorn;
    case "status": return c.status === k.value;
    case "founded-after": return c.founded > k.value;
    case "founded-before": return c.founded < k.value;
    case "investor":
      return data.rounds.some((r) => r.companyId === c.id && r.investorIds.includes(k.value));
  }
}

function checkPuzzle(where: string, p: Puzzle) {
  const known = (id: string) => companies.has(id) || (fail(where, `unknown company ${id}`), false);
  switch (p.mode) {
    case "who-raised-this": {
      known(p.answerCompanyId);
      const r = rounds.get(p.roundId);
      if (!r) fail(where, `unknown round ${p.roundId}`);
      else if (r.companyId !== p.answerCompanyId) fail(where, "round does not belong to answer company");
      break;
    }
    case "unicorn-grid": {
      if (p.validAnswers.length !== 9) fail(where, "validAnswers must have 9 cells");
      if (p.cellHints.length !== 9) fail(where, "cellHints must have 9 cells");
      // Every precomputed answer must really match, and no matching European company may be missing.
      p.validAnswers.forEach((cell, i) => {
        const row = p.rows[Math.floor(i / 3)], col = p.cols[i % 3];
        if (cell.length === 0) fail(where, `cell ${i} has no answers`);
        for (const id of cell) {
          const c = companies.get(id);
          if (!c) fail(where, `unknown company ${id}`);
          else if (!matches(c, row) || !matches(c, col)) fail(where, `cell ${i}: ${id} does not match`);
        }
        const expected = data.companies.filter((c) => c.european && matches(c, row) && matches(c, col)).map((c) => c.id);
        const missing = expected.filter((id) => !cell.includes(id));
        if (missing.length) fail(where, `cell ${i}: missing valid answers ${missing.join(", ")}`);
      });
      break;
    }
    case "higher-lower":
      if (p.companyIds.length < 2) fail(where, "needs at least 2 companies");
      if (new Set(p.companyIds).size !== p.companyIds.length) fail(where, "companyIds must be unique");
      for (const id of p.companyIds) {
        if (known(id) && companies.get(id)![p.metric] == null) fail(where, `${id} missing ${p.metric}`);
      }
      break;
    case "impostor":
      p.companyIds.forEach(known);
      if (!p.companyIds.includes(p.impostorId)) fail(where, "impostor not among companyIds");
      break;
  }
}

const puzzleDir = join(root, "puzzles");
let count = 0;
for (const date of readdirSync(puzzleDir)) {
  for (const file of readdirSync(join(puzzleDir, date))) {
    const p: Puzzle = JSON.parse(readFileSync(join(puzzleDir, date, file), "utf8"));
    const where = `puzzles/${date}/${file}`;
    if (p.date !== date) fail(where, `date field ${p.date} does not match folder`);
    if (`${p.mode}.json` !== file) fail(where, `mode ${p.mode} does not match filename`);
    checkPuzzle(where, p);
    count++;
  }
}

// --- verified company files (data/verified/<id>.json, what the loader puts into Supabase) ---
// The same rules the loader and database enforce, plus the data rules in data/LESSONS.md, so a bad file
// fails here instead of halfway through a load.
const schemaSrc = readFileSync(join(root, "../packages/schema/src/index.ts"), "utf8");
const SECTORS = new Set([...schemaSrc.match(/export type Sector =([^;]+);/)![1].matchAll(/"([^"]+)"/g)].map((m) => m[1]));
const STAGES = new Set(["pre-seed", "seed", "series-a", "series-b", "series-c", "series-d", "series-e", "series-f+"]);
const STATUSES = new Set(["private", "public", "acquired", "defunct"]);
const COMPANY_FIELDS = new Set(["city", "founded", "founders", "sectors", "status", "unicorn", "valuation", "employees", "fun_fact", "logo"]);
const ROUND_FIELDS = new Set(["amount", "month", "stage", "investors", "valuation"]);
const thisMonth = new Date().toISOString().slice(0, 7);

const verifiedDir = join(root, "verified");
const techeuRoundIds = new Map<string, string>();
const domains = new Map<string, string>();
let verifiedCount = 0, verifiedRounds = 0;
for (const file of readdirSync(verifiedDir).filter((f) => f.endsWith(".json"))) {
  const where = `verified/${file}`;
  const c = JSON.parse(readFileSync(join(verifiedDir, file), "utf8"));
  const bad = (msg: string) => fail(where, msg);
  verifiedCount++;

  if (`${c.id}.json` !== file) bad(`id ${c.id} does not match filename`);
  if (!c.name) bad("missing name");
  if (!c.domain) bad("missing domain");
  else if (domains.has(c.domain)) bad(`domain ${c.domain} also used by ${domains.get(c.domain)}`);
  else domains.set(c.domain, c.id);
  if (!/^[A-Z]{2}$/.test(c.country ?? "")) bad(`country must be ISO-2, got ${c.country}`);
  if (!c.city) bad("missing city");
  if (!Number.isInteger(c.founded) || c.founded < 1995 || c.founded > Number(thisMonth.slice(0, 4))) bad(`founded ${c.founded} out of range`);
  if (!Array.isArray(c.sectors) || !c.sectors.length) bad("needs at least one sector");
  for (const s of c.sectors ?? []) if (!SECTORS.has(s)) bad(`unknown sector ${s}`);
  if (!STATUSES.has(c.status)) bad(`unknown status ${c.status}`);
  if (typeof c.unicorn !== "boolean") bad("unicorn must be true/false");
  if (![1, 2, 3, 4, 5].includes(c.difficulty)) bad(`difficulty ${c.difficulty} not 1–5`);

  const fields = new Set<string>();
  for (const s of c.sources ?? []) {
    fields.add(s.field);
    if (!COMPANY_FIELDS.has(s.field)) bad(`source field "${s.field}" not allowed`);
    if (!/^https?:\/\//.test(s.url ?? "")) bad(`source ${s.field} has no URL`);
    if (!s.quote) bad(`source ${s.field} has no quote`);
  }
  for (const f of ["city", "founded", "sectors"]) if (!fields.has(f)) bad(`no source for ${f}`);
  // Unicorn rule: a priced round or IPO at €1bn+, so a unicorn needs that valuation and a source for it.
  if (c.unicorn && !fields.has("unicorn")) bad("unicorn without a unicorn source");
  if (c.unicorn && !(c.lastValuationEur >= 1e9)) bad("unicorn without lastValuationEur >= €1bn");
  if (!c.unicorn && c.lastValuationEur >= 1e9) bad(`lastValuationEur ${c.lastValuationEur} >= €1bn but unicorn is false`);
  if (c.lastValuationEur != null && !fields.has("valuation")) bad("lastValuationEur without a valuation source");

  for (const r of c.rounds ?? []) {
    const rw = `round ${r.month} ${r.stage}`;
    verifiedRounds++;
    if (!STAGES.has(r.stage)) bad(`${rw}: stage must be one of ${[...STAGES].join(", ")}`);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(r.month ?? "")) bad(`${rw}: month must be YYYY-MM`);
    else if (r.month > thisMonth) bad(`${rw}: month is in the future`);
    if (!(typeof r.amountEur === "number" && r.amountEur > 0)) bad(`${rw}: amountEur must be a positive number`);
    if (!Array.isArray(r.investors)) bad(`${rw}: investors must be a list`);
    if (r.techeuId) {
      if (r.techeuId === c.techeuId) bad(`${rw}: techeuId is the company id, not a round id`);
      else if (techeuRoundIds.has(r.techeuId)) bad(`${rw}: techeuId also used by ${techeuRoundIds.get(r.techeuId)}`);
      else techeuRoundIds.set(r.techeuId, `${c.id} ${r.month}`);
    }
    const rf = new Set((r.sources ?? []).map((s: { field: string }) => s.field));
    for (const f of ["amount", "month"]) if (!rf.has(f)) bad(`${rw}: no source for ${f}`);
    for (const s of r.sources ?? []) {
      if (!ROUND_FIELDS.has(s.field)) bad(`${rw}: source field "${s.field}" not allowed`);
      if (!/^https?:\/\//.test(s.url ?? "")) bad(`${rw}: source ${s.field} has no URL`);
      if (!s.quote) bad(`${rw}: source ${s.field} has no quote`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} problem(s)`);
  process.exit(1);
}
console.log(`OK: ${data.companies.length} seed companies, ${data.rounds.length} seed rounds, ${count} puzzles; ` +
  `${verifiedCount} verified companies, ${verifiedRounds} verified rounds`);
