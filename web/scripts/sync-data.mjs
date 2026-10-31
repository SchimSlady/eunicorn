// Copies the curated dataset and puzzles from /data into public/data so the app can fetch them,
// and the circle-flags SVGs into public/flags, so no visitor request goes to a third-party CDN.
// Both folders are generated; edit files in /data instead.
import { cpSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const web = join(import.meta.dirname, "..");
const out = join(web, "public/data");
rmSync(out, { recursive: true, force: true });
cpSync(join(web, "../data/seed/dataset.json"), join(out, "dataset.json"));
cpSync(join(web, "../data/puzzles"), join(out, "puzzles"), { recursive: true });

const flags = join(web, "public/flags");
rmSync(flags, { recursive: true, force: true });
cpSync(join(web, "../node_modules/circle-flags/flags"), flags, { recursive: true });
// Which logo files exist, so the server can use /logos/<id>.svg|png when Supabase has no logo
// path yet. Generated (gitignored): public/ isn't readable from Vercel functions at runtime.
const logos = readdirSync(join(web, "public/logos")).filter((f) => /\.(svg|png)$/.test(f)).sort();
writeFileSync(join(web, "src/lib/server/logos.generated.json"), JSON.stringify(logos, null, 1) + "\n");

console.log("synced /data -> web/public/data, flags -> web/public/flags, logo list -> src/lib/server");
