// Copies the curated dataset and puzzles from /data into public/data so the app can fetch them,
// and the circle-flags SVGs into public/flags, so no visitor request goes to a third-party CDN.
// Both folders are generated; edit files in /data instead.
import { cpSync, rmSync } from "node:fs";
import { join } from "node:path";

const web = join(import.meta.dirname, "..");
const out = join(web, "public/data");
rmSync(out, { recursive: true, force: true });
cpSync(join(web, "../data/seed/dataset.json"), join(out, "dataset.json"));
cpSync(join(web, "../data/puzzles"), join(out, "puzzles"), { recursive: true });

const flags = join(web, "public/flags");
rmSync(flags, { recursive: true, force: true });
cpSync(join(web, "../node_modules/circle-flags/flags"), flags, { recursive: true });
console.log("synced /data -> web/public/data, flags -> web/public/flags");
