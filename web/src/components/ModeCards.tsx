"use client";

import type { PlayMode } from "@/lib/top10";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleCheck, Flame } from "lucide-react";

import { getTodayResult, loadTodayPuzzle, RESULTS_EVENT, streak, type DailyResult } from "@/lib/daily";
import { LIVE_MODES } from "@/lib/modes";
import { formatValuation } from "@/lib/scoring";
import { ModePreview } from "./ModePreview";

/** One card per mode: illustration, title, the mode's own day streak, and a ✓ with the score once played today. */
export function ModeCards() {
  const [results, setResults] = useState<Partial<Record<PlayMode, DailyResult>>>({});
  const [streaks, setStreaks] = useState<Partial<Record<PlayMode, number>>>({});

  useEffect(() => {
    const refresh = () => setStreaks(Object.fromEntries(LIVE_MODES.map((m) => [m.mode, streak(m.mode)])));
    refresh();
    window.addEventListener(RESULTS_EVENT, refresh);
    return () => window.removeEventListener(RESULTS_EVENT, refresh);
  }, []);

  useEffect(() => {
    const playable = LIVE_MODES.map((m) => m.mode);
    Promise.all(
      playable.map(async (mode) => {
        const p = await loadTodayPuzzle(mode);
        return [mode, p ? getTodayResult(mode, p.date) : null] as const;
      }),
    ).then((entries) => setResults(Object.fromEntries(entries.filter(([, r]) => r))));
  }, []);

  return (
    <div className="space-y-4">
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {LIVE_MODES.map((m) => {
          const result = results[m.mode];
          const card = (
            <>
              <div className="relative">
                <ModePreview mode={m.mode} />
                {result && (
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-correct">
                    <CircleCheck size={14} aria-hidden /> Played
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-lg font-bold leading-tight">{m.title}</p>
                  {!!streaks[m.mode] && (
                    <span
                      className="flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs font-semibold"
                      aria-label={`${streaks[m.mode]} day streak`}
                      title="Days in a row you played this game"
                    >
                      {streaks[m.mode]}
                      <Flame size={14} className="text-primary" aria-hidden />
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">{result ? `${formatValuation(result.score, result.maxScore)} valuation` : m.tagline}</p>
              </div>
            </>
          );
          const base = "block h-full overflow-hidden rounded-2xl border border-border bg-surface";
          return (
            <li key={m.mode}>
              <Link href={`/play/${m.mode}`} className={`${base} transition hover:-translate-y-0.5 hover:border-primary`}>
                {card}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
