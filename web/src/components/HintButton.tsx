import { Lightbulb } from "lucide-react";
import type { Hint } from "@eunicorn/schema";

/** The next hint, with its price on the button, so nobody pays a cost they couldn't see. */
export function HintButton({ onClick, cost }: { onClick: () => void; cost: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-sm font-medium hover:border-primary"
    >
      <Lightbulb size={16} aria-hidden />
      Hint <span className="text-muted">−€{cost}m</span>
    </button>
  );
}

export function HintList({ hints }: { hints: Hint[] }) {
  if (hints.length === 0) return null;
  return (
    <ul className="space-y-2">
      {hints.map((h, i) => (
        <li key={i} className="flex animate-flip-in items-start gap-2 rounded-2xl bg-eu-yellow/20 p-3 text-sm">
          <Lightbulb size={16} className="mt-0.5 shrink-0" aria-hidden />
          {h.text}
        </li>
      ))}
    </ul>
  );
}
