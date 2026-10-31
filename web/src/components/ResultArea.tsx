"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BarChart3, X } from "lucide-react";
import { formatRaised, verdict } from "@/lib/scoring";
import { GameFooter } from "./GameFooter";
import { ResultHeader } from "./ResultHeader";
import { ShareButton } from "./ShareButton";

/**
 * The end of a game without the long scroll: a results sheet opens on top as soon as the game
 * is over (score, today's stats, share, countdown or play again), like Wordle. Closing it leaves
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
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold leading-tight">{formatRaised(score)}</p>
          <p className="truncate text-xs text-muted">{verdict(score, maxScore)}</p>
        </div>
        <button
          ref={reopen}
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-semibold hover:border-primary"
        >
          <BarChart3 size={16} aria-hidden /> Results
        </button>
        <ShareButton text={share} compact onCannotCopy={() => setOpen(true)} />
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

/** Overlay: a bottom sheet on phones, a centred card on wider screens. Escape or a tap outside closes it. */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // the page behind doesn't scroll
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  // Rendered into <body>, so no ancestor (transforms, animations) can shift or clip it.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90dvh] w-full max-w-md animate-pop space-y-5 overflow-y-auto rounded-t-3xl border border-border bg-background p-5 pb-8 outline-none sm:rounded-3xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-muted hover:text-foreground"
        >
          <X size={20} aria-hidden />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
