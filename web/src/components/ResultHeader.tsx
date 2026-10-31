"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { formatRaised, verdict } from "@/lib/scoring";

/** Score as "€8M raised" plus a verdict. Confetti only for a perfect round. */
export function ResultHeader({ score, maxScore, detail }: { score: number; maxScore: number; detail: string }) {
  const perfect = score >= maxScore;

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
      <p className="text-sm font-semibold text-muted">{verdict(score, maxScore)}</p>
      <p className="mt-1 font-display text-4xl font-bold">{formatRaised(score)}</p>
      <p className="mt-1 text-sm text-muted">
        of €{maxScore}M · {detail}
      </p>
    </div>
  );
}
