"use client";

import { use, useEffect, useState } from "react";
import type { GameMode, Puzzle } from "@eunicorn/schema";
import { loadPuzzle, todayKey } from "@/lib/daily";

// Placeholder: shows the raw puzzle for the day. /web owner replaces this with one component per mode.
export default function PlayPage({ params }: { params: Promise<{ mode: GameMode }> }) {
  const { mode } = use(params);
  const [puzzle, setPuzzle] = useState<Puzzle | null | undefined>(undefined);
  // Until real daily puzzles exist, fall back to the fixture day.
  useEffect(() => {
    loadPuzzle(mode).then((p) => (p ? setPuzzle(p) : loadPuzzle(mode, "2026-11-01").then(setPuzzle)));
  }, [mode]);

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold">{mode}</h1>
      <p className="text-sm text-muted">Today: {todayKey()}</p>
      <pre className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface p-4 text-xs">
        {puzzle === undefined ? "Loading…" : JSON.stringify(puzzle, null, 2) ?? "No puzzle"}
      </pre>
    </main>
  );
}
