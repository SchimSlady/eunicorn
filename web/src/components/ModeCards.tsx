"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleCheck } from "lucide-react";
import type { GameMode } from "@eunicorn/schema";
import { getTodayResult, loadTodayPuzzle, type DailyResult } from "@/lib/daily";
import { MODES } from "@/lib/modes";
import { formatRaised } from "@/lib/scoring";
import { ModePreview } from "./ModePreview";

/** One card per mode: illustration, PLAY, title, and a ✓ with the score once played today. */
export function ModeCards() {
  const [results, setResults] = useState<Partial<Record<GameMode, DailyResult>>>({});

  useEffect(() => {
    const playable = MODES.map((m) => m.mode);
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
        {MODES.map((m) => {
          const result = results[m.mode];
          const card = (
            <>
              <div className="relative">
                <ModePreview mode={m.mode} />
                {result && (
                  <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-correct">
                    <CircleCheck size={14} aria-hidden /> Played
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="font-display text-lg font-bold leading-tight">{m.title}</p>
                <p className="mt-1 text-sm text-muted">{result ? formatRaised(result.score) : m.tagline}</p>
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
