"use client";

import type { PlayMode } from "@/lib/top10";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { loadDifficulty, type Difficulty } from "@/lib/difficulty";
import { MODE_INFO } from "@/lib/modes";
import { DifficultyPicker } from "./DifficultyPicker";
import { HowToPlay } from "./HowToPlay";
import { ModePreview } from "./ModePreview";

/** Before a game: illustration, one-line description, level buttons, Start. */
export function GameIntro({
  mode,
  subtitle,
  back = { href: "/", label: "All games" },
  onStart,
}: {
  mode: PlayMode;
  subtitle?: string;
  /** Where the back link goes: all games, or the Local tab for a local game. */
  back?: { href: string; label: string };
  onStart: (d: Difficulty) => void;
}) {
  const info = MODE_INFO[mode];
  return (
    <div className="mx-auto max-w-md space-y-6">
      <Link href={back.href} className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-primary">
        <ArrowLeft size={16} aria-hidden /> {back.label}
      </Link>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <ModePreview mode={mode} />
        <div className="space-y-5 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold">{info.title}</h1>
              {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
            </div>
            <HowToPlay mode={mode} />
          </div>
          <p className="text-muted">{info.description}</p>
          <DifficultyPicker initial={loadDifficulty()} onStart={onStart} />
        </div>
      </div>
    </div>
  );
}
