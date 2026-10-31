"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Company, Dataset, WhoRaisedThisPuzzle } from "@eunicorn/schema";
import { indexById, loadDataset } from "@/lib/data";
import { getTodayResult, loadProgress, loadTodayPuzzle, saveProgress, saveResult } from "@/lib/daily";
import { DIFFICULTY_META, loadDifficulty, saveDifficulty, type Difficulty } from "@/lib/difficulty";
import { CompanyLogo } from "@/components/CompanyLogo";
import { CompanySearch } from "@/components/CompanySearch";
import { ShareButton } from "@/components/ShareButton";
import { Countdown } from "@/components/Countdown";
import { BuiltInEuropeCard } from "@/components/BuiltInEuropeCard";
import { DifficultyPicker } from "@/components/DifficultyPicker";

const MODE = "who-raised-this";
const MAX_SCORE = 10;

/** How each difficulty changes the rules. Same puzzle for everyone; only the help differs. */
const RULES: Record<Difficulty, { startClues: number; maxGuesses: number; hints: boolean; logosInSearch: boolean }> = {
  easy: { startClues: 3, maxGuesses: 8, hints: true, logosInSearch: true },
  medium: { startClues: 1, maxGuesses: 8, hints: true, logosInSearch: true },
  hard: { startClues: 1, maxGuesses: 4, hints: false, logosInSearch: false },
};

const RULES_TEXT: Record<Difficulty, string> = {
  easy: "3 clues to start · 8 guesses · hints",
  medium: "1 clue to start · 8 guesses · hints",
  hard: "1 clue to start · 4 guesses · no hints, no logos",
};

const CLUE_ICONS: Record<WhoRaisedThisPuzzle["clues"][number]["kind"], string> = {
  amount: "💶",
  year: "📅",
  sector: "🏷️",
  city: "📍",
  "lead-investor": "🎯",
  investors: "🤝",
  founders: "👥",
  "logo-blurred": "🖼️",
};

interface Progress {
  difficulty: Difficulty;
  guesses: string[]; // company ids, in order
  hintsUsed: number;
  gaveUp: boolean;
}

/** Everything derived from the puzzle + what the player has done so far. */
function evaluate(p: WhoRaisedThisPuzzle, progress: Progress) {
  const rules = RULES[progress.difficulty];
  const maxGuesses = Math.min(rules.maxGuesses, p.clues.length);
  const won = progress.guesses.includes(p.answerCompanyId);
  const wrong = progress.guesses.filter((id) => id !== p.answerCompanyId).length;
  const lost = !won && (progress.gaveUp || wrong >= maxGuesses);
  const done = won || lost;
  const hintCost = p.hints.slice(0, progress.hintsUsed).reduce((s, h) => s + h.cost, 0);
  return {
    rules,
    maxGuesses,
    won,
    wrong,
    done,
    // Each wrong guess reveals one more clue; when the game is over, show everything.
    cluesShown: done ? p.clues.length : Math.min(rules.startClues + wrong, p.clues.length),
    score: won ? Math.max(1, MAX_SCORE - wrong - hintCost) : 0,
  };
}

function shareText(p: WhoRaisedThisPuzzle, progress: Progress): string {
  const { maxGuesses, won, score } = evaluate(p, progress);
  const squares = Array.from({ length: maxGuesses }, (_, i) => {
    const id = progress.guesses[i];
    if (id === undefined) return "⬜";
    return id === p.answerCompanyId ? "🟩" : "🟥";
  });
  const level = DIFFICULTY_META[progress.difficulty];
  const hints = progress.hintsUsed ? ` 💡${progress.hintsUsed}` : "";
  return `EUnicorn #${p.number} 💸 Who Raised This? ${won ? `${score}/${MAX_SCORE}` : "X"}\n${level.emoji} ${level.label}\n${squares.join("")}${hints}\neunicorn.eu`;
}

