"use client";

import type { PlayMode } from "@/lib/top10";

import { useEffect, useState } from "react";

import { loadStats, type PlayStats } from "@/lib/stats";

/** Below this many players a distribution is mostly empty columns, so only score and rank show. */
const MIN_PLAYERS_FOR_CHART = 20;

/**
 * Today's results of everyone, on the result screen: the player's points and rank side by side,
 * "Better than 69%", and one column per result (guess 1, 2, …, missed) with the player's own
 * column in the brand colour and labelled "You". Hidden when there are no stats yet
 * (e.g. the counter table isn't set up).
 *
 * Chart: one series, so no legend; columns keep the panel the same height however many results a
 * mode has. Grey #8b8f99 vs brand yellow, validated against the surface (contrast >= 3:1, ΔE 26
 * under CVD), and the "You" label carries the highlight too, so it's never colour alone. Every
 * column has its count in its accessible name and tooltip.
 */
export function StatsPanel({
  mode,
  bucket,
  score,
  maxScore,
  order,
  label,
  axis,
}: {
  mode: PlayMode;
  /** The player's own result bucket. */
  bucket: number;
  score: number;
  maxScore: number;
  /** Buckets in display order, e.g. [1..8, 0] with 0 = missed. */
  order: number[];
  /** Short column label: "3", "X". */
  label: (b: number) => string;
  /** What the columns count, for the caption and screen readers: "Guesses needed". */
  axis: string;
}) {
  const [stats, setStats] = useState<PlayStats | null | undefined>(undefined);

  useEffect(() => {
    loadStats(mode).then(setStats);
  }, [mode]);

  if (!stats || stats.finishes === 0) return null;

  const total = stats.finishes;
  const others = total - 1;
  // Stored scores are whole percent; compare like with like. The player's own row is in the counts.
  const mine = Math.round(maxScore ? (score / maxScore) * 100 : 0);
  const scores = Object.entries(stats.scores).map(([pct, n]) => [Number(pct), n] as const);
  const below = scores.reduce((s, [pct, n]) => s + (pct < mine ? n : 0), 0);
  const above = scores.reduce((s, [pct, n]) => s + (pct > mine ? n : 0), 0);
  const rank = Math.min(total, above + 1); // ties share a place
  const betterThan = others > 0 ? Math.round((below / others) * 100) : null;
  const max = Math.max(1, ...order.map((b) => stats.buckets[b] ?? 0));
  const fmt = (n: number) => n.toLocaleString("en-GB");

  return (
    <section className="space-y-5 rounded-2xl border border-border bg-surface p-5" aria-labelledby="stats-title">
      <h2 id="stats-title" className="sr-only">
        Today&apos;s players
      </h2>

      <div className="grid grid-cols-2 divide-x divide-border text-center">
        <div>
          <p className="text-sm text-muted">Your score</p>
          <p className="font-display text-4xl font-bold tabular-nums">{fmt(score)}</p>
          <p className="text-xs text-muted">of {fmt(maxScore)} points</p>
        </div>
        <div>
          <p className="text-sm text-muted">Rank</p>
          <p className="font-display text-4xl font-bold tabular-nums">#{fmt(rank)}</p>
          <p className="text-xs text-muted">
            of {fmt(total)} {total === 1 ? "player" : "players"} today
          </p>
        </div>
      </div>

      {betterThan === null ? (
        <p className="text-center font-display text-lg font-bold">First to finish today</p>
      ) : betterThan > 0 ? (
        <p className="text-center font-display text-lg font-bold">
          Better than <span className="text-primary">{betterThan}%</span>
        </p>
      ) : null}

      {total >= MIN_PLAYERS_FOR_CHART && (
        <figure>
          <ol className="flex h-36 items-end gap-1">
            {order.map((b) => {
              const n = stats.buckets[b] ?? 0;
              const you = b === bucket;
              const share = Math.round((n / total) * 100);
              const text = `${axis} ${label(b)}: ${n} ${n === 1 ? "player" : "players"} (${share}%)${you ? ", you" : ""}`;
              return (
                <li key={b} className="relative flex h-full min-w-0 flex-1 flex-col justify-end pt-5" title={text} aria-label={text}>
                  {you && (
                    <span className="mb-1 text-center text-xs font-bold text-primary" aria-hidden>
                      You
                    </span>
                  )}
                  <span
                    className={`w-full rounded-t-[4px] ${you ? "bg-primary" : "bg-[#8b8f99]"}`}
                    // Empty results keep a thin stub, so the baseline reads as a full range.
                    style={{ height: n > 0 ? `${Math.max(4, (n / max) * 100)}%` : 3 }}
                  />
                </li>
              );
            })}
          </ol>
          <div className="mt-1.5 flex justify-between text-xs tabular-nums text-muted" aria-hidden>
            <span>{label(order[0])}</span>
            <span>{label(order.at(-1)!)}</span>
          </div>
          <figcaption className="mt-1 text-center text-xs font-semibold uppercase tracking-widest text-muted">{axis}</figcaption>
        </figure>
      )}
    </section>
  );
}
