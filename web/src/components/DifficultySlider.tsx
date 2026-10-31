"use client";

import { DIFFICULTIES, DIFFICULTY_META, type Difficulty } from "@/lib/difficulty";

/** Three-step slider: Easy · Medium · Hard. Locked once the game has started. */
export function DifficultySlider({
  value,
  onChange,
  locked,
}: {
  value: Difficulty;
  onChange: (d: Difficulty) => void;
  locked: boolean;
}) {
  const index = DIFFICULTIES.indexOf(value);
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">Difficulty</span>
        {locked && <span className="text-xs text-muted">🔒 locked for today</span>}
      </div>
      <input
        type="range"
        min={0}
        max={2}
        step={1}
        value={index}
        disabled={locked}
        onChange={(e) => onChange(DIFFICULTIES[Number(e.target.value)])}
        aria-label="Difficulty"
        aria-valuetext={DIFFICULTY_META[value].label}
        className="mt-2 w-full accent-[var(--primary)] disabled:opacity-50"
      />
      <div className="mt-1 grid grid-cols-3 text-xs">
        {DIFFICULTIES.map((d, i) => (
          <button
            key={d}
            type="button"
            disabled={locked}
            onClick={() => onChange(d)}
            className={`${i === 0 ? "text-left" : i === 1 ? "text-center" : "text-right"} ${d === value ? "font-semibold text-primary" : "text-muted"}`}
          >
            {DIFFICULTY_META[d].emoji} {DIFFICULTY_META[d].label}
          </button>
        ))}
      </div>
    </div>
  );
}
