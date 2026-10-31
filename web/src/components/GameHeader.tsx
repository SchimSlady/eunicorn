import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Difficulty } from "@/lib/difficulty";
import { DifficultyBadge } from "./DifficultyBadge";

export function GameHeader({ title, number, difficulty }: { title: string; number: number; difficulty?: Difficulty }) {
  return (
    <header className="space-y-2">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-primary">
        <ArrowLeft size={16} aria-hidden /> All games
      </Link>
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        <span className="flex items-center gap-2 text-sm text-muted">
          {difficulty && <DifficultyBadge level={difficulty} />}
          <span>#{number}</span>
        </span>
      </div>
    </header>
  );
}