export function WhoRaisedThisGame() {
  const [puzzle, setPuzzle] = useState<WhoRaisedThisPuzzle | null | undefined>(undefined);
  const [data, setData] = useState<Dataset | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    Promise.all([loadTodayPuzzle<WhoRaisedThisPuzzle>(MODE), loadDataset()]).then(([p, d]) => {
      setData(d);
      setPuzzle(p);
      if (p) {
        setProgress(loadProgress<Progress>(MODE, p.date));
      }
    });
  }, []);

  const companies = useMemo(() => (data ? indexById(data.companies) : new Map<string, Company>()), [data]);

  if (puzzle === undefined || !data) return <p className="text-muted">Loading…</p>;
  if (puzzle === null) return <p className="text-muted">No puzzle today. Check back tomorrow.</p>;

  const header = (
    <header className="flex items-baseline justify-between">
      <h1 className="text-2xl font-bold">Who Raised This?</h1>
      <span className="text-sm text-muted">
        {progress && `${DIFFICULTY_META[progress.difficulty].emoji} ${DIFFICULTY_META[progress.difficulty].label} · `}#{puzzle.number}
      </span>
    </header>
  );

  // No progress yet: choose the level first. The game is set up from that choice.
  if (!progress) {
    return (
      <div className="space-y-6">
        {header}
        <p className="text-muted">Guess the European startup behind a funding round. Every wrong guess reveals a new clue.</p>
        <DifficultyPicker
          initial={loadDifficulty()}
          rules={RULES_TEXT}
          onStart={(d) => {
            saveDifficulty(d);
            const fresh: Progress = { difficulty: d, guesses: [], hintsUsed: 0, gaveUp: false };
            setProgress(fresh);
            saveProgress(MODE, puzzle.date, fresh);
          }}
        />
      </div>
    );
  }

  const answer = companies.get(puzzle.answerCompanyId)!;
  const { rules, maxGuesses, won, wrong, done, cluesShown, score } = evaluate(puzzle, progress);
  const guessesLeft = maxGuesses - wrong;
  // Clues the player can still unlock: the last guess reveals nothing new.
  const cluesLocked = Math.min(puzzle.clues.length, rules.startClues + maxGuesses - 1) - cluesShown;

  function update(next: Progress) {
    setProgress(next);
    saveProgress(MODE, puzzle!.date, next);
    const result = evaluate(puzzle!, next);
    if (result.done && !getTodayResult(MODE, puzzle!.date)) {
      saveResult(MODE, {
        date: puzzle!.date,
        score: result.score,
        maxScore: MAX_SCORE,
        hintsUsed: next.hintsUsed,
        share: shareText(puzzle!, next),
      });
    }
  }

  const founders = answer.founderIds
    .map((id) => data.people.find((p) => p.id === id)?.name)
    .filter((n): n is string => !!n);

  return (
    <div className="space-y-6">
      {header}

      <ol className="space-y-2">
        {puzzle.clues.slice(0, cluesShown).map((clue, i) => (
          <li key={i} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
            <span className="text-xl" aria-hidden>
              {CLUE_ICONS[clue.kind]}
            </span>
            {clue.kind === "logo-blurred" ? (
              <CompanyLogo company={answer} size={56} blurred={!done} />
            ) : (
              <span className="font-medium">{clue.text}</span>
            )}
          </li>
        ))}
        {!done && cluesLocked > 0 && (
          <li className="rounded-xl border border-dashed border-border p-3 text-sm text-muted">
            🔒 {cluesLocked} more {cluesLocked === 1 ? "clue" : "clues"}, one per wrong guess
          </li>
        )}
      </ol>

      {progress.hintsUsed > 0 && (
        <ul className="space-y-2">
          {puzzle.hints.slice(0, progress.hintsUsed).map((h, i) => (
            <li key={i} className="rounded-xl bg-eu-yellow/20 p-3 text-sm">
              💡 {h.text}
            </li>
          ))}
        </ul>
      )}

      {progress.guesses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {progress.guesses.map((id) => {
            const c = companies.get(id);
            if (!c) return null;
            const right = id === answer.id;
            return (
              <span
                key={id}
                className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-medium ${right ? "bg-green-600 text-white" : "bg-red-600/15 text-red-700 line-through dark:text-red-300"}`}
              >
                <CompanyLogo company={c} size={22} />
                {c.name}
              </span>
            );
          })}
        </div>
      )}

      {!done ? (
        <div className="space-y-3">
          <CompanySearch
            companies={data.companies}
            exclude={new Set(progress.guesses)}
            showLogos={rules.logosInSearch}
            onPick={(c) => update({ ...progress, guesses: [...progress.guesses, c.id] })}
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">
              {guessesLeft} {guessesLeft === 1 ? "guess" : "guesses"} left
            </span>
            {rules.hints && progress.hintsUsed < puzzle.hints.length && (
              <button
                type="button"
                onClick={() => update({ ...progress, hintsUsed: progress.hintsUsed + 1 })}
                className="rounded-full border border-border px-3 py-1 font-medium hover:border-primary"
              >
                💡 Hint (−{puzzle.hints[progress.hintsUsed].cost})
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => update({ ...progress, gaveUp: true })}
            className="w-full text-center text-xs text-muted underline"
          >
            Reveal answer
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-3xl font-bold">{won ? `${score}/${MAX_SCORE}` : "Not this time"}</p>
            <p className="mt-1 text-muted">
              {won
                ? `Solved with ${wrong + 1} ${wrong === 0 ? "guess" : "guesses"}${progress.hintsUsed ? ` and ${progress.hintsUsed} 💡` : ""}`
                : `It was ${answer.name}.`}{" "}
              · {DIFFICULTY_META[progress.difficulty].emoji} {DIFFICULTY_META[progress.difficulty].label}
            </p>
          </div>
          <BuiltInEuropeCard company={answer} founders={founders} />
          <ShareButton text={shareText(puzzle, progress)} />
          <Countdown />
          <Link href="/" className="block text-center text-sm font-medium text-primary">
            ← More games
          </Link>
        </div>
      )}
    </div>
  );
}
