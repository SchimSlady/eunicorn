"use client";

import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import type { GameMode } from "@eunicorn/schema";
import { loadDifficulty, type Difficulty } from "@/lib/difficulty";
import { MODE_INFO } from "@/lib/modes";
import { DifficultyPicker } from "./DifficultyPicker";
import { ModePreview } from "./ModePreview";

/** Overview before a game starts: illustration, what it is, how it works, level choice. */
export function GameIntro({
  mode,
  number,
  rules,
  onStart,
}: {
  mode: GameMode;
  number: number;
  rules: Record<Difficulty, string>;
  onStart: (d: Difficulty) => void;
}) {
  const info = MODE_INFO[mode];
  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-primary">
        <ArrowLeft size={16} aria-hidden /> All games
      </Link>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <ModePreview mode={mode} />
        <div className="space-y-4 p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="text-2xl font-bold">{info.title}</h1>
            <span className="text-sm text-muted">#{number}</span>
          </div>
          <p>{info.description}</p>
          <ul className="space-y-2 text-sm text-muted">
            {info.howTo.map((rule) => (
              <li key={rule} className="flex gap-2">
                <Check size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                {rule}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <DifficultyPicker initial={loadDifficulty()} rules={rules} onStart={onStart} />
    </div>
  );
}
