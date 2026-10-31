// Copies the curated dataset and puzzles from /data into public/data so the app can fetch them.
// public/data is generated; edit files in /data instead.
import { cpSync, rmSync } from "node:fs";
import { join } from "node:path";

const web = join(import.meta.dirname, "..");
const out = join(web, "public/data");
rmSync(out, { recursive: true, force: true });
cpSync(join(web, "../data/seed/dataset.json"), join(out, "dataset.json"));
cpSync(join(web, "../data/puzzles"), join(out, "puzzles"), { recursive: true });
console.log("synced /data -> web/public/data");
