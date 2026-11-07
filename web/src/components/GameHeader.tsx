import type { PlayMode } from "@/lib/top10";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { Difficulty } from "@/lib/difficulty";
import { DifficultyBadge } from "./DifficultyBadge";
import { HowToPlay } from "./HowToPlay";

/** Back link, title, level, and the ? that opens this mode's rules. */
export function GameHeader({
  title,
  subtitle,
  back = { href: "/", label: "All games" },
  mode,
  difficulty,
}: {
  title: string;
  subtitle?: string;
  back?: { href: string; label: string };
  mode: PlayMode;
  difficulty?: Difficulty;
}) {
  return (
    <header className="space-y-2">
      <Link href={back.href} className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-primary">
        <ArrowLeft size={16} aria-hidden /> {back.label}
      </Link>
      <div>
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 text-2xl font-bold">{title}</h1>
          <span className="flex shrink-0 items-center gap-1 text-sm text-muted">
            {difficulty && <DifficultyBadge level={difficulty} />}
            <HowToPlay mode={mode} />
          </span>
        </div>
        {/* Under the title at full width, so a longer line ("Biggest round: bigger or smaller?") doesn't wrap beside the level. */}
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
    </header>
  );
}
