"use client";

import type { PlayMode } from "@/lib/top10";

import { useEffect, useState } from "react";
import Link from "next/link";

import { DIFFICULTY_META, type Difficulty } from "@/lib/difficulty";
import { joinBoard, loadBoard, savedName, type Board, type BoardEntry } from "@/lib/leaderboard";

const MESSAGES = {
  name: "Pick another name: 2 to 16 letters, numbers, spaces, dots, dashes or underscores.",
  duplicate: "This device is already on today's board.",
  error: "Couldn't save that. Try again later.",
} as const;

/**
 * Today's leaderboard for this game and level, on the result screen. Optional: the player can add
 * themselves under a name they choose, and is only on the board if they do. Hidden when the
 * leaderboard isn't set up.
 */
export function Leaderboard({
  mode,
  difficulty,
  scorePct,
  hintsUsed,
}: {
  mode: PlayMode;
  difficulty: Difficulty;
  /** The player's score as % of the maximum. */
  scorePct: number;
  hintsUsed: number;
}) {
  const [board, setBoard] = useState<Board | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<keyof typeof MESSAGES | null>(null);

  useEffect(() => {
    setName(savedName());
    loadBoard(mode, difficulty).then(setBoard);
  }, [mode, difficulty]);

  if (!board) return null;

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setProblem(null);
    const result = await joinBoard({ mode, difficulty, name, scorePct, hints: hintsUsed });
    if (result !== "ok" && result !== "duplicate") setProblem(result);
    if (result === "duplicate") setProblem("duplicate");
    setBoard(await loadBoard(mode, difficulty));
    setBusy(false);
  }

  const inTop = board.you ? board.top.some((r) => r.rank === board.you!.rank && r.name === board.you!.name) : false;
  const row = (r: BoardEntry, you: boolean) => (
    <li
      key={`${r.rank}-${r.name}-${you}`}
      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${you ? "bg-primary/15 font-semibold" : ""}`}
    >
      <span className="w-6 text-right font-display font-bold text-primary">{r.rank}</span>
      <span className="min-w-0 flex-1 truncate">{r.name}</span>
      {r.hints > 0 && <span className="text-xs text-muted">{r.hints} {r.hints === 1 ? "hint" : "hints"}</span>}
      <span className="w-8 text-right tabular-nums">{r.scorePct}</span>
    </li>
  );

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-5" aria-labelledby="board-title">
      <h2 id="board-title" className="font-display text-lg font-bold">
        Leaderboard <span className="text-sm font-normal text-muted">· {DIFFICULTY_META[difficulty].label}, today</span>
      </h2>

      {board.top.length > 0 && (
        <ol className="space-y-0.5">
          {board.top.map((r) => row(r, board.you ? inTop && r.rank === board.you.rank && r.name === board.you.name : false))}
          {board.you && !inTop && (
            <>
              <li aria-hidden className="px-3 text-center text-muted">…</li>
              {row(board.you, true)}
            </>
          )}
        </ol>
      )}

      {board.you ? (
        <p className="text-sm text-muted">
          You&apos;re #{board.you.rank} of {board.total} today.
        </p>
      ) : (
        <form onSubmit={join} className="space-y-2">
          <label htmlFor="board-name" className="text-sm font-semibold">
            Add your name to today&apos;s board <span className="font-normal text-muted">(optional)</span>
          </label>
          <div className="flex gap-2">
            <input
              id="board-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              autoComplete="nickname"
              placeholder="Your name"
              className="min-h-11 min-w-0 flex-1 rounded-full border border-border bg-background px-4"
            />
            <button
              type="submit"
              disabled={busy || name.trim().length < 2}
              className="min-h-11 rounded-full bg-primary px-5 font-semibold text-on-primary disabled:opacity-50"
            >
              Add me
            </button>
          </div>
          {problem && (
            <p role="alert" className="text-sm text-wrong">
              {MESSAGES[problem]}
            </p>
          )}
          <p className="text-xs text-muted">
            Your name and score are shown here, to everyone, for 30 days.{" "}
            <Link href="/privacy" className="underline">
              Privacy
            </Link>
          </p>
        </form>
      )}
    </section>
  );
}
