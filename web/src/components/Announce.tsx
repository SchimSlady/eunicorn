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
