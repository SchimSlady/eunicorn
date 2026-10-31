"use client";

import { useEffect, useState } from "react";
import { msUntilNextPuzzle } from "@/lib/daily";

function format(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  // A clock, not index numbering. taste-skill-ignore
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export function Countdown() {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setMs(msUntilNextPuzzle());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <p className="text-center text-sm text-muted">
      Next puzzle in <span className="font-semibold tabular-nums text-foreground">{ms === null ? "--:--:--" : format(ms)}</span>
    </p>
  );
}
