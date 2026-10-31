// Postgres connection to the linked Supabase project (the EUnicorn project, see `supabase link`).
// Reads SUPABASE_DB_PASSWORD from the repo .env without a shell, so special characters are safe.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const repo = join(import.meta.dirname, "../..");

function readEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of readFileSync(join(repo, ".env"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

export async function connect(): Promise<pg.Client> {
  const password = process.env.SUPABASE_DB_PASSWORD ?? readEnv().SUPABASE_DB_PASSWORD;
  if (!password) throw new Error("SUPABASE_DB_PASSWORD missing in .env");
  // Written by `supabase link`: session-mode pooler URL for the linked project, without password.
  const url = new URL(process.env.DATABASE_URL ?? readFileSync(join(repo, "supabase/.temp/pooler-url"), "utf8").trim());
  url.password = encodeURIComponent(password); // pg ignores a separate password when given a URL
  // Supabase's pooler certificate is not signed by a public CA, so we encrypt but skip CA verification.
  const client = new pg.Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  return client;
}
