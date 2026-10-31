"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { GameMode } from "@eunicorn/schema";
import { loadDifficulty, type Difficulty } from "@/lib/difficulty";
import { MODE_INFO } from "@/lib/modes";
import { DifficultyPicker } from "./DifficultyPicker";
import { HowToPlay } from "./HowToPlay";
import { ModePreview } from "./ModePreview";

/** Before a game: illustration, one-line description, level buttons, Start. */
export function GameIntro({ mode, onStart }: { mode: GameMode; onStart: (d: Difficulty) => void }) {
  const info = MODE_INFO[mode];
  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-primary">
        <ArrowLeft size={16} aria-hidden /> All games
      </Link>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <ModePreview mode={mode} />
        <div className="space-y-5 p-5">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">{info.title}</h1>
            <HowToPlay mode={mode} />
          </div>
          <p className="text-muted">{info.description}</p>
          <DifficultyPicker initial={loadDifficulty()} onStart={onStart} />
        </div>
      </div>
    </div>
  );
}
