"use client";

import type { PlayMode } from "@/lib/top10";

import { useRef, useState } from "react";
import { CircleHelp } from "lucide-react";

import { MODE_INFO } from "@/lib/modes";
import { Sheet } from "./Sheet";

/** The ? in the game header: the rules of this mode, in the same sheet as the results. */
export function HowToPlay({ mode }: { mode: PlayMode }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const info = MODE_INFO[mode];
  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`How to play ${info.title}`}
        className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:text-primary"
      >
        <CircleHelp size={22} aria-hidden />
      </button>
      {open && (
        <Sheet
          title={`How to play ${info.title}`}
          onClose={() => {
            setOpen(false);
            button.current?.focus();
          }}
        >
          <h2 className="pr-10 font-display text-xl font-bold">How to play</h2>
          <ol className="space-y-3">
            {info.rules.map((r, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <span>{r}</span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              button.current?.focus();
            }}
            className="min-h-11 w-full rounded-full bg-primary px-4 font-semibold text-on-primary"
          >
            Got it
          </button>
        </Sheet>
      )}
    </>
  );
}
