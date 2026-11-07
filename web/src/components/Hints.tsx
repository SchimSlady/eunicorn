"use client";

import { useRef, useState } from "react";
import { Lightbulb } from "lucide-react";
import type { Hint } from "@eunicorn/schema";
import { hintLimit, type Difficulty } from "@/lib/difficulty";
import { Sheet } from "./Sheet";

/** What a level offers of a hint list: whether any hint is on offer, those used so far, and the next one. */
export function hintState(difficulty: Difficulty, hints: Hint[], used: number) {
  const offered = hintLimit(difficulty, hints.length);
  return { available: offered > 0, revealed: hints.slice(0, used), next: used < offered ? hints[used] : undefined, total: offered };
}

/**
 * Hints live behind a lightbulb: one tap opens everything revealed so far over the game, with the
 * next hint and its price at the bottom, so hints never pile up on the board. Nothing is shown
 * when the level offers no hints.
 */
export function Hints({
  available,
  revealed,
  next,
  onReveal,
  total,
  compact = false,
}: {
  available: boolean;
  revealed: Hint[];
  next: Hint | undefined;
  onReveal: () => void;
  /** How many hints this level offers in all; the sheet then shows every slot, the locked ones too. */
  total?: number;
  /** Just the lightbulb, to sit beside an input. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  if (!available && revealed.length === 0) return null;

  const close = () => {
    setOpen(false);
    button.current?.focus();
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={revealed.length ? `Hints, ${revealed.length} used` : "Hints"}
        className={`relative inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface text-sm font-medium hover:border-primary ${
          compact ? "h-[50px] w-12 shrink-0 justify-center" : "px-4"
        }`}
      >
        <Lightbulb size={compact ? 20 : 16} aria-hidden />
        {!compact && "Hints"}
        {revealed.length > 0 && (
          <span
            className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-on-primary ${
              compact ? "absolute -right-1 -top-1" : ""
            }`}
          >
            {revealed.length}
          </span>
        )}
      </button>
      {open && (
        <Sheet title="Hints" onClose={close}>
          <div className="pr-10">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-xl font-bold">Hints</h2>
              {/* One bar per hint this level offers, filled as they're used. */}
              {!!total && (
                <span className="flex gap-1" role="img" aria-label={`${revealed.length} of ${total} hints used`}>
                  {Array.from({ length: total }, (_, i) => (
                    <span key={i} className={`h-1.5 w-6 rounded-full transition-colors ${i < revealed.length ? "bg-primary" : "bg-border"}`} />
                  ))}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">Free, but they show in your share.</p>
          </div>
          {revealed.length > 0 && (
            // Newest first and larger, the one the player just asked for; earlier ones stay below,
            // smaller and muted (each hint is about a different startup or square, so none is dropped).
            <ol className="border-y border-border">
              {[...revealed].reverse().map((h, i) => {
                const n = revealed.length - i;
                return i === 0 ? (
                  <li key={`${n}-${h.text}`} className="flex animate-pop items-start gap-3 py-3.5 text-base font-semibold leading-snug">
                    <Lightbulb size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                    <span>
                      <span className="sr-only">Hint {n}: </span>
                      {h.text}
                    </span>
                  </li>
                ) : (
                  <li key={`${n}-${h.text}`} className={`flex items-start gap-3 py-2 text-sm leading-snug text-muted ${i === 1 ? "border-t border-border" : ""}`}>
                    <span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums">{n}</span>
                    <span>
                      <span className="sr-only">Hint {n}: </span>
                      {h.text}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          {next ? (
            <button
              type="button"
              onClick={onReveal}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 font-semibold text-on-primary transition active:scale-[0.98]"
            >
              <Lightbulb size={18} aria-hidden />
              {total ? `Reveal hint ${revealed.length + 1} of ${total}` : "Reveal a hint"}
            </button>
          ) : (
            revealed.length > 0 && <p className="text-center text-sm text-muted">That&apos;s every hint for this level.</p>
          )}
          <button type="button" onClick={close} className="mx-auto block min-h-11 px-4 text-sm font-semibold text-muted hover:text-foreground">
            Back to the game
          </button>
        </Sheet>
      )}
    </>
  );
}
