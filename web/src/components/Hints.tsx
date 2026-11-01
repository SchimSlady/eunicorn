"use client";

import { useRef, useState } from "react";
import { Lightbulb } from "lucide-react";
import type { Hint } from "@eunicorn/schema";
import { hintLimit, type Difficulty } from "@/lib/difficulty";
import { Sheet } from "./Sheet";

/** What a level offers of a hint list: whether any hint is on offer, those used so far, and the next one. */
export function hintState(difficulty: Difficulty, hints: Hint[], used: number) {
  const offered = hintLimit(difficulty, hints.length);
  return { available: offered > 0, revealed: hints.slice(0, used), next: used < offered ? hints[used] : undefined };
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
}: {
  available: boolean;
  revealed: Hint[];
  next: Hint | undefined;
  onReveal: () => void;
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
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-medium hover:border-primary"
      >
        <Lightbulb size={16} aria-hidden />
        Hints
        {revealed.length > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-on-primary">
            {revealed.length}
          </span>
        )}
      </button>
      {open && (
        <Sheet title="Hints" onClose={close}>
          <h2 className="pr-10 font-display text-xl font-bold">Hints</h2>
          {revealed.length === 0 ? (
            <p className="text-muted">No hint used yet.</p>
          ) : (
            <ul className="space-y-2">
              {revealed.map((h, i) => (
                <li key={`${i}-${h.text}`} className="flex items-start gap-2 rounded-2xl bg-eu-yellow/20 p-3 text-sm">
                  <Lightbulb size={16} className="mt-0.5 shrink-0" aria-hidden />
                  {h.text}
                </li>
              ))}
            </ul>
          )}
          {next && <p className="text-sm text-muted">A hint lowers your score.</p>}
          {next ? (
            <button
              type="button"
              onClick={onReveal}
              className="min-h-11 w-full rounded-full border border-border bg-surface px-4 font-semibold hover:border-primary"
            >
              Reveal next hint
            </button>
          ) : (
            revealed.length > 0 && <p className="text-center text-sm text-muted">No more hints.</p>
          )}
          <button type="button" onClick={close} className="min-h-11 w-full rounded-full bg-primary px-4 font-semibold text-on-primary">
            Back to the game
          </button>
        </Sheet>
      )}
    </>
  );
}
