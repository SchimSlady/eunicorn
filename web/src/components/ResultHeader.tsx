"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

/** What you did ("7 of 10 found", then the details). Confetti only for a perfect game. */
export function ResultHeader({ score, maxScore, detail }: { score: number; maxScore: number; detail: string }) {
  const perfect = score >= maxScore;
  const [headline, ...rest] = detail.split(" · ");

  useEffect(() => {
    if (!perfect) return;
    confetti({
      particleCount: 120,
      spread: 75,
      origin: { y: 0.3 },
      colors: ["#003399", "#ffcc00", "#ffffff"],
      disableForReducedMotion: true,
    });
  }, [perfect]);

  return (
    <div className="animate-pop text-center">
      {perfect && <p className="text-sm font-semibold text-primary">Perfect</p>}
      <p className="mt-1 font-display text-4xl font-bold">{headline}</p>
      {rest.length > 0 && <p className="mt-1 text-sm text-muted">{rest.join(" · ")}</p>}
    </div>
  );
}
