"use client";

import { useRef, useState } from "react";
import { Lightbulb, Lock } from "lucide-react";
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
            <h2 className="font-display text-xl font-bold">Hints</h2>
            <p className="mt-1 text-sm text-muted">
              {total ? `${revealed.length} of ${total} used. ` : ""}Free, but they show in your share.
            </p>
          </div>
          <ol className="space-y-2">
            {revealed.map((h, i) => (
              <li key={`${i}-${h.text}`} className="flex animate-pop items-start gap-3 rounded-2xl bg-eu-yellow/15 p-3 text-sm leading-snug">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">{i + 1}</span>
                <span className="pt-0.5">{h.text}</span>
              </li>
            ))}
            {next && (
              <li>
                <button
                  type="button"
                  onClick={onReveal}
                  className="flex min-h-12 w-full items-center gap-3 rounded-2xl border-2 border-dashed border-primary/60 p-3 text-left text-sm font-semibold transition hover:border-primary hover:bg-eu-yellow/10"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-primary text-primary">
                    <Lightbulb size={13} aria-hidden />
                  </span>
                  {revealed.length ? `Reveal hint ${revealed.length + 1}` : "Reveal the first hint"}
                </button>
              </li>
            )}
            {Array.from({ length: Math.max(0, (total ?? 0) - revealed.length - (next ? 1 : 0)) }, (_, i) => (
              <li key={`locked-${i}`} className="flex min-h-12 items-center gap-3 rounded-2xl border border-border p-3 text-sm text-muted">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface">
                  <Lock size={12} aria-hidden />
                </span>
                Hint {revealed.length + (next ? 2 : 1) + i}
              </li>
            ))}
          </ol>
          {!next && revealed.length > 0 && <p className="text-center text-sm text-muted">That&apos;s every hint for this level.</p>}
          <button type="button" onClick={close} className="mx-auto block min-h-11 px-4 text-sm font-semibold text-muted hover:text-foreground">
            Back to the game
          </button>
        </Sheet>
      )}
    </>
  );
}
