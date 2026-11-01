"use client";

import { useRef, useState } from "react";
import { BarChart3 } from "lucide-react";
import { GameFooter } from "./GameFooter";
import { ResultHeader } from "./ResultHeader";
import { ShareButton } from "./ShareButton";
import { Sheet } from "./Sheet";

/**
 * The end of a game without the long scroll: a results sheet opens on top as soon as the game
 * is over (what you did, today's stats, share, countdown or play again), like Wordle. Closing it leaves
 * the finished board in view with a slim bar to reopen the results or share.
 */
export function ResultArea({
  score,
  maxScore,
  detail,
  share,
  stats,
}: {
  score: number;
  maxScore: number;
  detail: string;
  share: string;
  /** Today's players panel, shown inside the sheet. */
  stats?: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const reopen = useRef<HTMLButtonElement>(null);

  return (
    <>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
        <p className="min-w-0 flex-1 truncate font-display text-lg font-bold leading-tight">{detail}</p>
        <button
          ref={reopen}
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-semibold hover:border-primary"
        >
          <BarChart3 size={16} aria-hidden /> Results
        </button>
        <ShareButton text={share} compact />
      </div>

      {open && (
        <Sheet
          title="Your result"
          onClose={() => {
            setOpen(false);
            reopen.current?.focus();
          }}
        >
          <ResultHeader score={score} maxScore={maxScore} detail={detail} />
          {stats}
          <GameFooter share={share} />
        </Sheet>
      )}
    </>
  );
}
