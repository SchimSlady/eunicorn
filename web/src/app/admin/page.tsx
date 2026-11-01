import type { Metadata } from "next";
import Link from "next/link";
import { todayKey } from "@/lib/daily";
import { MODES } from "@/lib/modes";
import { loadAdminData, type SummaryRow } from "@/lib/server/admin";

/**
 * Internal usage dashboard: how often each game is started and finished, by day, game, level and
 * hour. Behind a password (src/middleware.ts), linked from nowhere and not indexed.
 * Visitors, referrers and countries are in Vercel Analytics, not here.
 */

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const RANGES = [7, 30, 90] as const;
const TITLE = new Map(MODES.map((m) => [m.mode as string, m.title]));

function shiftDay(day: string, by: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + by);
  return d.toISOString().slice(0, 10);
}

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");
const fmt = (n: number) => n.toLocaleString("en-GB");

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const asked = Number((await searchParams).days);
  const days = (RANGES as readonly number[]).includes(asked) ? asked : 30;
  const to = todayKey();
  const from = shiftDay(to, -(days - 1));
  const data = await loadAdminData(from, to);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Usage</h1>
          <p className="text-sm text-muted">
            {from} to {to} (puzzle days, Europe/Berlin)
          </p>
        </div>
        <nav className="flex gap-2" aria-label="Range">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin?days=${r}`}
              aria-current={r === days ? "page" : undefined}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
                r === days ? "border-primary bg-primary text-on-primary" : "border-border hover:border-primary"
              }`}
            >
              {r} days
            </Link>
          ))}
        </nav>
      </div>

      {data.ok ? <Dashboard summary={data.summary} hours={data.hours} from={from} days={days} /> : <Setup reason={data.reason} />}

      <p className="text-sm text-muted">
        Visitors, referrers, countries and devices: Vercel dashboard, project EUnicorn, Analytics.
      </p>
    </main>
  );
}

function Setup({ reason }: { reason: string }) {
  return (
    <section className="space-y-2 rounded-2xl border border-border bg-surface p-5">
      <h2 className="font-display text-lg font-bold">No data yet</h2>
      <p className="text-sm text-muted">{reason}</p>
      <p className="text-sm text-muted">
        Needed: the migration with admin_play_summary and admin_play_hours applied, and SUPABASE_SECRET_KEY set in Vercel
        (then redeploy).
      </p>
    </section>
  );
}

type Totals = { starts: number; finishes: number; solved: number; scoreSum: number };

function totalsBy(rows: SummaryRow[], key: (r: SummaryRow) => string): Map<string, Totals> {
  const out = new Map<string, Totals>();
  for (const r of rows) {
    const t = out.get(key(r)) ?? { starts: 0, finishes: 0, solved: 0, scoreSum: 0 };
    t.starts += r.starts;
    t.finishes += r.finishes;
    t.solved += r.solved;
    t.scoreSum += (r.avg_score_pct ?? 0) * r.finishes;
    out.set(key(r), t);
  }
  return out;
}

function Dashboard({
  summary,
  hours,
  from,
  days,
}: {
  summary: SummaryRow[];
  hours: { hour: number; starts: number }[];
  from: string;
  days: number;
}) {
  const all = totalsBy(summary, () => "all").get("all") ?? { starts: 0, finishes: 0, solved: 0, scoreSum: 0 };
  const byDay = totalsBy(summary, (r) => r.played_on);
  const byMode = totalsBy(summary, (r) => r.mode);
  const byLevel = totalsBy(summary, (r) => r.difficulty);
  const dayList = Array.from({ length: days }, (_, i) => shiftDay(from, i));
  const byHour = new Map<number, number>();
  for (const h of hours) byHour.set(h.hour, (byHour.get(h.hour) ?? 0) + h.starts);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Games started" value={fmt(all.starts)} />
        <Tile label="Games finished" value={fmt(all.finishes)} />
        <Tile label="Finish rate" value={pct(all.finishes, all.starts)} />
        <Tile label="Started per day" value={fmt(Math.round(all.starts / days))} />
      </div>

      <Columns
        title="Games started per day"
        items={dayList.map((d) => ({ key: d, value: byDay.get(d)?.starts ?? 0, label: d.slice(5) }))}
        unit="games started"
      />

      <Table
        title="By game"
        first="Game"
        rows={[...byMode.entries()].sort((a, b) => b[1].starts - a[1].starts).map(([m, t]) => [TITLE.get(m) ?? m, t])}
      />
      <Table
        title="By level"
        first="Level"
        rows={(["easy", "medium", "hard"] as const).filter((l) => byLevel.has(l)).map((l) => [l[0].toUpperCase() + l.slice(1), byLevel.get(l)!])}
      />

      <Columns
        title="Games started by hour (Berlin time)"
        items={Array.from({ length: 24 }, (_, h) => ({ key: String(h), value: byHour.get(h) ?? 0, label: `${String(h).padStart(2, "0")}:00` }))}
        unit="games started"
      />
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-display text-3xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

/** One series of columns, brand yellow; the count is in each column's tooltip and accessible name. */
function Columns({ title, items, unit }: { title: string; items: { key: string; value: number; label: string }[]; unit: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const peak = items.reduce((p, i) => (i.value > p.value ? i : p), items[0]);
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {peak?.value > 0 && (
        <p className="text-sm text-muted">
          Peak {peak.label}: {fmt(peak.value)}
        </p>
      )}
      <ol className="mt-4 flex h-40 items-end gap-[2px]">
        {items.map((i) => {
          const text = `${i.label}: ${fmt(i.value)} ${unit}`;
          return (
            <li key={i.key} className="group flex h-full min-w-0 flex-1 flex-col justify-end" title={text} aria-label={text}>
              <span
                className="w-full rounded-t-[4px] bg-primary group-hover:opacity-80"
                style={{ height: i.value > 0 ? `${Math.max(3, (i.value / max) * 100)}%` : 2, opacity: i.value > 0 ? undefined : 0.3 }}
              />
            </li>
          );
        })}
      </ol>
      <div className="mt-1.5 flex justify-between text-xs tabular-nums text-muted" aria-hidden>
        <span>{items[0]?.label}</span>
        <span>{items.at(-1)?.label}</span>
      </div>
    </section>
  );
}

function Table({ title, first, rows }: { title: string; first: string; rows: [string, Totals][] }) {
  return (
    <section className="overflow-x-auto rounded-2xl border border-border bg-surface p-5">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No games in this range.</p>
      ) : (
        <table className="mt-3 w-full text-sm tabular-nums">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-1.5 pr-4 font-semibold">{first}</th>
              <th className="py-1.5 pr-4 text-right font-semibold">Started</th>
              <th className="py-1.5 pr-4 text-right font-semibold">Finished</th>
              <th className="py-1.5 pr-4 text-right font-semibold">Finish rate</th>
              <th className="py-1.5 pr-4 text-right font-semibold">Solved</th>
              <th className="py-1.5 text-right font-semibold">Avg score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, t]) => (
              <tr key={name} className="border-t border-border">
                <td className="py-2 pr-4 font-semibold">{name}</td>
                <td className="py-2 pr-4 text-right">{fmt(t.starts)}</td>
                <td className="py-2 pr-4 text-right">{fmt(t.finishes)}</td>
                <td className="py-2 pr-4 text-right">{pct(t.finishes, t.starts)}</td>
                <td className="py-2 pr-4 text-right">{pct(t.solved, t.finishes)}</td>
                <td className="py-2 text-right">{t.finishes ? `${Math.round(t.scoreSum / t.finishes)}%` : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
