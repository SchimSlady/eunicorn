"use client";

import { useState } from "react";
import { DIFFICULTIES, DIFFICULTY_META, type Difficulty } from "@/lib/difficulty";
import { DifficultyBadge } from "./DifficultyBadge";

/**
 * Pre-game screen: pick one level, then start. The game is built from that choice
 * and the level can't be changed afterwards.
 */
export function DifficultyPicker({
  initial,
  rules,
  onStart,
}: {
  initial: Difficulty;
  /** One line per level describing what changes, e.g. "3 clues to start · 8 guesses · hints". */
  rules: Record<Difficulty, string>;
  onStart: (d: Difficulty) => void;
}) {
  const [selected, setSelected] = useState<Difficulty>(initial);

  return (
    <div className="space-y-4">
      <p className="font-semibold">Choose your level</p>
      <ul className="space-y-2" role="radiogroup" aria-label="Difficulty">
        {DIFFICULTIES.map((d) => {
          const checked = d === selected;
          return (
            <li key={d}>
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 bg-surface p-4 transition ${checked ? "border-primary" : "border-border"}`}
              >
                <input
                  type="checkbox"
                  role="radio"
                  aria-checked={checked}
                  checked={checked}
                  onChange={() => setSelected(d)}
                  className="h-5 w-5 accent-[var(--primary)]"
                />
                <span>
                  <span className="block font-semibold">
                    <DifficultyBadge level={d} />
                  </span>
                  <span className="block text-sm text-muted">{rules[d]}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => onStart(selected)}
        className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-on-primary transition active:scale-[0.98]"
      >
        Start · {DIFFICULTY_META[selected].label}
      </button>
      <p className="text-center text-xs text-muted">The level is fixed once the game starts.</p>
    </div>
  );
}
