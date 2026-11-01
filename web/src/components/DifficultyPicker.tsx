"use client";

import { useState } from "react";
import { DIFFICULTIES, DIFFICULTY_META, type Difficulty } from "@/lib/difficulty";

/** Three buttons (Easy · Medium · Hard) and Start. The level is fixed once the game starts. */
export function DifficultyPicker({ initial, onStart }: { initial: Difficulty; onStart: (d: Difficulty) => void }) {
  const [selected, setSelected] = useState<Difficulty>(initial);

  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="radiogroup" aria-label="Difficulty">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={d === selected}
            onClick={() => setSelected(d)}
            className={`min-h-11 flex-1 rounded-xl border-2 px-4 py-2 text-sm font-semibold transition ${
              d === selected
                ? "border-foreground bg-surface text-foreground"
                : "border-border text-muted hover:border-muted hover:text-foreground"
            }`}
          >
            {DIFFICULTY_META[d].label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onStart(selected)}
        className="w-full rounded-full bg-eu-yellow px-4 py-3 font-display text-lg font-bold text-eu-blue transition active:scale-[0.98]"
      >
        Start
      </button>
    </div>
  );
}
