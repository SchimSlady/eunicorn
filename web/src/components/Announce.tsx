import Link from "next/link";

/** Read out to screen readers when the text changes (new clue, right or wrong). Invisible. */
export function Announce({ text }: { text: string }) {
  return (
    <p className="sr-only" aria-live="polite" aria-atomic="true">
      {text}
    </p>
  );
}

/** No puzzle for today: say so, and offer the other games instead of a dead end. */
export function NoPuzzle() {
  return (
    <div className="space-y-3 text-center">
      <p className="text-muted">No puzzle here today. Check back tomorrow.</p>
      <Link href="/" className="inline-flex min-h-11 items-center rounded-full border border-border px-5 font-semibold text-primary">
        Play another game
      </Link>
    </div>
  );
}

/**
 * Placeholder while a game loads: the shape of the intro screen (back link, card with the
 * preview, title, text, level buttons, Start), pulsing, so the page doesn't jump and the
 * footer doesn't sit in the middle of the screen.
 */
export function GameSkeleton() {
  const bar = "rounded-full bg-border/70";
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading the game">
      <div className={`h-4 w-24 ${bar}`} />
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="aspect-[4/3] bg-border/40" />
        <div className="space-y-4 p-5">
          <div className={`h-7 w-40 ${bar}`} />
          <div className={`h-4 w-full ${bar}`} />
          <div className={`h-4 w-3/4 ${bar}`} />
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-11 flex-1 ${bar}`} />
            ))}
          </div>
          <div className={`h-12 w-full ${bar}`} />
        </div>
      </div>
    </div>
  );
}
