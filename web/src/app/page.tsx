import Link from "next/link";
import type { GameMode } from "@eunicorn/schema";

const MODES: { mode: GameMode; title: string; blurb: string; emoji: string }[] = [
  { mode: "who-raised-this", title: "Who Raised This?", blurb: "Guess the startup from its funding round.", emoji: "💸" },
  { mode: "unicorn-grid", title: "Unicorn Grid", blurb: "Fill the 3×3 grid with European startups.", emoji: "🦄" },
  { mode: "higher-lower", title: "Higher or Lower", blurb: "Which one is valued higher?", emoji: "📈" },
  { mode: "impostor", title: "Impostor", blurb: "Spot the one that doesn't belong.", emoji: "🕵️" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-5xl font-extrabold tracking-tight">
        <span className="text-primary">EU</span>nicorn
      </h1>
      <p className="mt-4 text-muted">Daily games about the European startup ecosystem.</p>
      <p className="mt-1 font-semibold text-primary">Go build in Europe.</p>
      <ul className="mt-8 space-y-3">
        {MODES.map((m) => (
          <li key={m.mode}>
            <Link
              href={`/play/${m.mode}`}
              className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition hover:border-primary"
            >
              <span className="text-2xl">{m.emoji}</span>
              <span>
                <span className="block font-semibold">{m.title}</span>
                <span className="block text-sm text-muted">{m.blurb}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
