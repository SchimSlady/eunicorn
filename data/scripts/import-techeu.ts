// Copies the Tech.eu Funding Explorer (CC BY 4.0) into staging.techeu_rounds / staging.techeu_companies, unchanged.
// It reads the /changes feed: the first run walks it from the start (full backfill, ~1.5 hours because of
// Tech.eu's rate limits), later runs only fetch rows added since the last run and delete rows Tech.eu removed.
// Resumable: the feed cursor is saved after every page in staging.sync_state.
// Filtering (equity only, European only) and stage mapping happen later, when rows are promoted to public.*.
//
// Run: npm run import:techeu                 both feeds
//      npm run import:techeu -- rounds       one feed
//      npm run import:techeu -- rounds 3     at most 3 pages (for testing)
import type pg from "pg";
import { connect } from "./db.ts";

type Feed = "rounds" | "companies";
const API = "https://funding.tech.eu/api/v1/changes";
const START = "2000-01-01";
// Tech.eu allows 120 requests/minute, 600/hour and 2,000/day per IP. Stay under the hourly limit.
const MIN_INTERVAL_MS = 6_500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let lastRequest = 0;

async function fetchPage(feed: Feed, since: string, after?: string) {
  const params = new URLSearchParams({ type: feed, since, limit: "100" });
  if (after) params.set("after", after);
  for (let attempt = 1; ; attempt++) {
    await sleep(Math.max(0, lastRequest + MIN_INTERVAL_MS - Date.now()));
    lastRequest = Date.now();
    try {
      const res = await fetch(`${API}?${params}`);
      if (res.status === 429) {
        const wait = Number(res.headers.get("retry-after") ?? 60);
        console.log(`  rate limited, waiting ${wait}s`);
        await sleep(wait * 1000);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as {
        data: any[];
        removed: { id: string; reason?: string }[];
        nextCursor: string | null;
      };
    } catch (e) {
      if (attempt >= 5) throw e;
      console.log(`  ${(e as Error).message}, retry ${attempt}/4`);
      await sleep(attempt * 10_000);
    }
  }
}

const UPSERT: Record<Feed, string> = {
  rounds: `
    insert into staging.techeu_rounds (id, company_id, date, stage, amount_eur, confidence, payload, fetched_at)
    select (r->>'id')::uuid, (r->'company'->>'id')::uuid, (r->>'date')::date, r->>'stage',
           (r->>'amountEur')::numeric, r->>'confidence', r, now()
    from jsonb_array_elements($1::jsonb) r
    where r->'company'->>'id' is not null
    on conflict (id) do update set
      company_id = excluded.company_id, date = excluded.date, stage = excluded.stage,
      amount_eur = excluded.amount_eur, confidence = excluded.confidence,
      payload = excluded.payload, fetched_at = excluded.fetched_at`,
  companies: `
    insert into staging.techeu_companies (id, name, country, payload, fetched_at)
    select (c->>'id')::uuid, c->>'name', c->>'country', c, now()
    from jsonb_array_elements($1::jsonb) c
    on conflict (id) do update set
      name = excluded.name, country = excluded.country, payload = excluded.payload, fetched_at = excluded.fetched_at`,
};

async function sync(db: pg.Client, feed: Feed, maxPages: number) {
  const key = `techeu.${feed}.cursor`;
  const saved = (await db.query("select value from staging.sync_state where key = $1", [key])).rows[0]?.value;
  // A cursor looks like "<ISO timestamp>__<id>"; resume strictly after it.
  let cursor: string | undefined = saved;
  const since = saved ? saved.split("__")[0] : START;
  console.log(`${feed}: ${saved ? `resuming after ${saved}` : `full backfill from ${START}`}`);

  let pages = 0, rows = 0, removed = 0;
  while (pages < maxPages) {
    const page = await fetchPage(feed, since, cursor);
    pages++;
    await db.query("begin");
    if (pages === 1 && page.removed.length) {
      // Every page repeats the complete list of removals since `since`; apply it once.
      const ids = page.removed.map((r) => r.id);
      const table = feed === "rounds" ? "staging.techeu_rounds" : "staging.techeu_companies";
      removed = (await db.query(`delete from ${table} where id = any($1::uuid[])`, [ids])).rowCount ?? 0;
    }
    if (page.data.length) {
      rows += (await db.query(UPSERT[feed], [JSON.stringify(page.data)])).rowCount ?? 0;
    }
    if (page.nextCursor) {
      await db.query(
        `insert into staging.sync_state (key, value) values ($1, $2)
         on conflict (key) do update set value = excluded.value, updated_at = now()`,
        [key, page.nextCursor],
      );
    }
    await db.query("commit");
    if (pages % 10 === 0) console.log(`  ${feed}: ${pages} pages, ${rows} rows`);
    if (!page.nextCursor || page.data.length === 0) break;
    cursor = page.nextCursor;
  }
  console.log(`${feed}: ${rows} rows upserted, ${removed} removed, ${pages} pages`);
}

const [only, max] = process.argv.slice(2);
const feeds: Feed[] = only === "rounds" || only === "companies" ? [only] : ["companies", "rounds"];
const db = await connect();
try {
  for (const feed of feeds) await sync(db, feed, max ? Number(max) : Infinity);
  const { rows } = await db.query(`select
    (select count(*) from staging.techeu_companies) as companies,
    (select count(*) from staging.techeu_rounds) as rounds`);
  console.log(`staging now holds ${rows[0].companies} companies, ${rows[0].rounds} rounds`);
} finally {
  await db.end();
}
