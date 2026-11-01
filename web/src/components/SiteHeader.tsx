"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, Flame } from "lucide-react";
import { RESULTS_EVENT, msUntilNextPuzzle, streak } from "@/lib/daily";
import { LIVE_MODES } from "@/lib/modes";
import { Wordmark } from "./Wordmark";

/**
 * Bar on every page: the wordmark (back to all games) on the left; on the right the time until
 * the next games, the streak and the square logo.
 * The streak counts a day if any mode was played; it updates when a game finishes.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [days, setDays] = useState(0);

  useEffect(() => {
    const refresh = () => setDays(streak(LIVE_MODES.map((m) => m.mode)));
    refresh();
    window.addEventListener(RESULTS_EVENT, refresh);
    return () => window.removeEventListener(RESULTS_EVENT, refresh);
  }, [pathname]);

  // Null until mounted: the server can't know the visitor's clock, so nothing renders there.
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(msUntilNextPuzzle());
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          aria-label="EUnicorn, all games"
          className="font-display text-xl font-bold leading-none"
        >
          <Wordmark />
        </Link>
        <span className="flex items-center gap-2">
          {left !== null && (
            <span
              className="flex items-center gap-1.5 text-sm text-muted"
              title="New games every day at midnight (Berlin time)"
              aria-label={`New games in ${untilText(left)}`}
            >
              <Clock size={15} aria-hidden />
              <span className="hidden sm:inline">New games in</span>
              <span className="font-semibold tabular-nums text-foreground">{untilText(left)}</span>
            </span>
          )}
          <span
            className={`flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm font-semibold ${days ? "" : "text-muted"}`}
            title="Days in a row with at least one game played"
            aria-label={`${days} day streak`}
          >
            <Flame
              size={16}
              className={days ? "text-primary" : ""}
              aria-hidden
            />{" "}
            {days}
          </span>
          {/* The square logo (also the site icon and the Instagram profile picture). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-square.png" alt="" width={28} height={28} className="h-7 w-7 rounded-md" />
        </span>
      </div>
    </header>
  );
}

/** "8h 43m", "43m", "<1m". */
function untilText(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "<1m";
  const h = Math.floor(min / 60);
  return h ? `${h}h ${min % 60}m` : `${min}m`;
}
