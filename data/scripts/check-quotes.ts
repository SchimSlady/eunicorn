// Checks that every source quote in data/verified/<id>.json appears verbatim on its source page.
// Fetches each URL once, strips tags, decodes common entities, collapses whitespace, then looks for
// the quote (also whitespace-collapsed). Pages that can't be fetched are reported, not failed.
//
// Run: npx tsx data/scripts/check-quotes.ts revolut klarna      some companies
//      npx tsx data/scripts/check-quotes.ts                     every file
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, "../verified");
const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));

// Named entities that show up in European press pages; numeric entities are decoded generically.
const NAMED: Record<string, string> = {
  nbsp: " ", amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"',
  ndash: "-", mdash: "-", hellip: "...", euro: "€", pound: "£", eacute: "é", egrave: "è", ecirc: "ê", euml: "ë",
  aacute: "á", agrave: "à", acirc: "â", auml: "ä", aring: "å", ccedil: "ç", iacute: "í", icirc: "î", iuml: "ï",
  oacute: "ó", ocirc: "ô", ouml: "ö", oslash: "ø", uacute: "ú", ugrave: "ù", ucirc: "û", uuml: "ü", ntilde: "ñ",
  szlig: "ß", middot: "·", aelig: "æ", Eacute: "É", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", Aring: "Å", Oslash: "Ø", laquo: '"', raquo: '"',
};
const decode = (s: string) =>
  s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED[n] ?? m);
const norm = (s: string) =>
  decode(s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*>/g, " "))
    .replace(/ /g, " ").replace(/[’‘]/g, "'").replace(/[“”«»]/g, '"').replace(/[–—]/g, "-")
    .replace(/\s+/g, " ").toLowerCase();

const cache = new Map<string, string | null>();
async function page(url: string): Promise<string | null> {
  if (cache.has(url)) return cache.get(url)!;
  let text: string | null = null;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 EUnicorn/0.1" }, signal: AbortSignal.timeout(20000) });
    if (res.ok) {
      // Respect the page's charset (some French/German news sites still serve latin-1).
      const buf = new Uint8Array(await res.arrayBuffer());
      const head = new TextDecoder("latin1").decode(buf.slice(0, 2048));
      const charset = (res.headers.get("content-type")?.match(/charset=([\w-]+)/i)?.[1]
        ?? head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] ?? "utf-8").toLowerCase();
      let raw: string;
      try { raw = new TextDecoder(charset).decode(buf); } catch { raw = new TextDecoder("utf-8").decode(buf); }
      text = norm(raw);
    }
  } catch { text = null; }
  cache.set(url, text);
  return text;
}

let ok = 0, missing = 0, unreachable = 0, noQuote = 0;
for (const id of ids) {
  const c = JSON.parse(readFileSync(join(dir, `${id}.json`), "utf8"));
  const sources = [...(c.sources ?? []).map((s: any) => ({ ...s, where: "company" })),
    ...(c.rounds ?? []).flatMap((r: any) => (r.sources ?? []).map((s: any) => ({ ...s, where: r.month })))];
  const problems: string[] = [];
  for (const s of sources) {
    if (!s.quote) { noQuote++; problems.push(`  no quote  ${s.where} ${s.field}`); continue; }
    const text = await page(s.url);
    if (text === null) { unreachable++; problems.push(`  unreachable  ${s.where} ${s.field}  ${s.url}`); continue; }
    if (text.includes(norm(s.quote))) ok++;
    else { missing++; problems.push(`  NOT FOUND  ${s.where} ${s.field}  "${s.quote.slice(0, 70)}"  ${s.url}`); }
  }
  console.log(`${id}: ${problems.length ? problems.length + " problem(s)" : "ok"}`);
  for (const p of problems) console.log(p);
}
console.log(`\nquotes found ${ok}, not found ${missing}, page unreachable ${unreachable}, no quote ${noQuote}`);
