import { DIFFICULTIES, DIFFICULTY_META, type Difficulty } from "@/lib/difficulty";

/** Signal bars (1–3) instead of colored dots: yellow is the brand color, not a rating. */
export function DifficultyBars({ level, size = 14 }: { level: Difficulty; size?: number }) {
  const filled = DIFFICULTIES.indexOf(level) + 1;
  return (
    <span className="inline-flex items-end gap-[2px]" style={{ height: size }} aria-hidden>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-[3px] rounded-sm ${i <= filled ? "bg-current" : "bg-current opacity-25"}`}
          style={{ height: `${(i / 3) * 100}%` }}
        />
      ))}
    </span>
  );
}

export function DifficultyBadge({ level }: { level: Difficulty }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <DifficultyBars level={level} />
      {DIFFICULTY_META[level].label}
    </span>
  );
}
