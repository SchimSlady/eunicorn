"use client";

import type { PlayMode } from "@/lib/top10";

import { useEffect, useState } from "react";

import { loadStats, type PlayStats } from "@/lib/stats";

/**
 * Today's results of everyone, on the result screen: how many played and solved, how the
 * player ranks ("better than 62%"), and a bar per result (guess 1, 2, …, missed) with the
 * player's own bar in the brand colour and labelled "You". Hidden when there are no stats yet
 * (e.g. the counter table isn't set up).
 *
 * Chart: one series, so no legend; direct labels on every bar (few bars); grey #8b8f99 vs
 * brand yellow, validated against the surface (contrast >= 3:1, ΔE 26 under CVD) and the
 * "You" label carries the highlight too, so it's never colour alone.
 */
export function StatsPanel({
  mode,
  bucket,
  scorePct,
  order,
  label,
  axis,
}: {
  mode: PlayMode;
  /** The player's own result bucket. */
  bucket: number;
  /** The player's score as % of the maximum. */
  scorePct: number;
  /** Buckets in display order, e.g. [1..8, 0] with 0 = missed. */
  order: number[];
  /** Short bar label: "3", "X". */
  label: (b: number) => string;
  /** What the bars count, for the caption and screen readers: "Guesses needed". */
  axis: string;
}) {
  const [stats, setStats] = useState<PlayStats | null | undefined>(undefined);

  useEffect(() => {
    loadStats(mode).then(setStats);
  }, [mode]);

  if (!stats || stats.finishes === 0) return null;

  const total = stats.finishes;
  const others = total - 1;
  // Share of the other players with a lower score (the player's own row is in the counts).
  const below = Object.entries(stats.scores).reduce((s, [pct, n]) => s + (Number(pct) < Math.round(scorePct) ? n : 0), 0);
  const betterThan = others > 0 ? Math.round((below / others) * 100) : null;
  const solvedPct = Math.round((stats.solved / total) * 100);
  const sameShare = Math.round(((stats.buckets[bucket] ?? 0) / total) * 100);
  const max = Math.max(1, ...order.map((b) => stats.buckets[b] ?? 0));

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-5" aria-labelledby="stats-title">
      <h2 id="stats-title" className="font-display text-lg font-bold">
        Today&apos;s players
      </h2>

      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          {betterThan === null ? (
            <>
              <p className="font-display text-3xl font-bold text-primary">1st</p>
              <p className="text-xs text-muted">to finish today</p>
            </>
          ) : betterThan > 0 ? (
            <>
              <p className="font-display text-3xl font-bold text-primary">{betterThan}%</p>
              <p className="text-xs text-muted">of players beaten</p>
            </>
          ) : (
            // Nobody beaten: say who's in the same boat instead of a discouraging 0%.
            <>
              <p className="font-display text-3xl font-bold text-primary">{sameShare}%</p>
              <p className="text-xs text-muted">{bucket === 0 ? "missed it too" : "did the same"}</p>
            </>
          )}
        </div>
        <div>
          <p className="font-display text-3xl font-bold">{solvedPct}%</p>
          <p className="text-xs text-muted">
            solved · {total} {total === 1 ? "player" : "players"}
          </p>
        </div>
      </div>

      <figure>
        <figcaption className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">{axis}</figcaption>
        <ol className="space-y-[2px]">
          {order.map((b) => {
            const n = stats.buckets[b] ?? 0;
            const mine = b === bucket;
            const share = Math.round((n / total) * 100);
            const text = `${axis} ${label(b)}: ${n} ${n === 1 ? "player" : "players"} (${share}%)${mine ? ", you" : ""}`;
            return (
              <li key={b} className="flex items-center gap-2" title={text} aria-label={text}>
                <span className="w-5 shrink-0 text-right text-sm font-semibold tabular-nums text-muted">{label(b)}</span>
                {/* Fixed room on the right for the labels, so every bar scales against the same width. */}
                <span className="flex h-6 flex-1 pr-24">
                  <span className="relative h-full" style={{ width: n > 0 ? `${Math.max(2, (n / max) * 100)}%` : 0 }}>
                    {n > 0 && <span className={`block h-full rounded-r-[4px] ${mine ? "bg-primary" : "bg-[#8b8f99]"}`} />}
                    <span className="absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap text-xs tabular-nums text-muted">
                      {n > 0 ? `${share}%` : ""}
                      {mine && <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-on-primary">You</span>}
                    </span>
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </figure>
    </section>
  );
}
