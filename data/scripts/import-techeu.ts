// Copies the Tech.eu Funding Explorer (CC BY 4.0) into staging.techeu_rounds / staging.techeu_companies, unchanged.
// Two modes, both resumable (cursors are saved after every page in staging.sync_state):
//   backfill  Walks /rounds (newest first) once to get the full history, ~1 hour because of Tech.eu's
//             rate limits. Each round carries a short company record (name, country, city, sectors),
//             which seeds techeu_companies. Full profiles (website, description) come from /companies/{id} later.
//   sync      Reads the /changes feeds: rows added since the last run, and rows Tech.eu removed.
//             The feeds only reach back to mid-2026, which is why the backfill exists.
// Filtering (equity only, European only) and stage mapping happen later, when rows are promoted to public.*.
//
// Run: npm run import:techeu -- backfill          full history (run once)
//      npm run import:techeu                      sync both feeds (run daily)
//      npm run import:techeu -- backfill 3        at most 3 pages (for testing)
import type pg from "pg";
import { connect } from "./db.ts";
import { techeuGet } from "./techeu-api.ts";

type Feed = "rounds" | "companies";
const START = "2000-01-01";

interface Page {
  data: any[];
  removed?: { id: string; reason?: string }[];
  nextCursor: string | null;
}

const UPSERT_ROUNDS = `
  insert into staging.techeu_rounds (id, company_id, date, stage, amount_eur, confidence, payload, fetched_at)
  select (r->>'id')::uuid, (r->'company'->>'id')::uuid, (r->>'date')::date, r->>'stage',
         (r->>'amountEur')::numeric, r->>'confidence', r, now()
  from jsonb_array_elements($1::jsonb) r
  where r->'company'->>'id' is not null
  on conflict (id) do update set
    company_id = excluded.company_id, date = excluded.date, stage = excluded.stage,
    amount_eur = excluded.amount_eur, confidence = excluded.confidence,
    payload = excluded.payload, fetched_at = excluded.fetched_at`;

const UPSERT_COMPANIES = `
  insert into staging.techeu_companies (id, name, country, payload, fetched_at)
  select (c->>'id')::uuid, c->>'name', c->>'country', c, now()
  from jsonb_array_elements($1::jsonb) c
  on conflict (id) do update set
    name = excluded.name, country = excluded.country, payload = excluded.payload, fetched_at = excluded.fetched_at`;

// Short company records embedded in rounds never overwrite a full profile.
const INSERT_EMBEDDED_COMPANIES = `
  insert into staging.techeu_companies (id, name, country, payload, fetched_at)
  select distinct on (c->>'id') (c->>'id')::uuid, c->>'name', c->>'country', c, now()
  from jsonb_array_elements($1::jsonb) r, jsonb_extract_path(r, 'company') c
  where c->>'id' is not null
  on conflict (id) do nothing`;

const getCursor = async (db: pg.Client, key: string): Promise<string | undefined> =>
  (await db.query("select value from staging.sync_state where key = $1", [key])).rows[0]?.value;

const setCursor = (db: pg.Client, key: string, value: string) =>
  db.query(
    `insert into staging.sync_state (key, value) values ($1, $2)
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [key, value],
  );

async function backfill(db: pg.Client, maxPages: number) {
  const key = "techeu.rounds.backfill_cursor";
  let cursor = await getCursor(db, key);
  if (cursor === "done") return console.log("backfill: already complete");
  console.log(`backfill: ${cursor ? `resuming after ${cursor}` : "starting from the newest round"}`);
  let pages = 0, rows = 0;
  while (pages < maxPages) {
    const page = await techeuGet<Page>("/rounds", { limit: "100", after: cursor });
    pages++;
    await db.query("begin");
    if (page.data.length) {
      const json = JSON.stringify(page.data);
      await db.query(INSERT_EMBEDDED_COMPANIES, [json]);
      rows += (await db.query(UPSERT_ROUNDS, [json])).rowCount ?? 0;
    }
    await setCursor(db, key, page.nextCursor ?? "done");
    await db.query("commit");
    if (pages % 25 === 0) console.log(`  backfill: ${pages} pages, ${rows} rounds, now at ${page.nextCursor}`);
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }
  console.log(`backfill: ${rows} rounds upserted, ${pages} pages`);
}

async function sync(db: pg.Client, feed: Feed, maxPages: number) {
  const key = `techeu.${feed}.cursor`;
  const saved = await getCursor(db, key);
  // A cursor looks like "<ISO timestamp>__<id>"; resume strictly after it.
  let cursor = saved;
  const since = saved ? saved.split("__")[0] : START;
  console.log(`${feed}: ${saved ? `changes after ${saved}` : `changes since ${START}`}`);
  let pages = 0, rows = 0, removed = 0;
  while (pages < maxPages) {
    const page = await techeuGet<Page>("/changes", { type: feed, since, limit: "100", after: cursor });
    pages++;
    await db.query("begin");
    if (pages === 1 && page.removed?.length) {
      // Every page repeats the complete list of removals since `since`; apply it once.
      const table = feed === "rounds" ? "staging.techeu_rounds" : "staging.techeu_companies";
      const ids = page.removed.map((r) => r.id);
      removed = (await db.query(`delete from ${table} where id = any($1::uuid[])`, [ids])).rowCount ?? 0;
    }
    if (page.data.length) {
      const json = JSON.stringify(page.data);
      if (feed === "rounds") await db.query(INSERT_EMBEDDED_COMPANIES, [json]);
      rows += (await db.query(feed === "rounds" ? UPSERT_ROUNDS : UPSERT_COMPANIES, [json])).rowCount ?? 0;
    }
    if (page.nextCursor) await setCursor(db, key, page.nextCursor);
    await db.query("commit");
    if (!page.nextCursor || page.data.length === 0) break;
    cursor = page.nextCursor;
  }
  console.log(`${feed}: ${rows} rows upserted, ${removed} removed, ${pages} pages`);
}

const [mode, max] = process.argv.slice(2);
const maxPages = max ? Number(max) : Infinity;
const db = await connect();
try {
  if (mode === "backfill") await backfill(db, maxPages);
  else for (const feed of ["companies", "rounds"] as const) await sync(db, feed, maxPages);
  const { rows } = await db.query(`select
    (select count(*) from staging.techeu_companies) as companies,
    (select count(*) from staging.techeu_rounds) as rounds`);
  console.log(`staging now holds ${rows[0].companies} companies, ${rows[0].rounds} rounds`);
} finally {
  await db.end();
}
