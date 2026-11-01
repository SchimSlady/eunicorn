import "server-only";

/**
 * Usage numbers for /admin, from the service-role-only RPCs admin_play_summary and
 * admin_play_hours (supabase/migrations). Read with SUPABASE_SECRET_KEY, a server-only env var:
 * the publishable key can't call them.
 */

export interface SummaryRow {
  played_on: string;
  mode: string;
  difficulty: "easy" | "medium" | "hard";
  starts: number;
  finishes: number;
  solved: number;
  avg_score_pct: number | null;
}

export interface HourRow {
  hour: number;
  mode: string;
  starts: number;
}

export type AdminData =
  | { ok: true; summary: SummaryRow[]; hours: HourRow[] }
  | { ok: false; reason: string };

async function rpc<T>(name: string, from: string, to: string): Promise<T[] | string> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return "SUPABASE_URL or SUPABASE_SECRET_KEY is not set in Vercel.";
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ p_from: from, p_to: to }),
    cache: "no-store",
  }).catch(() => null);
  if (!res) return "Supabase is unreachable.";
  if (res.status === 404) return `The database function ${name} doesn't exist yet (Pablo's migration).`;
  if (!res.ok) return `Supabase ${name}: ${res.status} ${(await res.text()).slice(0, 200)}`;
  return (await res.json()) as T[];
}

export async function loadAdminData(from: string, to: string): Promise<AdminData> {
  const [summary, hours] = await Promise.all([
    rpc<SummaryRow>("admin_play_summary", from, to),
    rpc<HourRow>("admin_play_hours", from, to),
  ]);
  if (typeof summary === "string") return { ok: false, reason: summary };
  if (typeof hours === "string") return { ok: false, reason: hours };
  // bigint/numeric arrive as numbers or strings depending on size; normalise.
  return {
    ok: true,
    summary: summary.map((r) => ({
      ...r,
      starts: Number(r.starts),
      finishes: Number(r.finishes),
      solved: Number(r.solved),
      avg_score_pct: r.avg_score_pct == null ? null : Number(r.avg_score_pct),
    })),
    hours: hours.map((r) => ({ ...r, hour: Number(r.hour), starts: Number(r.starts) })),
  };
}
