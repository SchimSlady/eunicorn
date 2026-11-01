"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame } from "lucide-react";
import { RESULTS_EVENT, streak } from "@/lib/daily";
import { LIVE_MODES } from "@/lib/modes";
import { Wordmark } from "./Wordmark";

/**
 * Bar on every page: the wordmark (back to all games) on the left, the streak on the right.
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
        </span>
      </div>
    </header>
  );
}
