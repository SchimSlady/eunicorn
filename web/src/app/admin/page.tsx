import type { Metadata } from "next";
import Link from "next/link";
import { todayKey } from "@/lib/daily";
import { MODES } from "@/lib/modes";
import { loadAdminData, type PlayerRow, type SummaryRow } from "@/lib/server/admin";

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

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ days?: string; day?: string }> }) {
  const params = await searchParams;
  const asked = Number(params.days);
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

      {data.ok ? (
        <Dashboard summary={data.summary} hours={data.hours} players={data.players} from={from} days={days} pickedDay={params.day} />
      ) : (
        <Setup reason={data.reason} />
      )}

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
  players,
  from,
  days,
  pickedDay,
}: {
  summary: SummaryRow[];
  hours: { hour: number; starts: number }[];
  players: PlayerRow[] | null;
  from: string;
  days: number;
  pickedDay?: string;
}) {
  const all = totalsBy(summary, () => "all").get("all") ?? { starts: 0, finishes: 0, solved: 0, scoreSum: 0 };
  const byDay = totalsBy(summary, (r) => r.played_on);
  const byMode = totalsBy(summary, (r) => r.mode);
  const byLevel = totalsBy(summary, (r) => r.difficulty);
  const dayList = Array.from({ length: days }, (_, i) => shiftDay(from, i));
  const byHour = new Map<number, number>();
  for (const h of hours) byHour.set(h.hour, (byHour.get(h.hour) ?? 0) + h.starts);
  // Player ids are daily hashes, so players are counted per day; a person playing on two days counts twice.
  const playersByDay = new Map<string, PlayerRow[]>();
  for (const p of players ?? []) playersByDay.set(p.played_on, [...(playersByDay.get(p.played_on) ?? []), p]);
  const playerDays = [...playersByDay.values()].reduce((n, l) => n + l.length, 0);
  const playerStarts = (players ?? []).reduce((n, p) => n + p.starts, 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label="Games started" value={fmt(all.starts)} />
        <Tile label="Games finished" value={fmt(all.finishes)} />
        <Tile label="Finish rate" value={pct(all.finishes, all.starts)} />
        <Tile label="Started per day" value={fmt(Math.round(all.starts / days))} />
        <Tile label="Players per day" value={playersByDay.size ? fmt(Math.round(playerDays / playersByDay.size)) : "–"} />
        <Tile label="Games per player" value={playerDays ? (playerStarts / playerDays).toFixed(1) : "–"} />
      </div>

      <Columns
        title="Games started per day"
        items={dayList.map((d) => ({ key: d, value: byDay.get(d)?.starts ?? 0, label: d.slice(5) }))}
        unit="games started"
      />

      <DayTable summary={summary} days={dayList} playersByDay={players ? playersByDay : null} />

      <PlayerList playersByDay={players ? playersByDay : null} pickedDay={pickedDay} days={days} />

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

/**
 * Games per puzzle day, newest first: totals plus games started per game. Days without any game
 * are left out so a quiet week doesn't push the numbers off screen.
 */
function DayTable({
  summary,
  days,
  playersByDay,
}: {
  summary: SummaryRow[];
  days: string[];
  playersByDay: Map<string, PlayerRow[]> | null;
}) {
  const byDay = totalsBy(summary, (r) => r.played_on);
  const byDayMode = totalsBy(summary, (r) => `${r.played_on}|${r.mode}`);
  const modes = [...totalsBy(summary, (r) => r.mode).entries()].sort((a, b) => b[1].starts - a[1].starts).map(([m]) => m);
  const rows = [...days].reverse().filter((d) => byDay.has(d));

  return (
    <section className="overflow-x-auto rounded-2xl border border-border bg-surface p-5">
      <h2 className="font-display text-lg font-bold">Games per day</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No games in this range.</p>
      ) : (
        <table className="mt-3 w-full text-sm tabular-nums">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-1.5 pr-4 font-semibold">Day</th>
              {playersByDay && <th className="py-1.5 pr-4 text-right font-semibold">Players</th>}
              <th className="py-1.5 pr-4 text-right font-semibold">Started</th>
              <th className="py-1.5 pr-4 text-right font-semibold">Finished</th>
              <th className="py-1.5 pr-4 text-right font-semibold">Finish rate</th>
              <th className="py-1.5 pr-4 text-right font-semibold">Solved</th>
              <th className="py-1.5 pr-4 text-right font-semibold">Avg score</th>
              {modes.map((m) => (
                <th key={m} className="py-1.5 pr-4 text-right font-semibold last:pr-0" title={`${TITLE.get(m) ?? m}: games started`}>
                  {TITLE.get(m) ?? m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => {
              const t = byDay.get(d)!;
              return (
                <tr key={d} className="border-t border-border">
                  <td className="whitespace-nowrap py-2 pr-4 font-semibold">{weekday(d)} {d}</td>
                  {playersByDay && (
                    <td className="py-2 pr-4 text-right">{playersByDay.has(d) ? fmt(playersByDay.get(d)!.length) : "–"}</td>
                  )}
                  <td className="py-2 pr-4 text-right">{fmt(t.starts)}</td>
                  <td className="py-2 pr-4 text-right">{fmt(t.finishes)}</td>
                  <td className="py-2 pr-4 text-right">{pct(t.finishes, t.starts)}</td>
                  <td className="py-2 pr-4 text-right">{pct(t.solved, t.finishes)}</td>
                  <td className="py-2 pr-4 text-right">{t.finishes ? `${Math.round(t.scoreSum / t.finishes)}%` : "–"}</td>
                  {modes.map((m) => (
                    <td key={m} className="py-2 pr-4 text-right last:pr-0">
                      {fmt(byDayMode.get(`${d}|${m}`)?.starts ?? 0)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

/**
 * The anonymous players of one day (pick the day with the links), most games first. The id is a
 * daily hash: the same person gets a new id the next day, so lists can't be linked across days.
 */
function PlayerList({
  playersByDay,
  pickedDay,
  days,
}: {
  playersByDay: Map<string, PlayerRow[]> | null;
  pickedDay?: string;
  days: number;
}) {
  if (!playersByDay) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-display text-lg font-bold">Players</h2>
        <p className="mt-2 text-sm text-muted">Player numbers need the admin_play_players function (Pablo&apos;s migration).</p>
      </section>
    );
  }
  const playerDays = [...playersByDay.keys()].sort().reverse();
  const day = pickedDay && playersByDay.has(pickedDay) ? pickedDay : playerDays[0];
  const list = day ? playersByDay.get(day)! : [];
  return (
    <section className="overflow-x-auto rounded-2xl border border-border bg-surface p-5">
      <h2 className="font-display text-lg font-bold">Players{day ? ` on ${weekday(day)} ${day}` : ""}</h2>
      <p className="text-sm text-muted">Anonymous ids that change every day, counted since 2 Nov 2026.</p>
      {playerDays.length > 1 && (
        <nav className="mt-3 flex flex-wrap gap-2" aria-label="Day">
          {playerDays.map((d) => (
            <Link
              key={d}
              href={`/admin?days=${days}&day=${d}`}
              aria-current={d === day ? "page" : undefined}
              className={`rounded-full border px-3 py-1 text-xs font-semibold tabular-nums ${
                d === day ? "border-primary bg-primary text-on-primary" : "border-border hover:border-primary"
              }`}
            >
              {d.slice(5)} · {playersByDay.get(d)!.length}
            </Link>
          ))}
        </nav>
      )}
      {list.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No players recorded in this range yet.</p>
      ) : (
        <table className="mt-3 w-full text-sm tabular-nums">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-1.5 pr-4 font-semibold">Player</th>
              <th className="py-1.5 pr-4 text-right font-semibold">Started</th>
              <th className="py-1.5 pr-4 text-right font-semibold">Finished</th>
              <th className="py-1.5 pr-4 text-right font-semibold">Solved</th>
              <th className="py-1.5 pr-4 text-right font-semibold">Avg score</th>
              <th className="py-1.5 font-semibold">Games</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.player} className="border-t border-border">
                <td className="py-2 pr-4 font-mono text-xs">{p.player.slice(0, 6)}</td>
                <td className="py-2 pr-4 text-right">{fmt(p.starts)}</td>
                <td className="py-2 pr-4 text-right">{fmt(p.finishes)}</td>
                <td className="py-2 pr-4 text-right">{fmt(p.solved)}</td>
                <td className="py-2 pr-4 text-right">{p.avg_score_pct == null ? "–" : `${Math.round(p.avg_score_pct)}%`}</td>
                <td className="py-2">{p.modes.map((m) => TITLE.get(m) ?? m).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/** "Mon", "Tue", ... for a puzzle day. */
function weekday(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
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
