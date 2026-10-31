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
      for (const { a, b, higher } of p.pairs) {
        if (!known(a) || !known(b)) continue;
        const va = companies.get(a)![p.metric], vb = companies.get(b)![p.metric];
        if (va == null || vb == null) { fail(where, `${a}/${b} missing ${p.metric}`); continue; }
        const actual = va > vb ? a : b;
        if (actual !== higher) fail(where, `${a} vs ${b}: higher should be ${actual}`);
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

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`OK: ${data.companies.length} companies, ${data.rounds.length} rounds, ${count} puzzles`);
