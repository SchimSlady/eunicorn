/**
 * Wrong-answer feedback (Pablo, 2026-11-03): a short, gentle sideways shake of the thing the player just
 * used (the search field, the chosen cards, the result badge), never the whole screen, like Wordle and
 * Connections. With a ring in the "wrong" colour that fades as it settles. Players who ask for reduced
 * motion get no shake (globals.css); the visible message next to it says the same in words.
 *
 * `n` counts the wrong answers in a row: the class alternates between two identical animations so each
 * new wrong answer replays it without remounting (which would close the phone keyboard).
 */
export function nudgeClass(n: number | undefined, { ring = true }: { ring?: boolean } = {}): string {
  if (!n) return "";
  if (!ring) return n % 2 ? "animate-shake" : "animate-shake-b";
  return n % 2 ? "animate-nudge" : "animate-nudge-b";
}
