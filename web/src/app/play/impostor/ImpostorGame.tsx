"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Company, Dataset, ImpostorPuzzle } from "@eunicorn/schema";
import { indexById, loadDataset } from "@/lib/data";
import { getTodayResult, loadProgress, loadTodayPuzzle, saveProgress, saveResult } from "@/lib/daily";
import { DIFFICULTY_META, loadDifficulty, saveDifficulty, type Difficulty } from "@/lib/difficulty";
import { CompanyLogo } from "@/components/CompanyLogo";
import { ShareButton } from "@/components/ShareButton";
import { Countdown } from "@/components/Countdown";
import { BuiltInEuropeCard } from "@/components/BuiltInEuropeCard";
import { DifficultyPicker } from "@/components/DifficultyPicker";

const MODE = "impostor";
const MAX_SCORE = 10;
const WRONG_PICK_COST = 4;

/** How each difficulty changes the rules. Same five companies for everyone. */
const RULES: Record<Difficulty, { tries: number; hints: boolean }> = {
  easy: { tries: 3, hints: true },
  medium: { tries: 2, hints: true },
  hard: { tries: 1, hints: false },
};

const RULES_TEXT: Record<Difficulty, string> = {
  easy: "3 tries · hints",
  medium: "2 tries · hints",
  hard: "1 try · no hints",
};

interface Progress {
  difficulty: Difficulty;
  picks: string[]; // company ids, in order
  hintsUsed: number;
}

function evaluate(p: ImpostorPuzzle, progress: Progress) {
  const rules = RULES[progress.difficulty];
  const won = progress.picks.includes(p.impostorId);
  const wrong = progress.picks.filter((id) => id !== p.impostorId).length;
  const done = won || wrong >= rules.tries;
  const hintCost = p.hints.slice(0, progress.hintsUsed).reduce((s, h) => s + h.cost, 0);
  return {
    rules,
    won,
    wrong,
    done,
    score: won ? Math.max(1, MAX_SCORE - wrong * WRONG_PICK_COST - hintCost) : 0,
  };
}

function shareText(p: ImpostorPuzzle, progress: Progress): string {
  const { rules, won, score } = evaluate(p, progress);
  const squares = Array.from({ length: rules.tries }, (_, i) => {
    const id = progress.picks[i];
    if (id === undefined) return "⬜";
    return id === p.impostorId ? "🟩" : "🟥";
  });
  const level = DIFFICULTY_META[progress.difficulty];
  const hints = progress.hintsUsed ? ` 💡${progress.hintsUsed}` : "";
  return `EUnicorn #${p.number} 🕵️ Impostor ${won ? `${score}/${MAX_SCORE}` : "X"}\n${level.emoji} ${level.label}\n${squares.join("")}${hints}\neunicorn.eu`;
}

export function ImpostorGame() {
  const [puzzle, setPuzzle] = useState<ImpostorPuzzle | null | undefined>(undefined);
  const [data, setData] = useState<Dataset | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    Promise.all([loadTodayPuzzle<ImpostorPuzzle>(MODE), loadDataset()]).then(([p, d]) => {
      setData(d);
      setPuzzle(p);
      if (p) setProgress(loadProgress<Progress>(MODE, p.date));
    });
  }, []);

  const companies = useMemo(() => (data ? indexById(data.companies) : new Map<string, Company>()), [data]);

  if (puzzle === undefined || !data) return <p className="text-muted">Loading…</p>;
  if (puzzle === null) return <p className="text-muted">No puzzle today. Check back tomorrow.</p>;

  const header = (
    <header className="flex items-baseline justify-between">
      <h1 className="text-2xl font-bold">Impostor</h1>
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
        <p className="text-muted">Five startups, one category. One of them doesn&apos;t belong. Find the impostor.</p>
        <DifficultyPicker
          initial={loadDifficulty()}
          rules={RULES_TEXT}
          onStart={(d) => {
            saveDifficulty(d);
            const fresh: Progress = { difficulty: d, picks: [], hintsUsed: 0 };
            setProgress(fresh);
            saveProgress(MODE, puzzle.date, fresh);
          }}
        />
      </div>
    );
  }

  const { rules, won, wrong, done, score } = evaluate(puzzle, progress);
  const triesLeft = rules.tries - wrong;
  const impostor = companies.get(puzzle.impostorId)!;
  // End card features one of the genuine companies, preferring one with a fun fact.
  const genuine = puzzle.companyIds.filter((id) => id !== puzzle.impostorId).map((id) => companies.get(id)!);
  const featured = genuine.find((c) => c.funFact) ?? genuine[0];
  const featuredFounders = featured.founderIds
    .map((id) => data.people.find((p) => p.id === id)?.name)
    .filter((n): n is string => !!n);

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

  return (
    <div className="space-y-6">
      {header}

      <p className="rounded-xl bg-eu-blue p-4 text-center text-lg font-semibold text-white">{puzzle.prompt}</p>

      <ul className="space-y-2">
        {puzzle.companyIds.map((id) => {
          const c = companies.get(id)!;
          const picked = progress.picks.includes(id);
          const isImpostor = id === puzzle.impostorId;
          // While playing, only wrong picks are marked. Once done, reveal the impostor.
          const state = done ? (isImpostor ? "impostor" : "genuine") : picked ? "wrong" : "open";
          const styles = {
            open: "border-border bg-surface hover:border-primary",
            wrong: "border-red-600/40 bg-red-600/10 opacity-60",
            impostor: "border-green-600 bg-green-600/10",
            genuine: "border-border bg-surface opacity-70",
          }[state];
          return (
            <li key={id}>
              <button
                type="button"
                disabled={done || picked}
                onClick={() => update({ ...progress, picks: [...progress.picks, id] })}
                className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition ${styles}`}
              >
                <CompanyLogo company={c} size={44} />
                <span className="flex-1">
                  <span className={`block font-semibold ${state === "wrong" ? "line-through" : ""}`}>{c.name}</span>
                  {done && (
                    <span className="block text-sm text-muted">
                      {c.city} · {c.founded}
                    </span>
                  )}
                </span>
                {state === "wrong" && <span aria-label="Not the impostor">❌</span>}
                {state === "impostor" && <span aria-label="The impostor">🕵️</span>}
                {state === "genuine" && <span aria-label="Belongs">✓</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {progress.hintsUsed > 0 && (
        <ul className="space-y-2">
          {puzzle.hints.slice(0, progress.hintsUsed).map((h, i) => (
            <li key={i} className="rounded-xl bg-eu-yellow/20 p-3 text-sm">
              💡 {h.text}
            </li>
          ))}
        </ul>
      )}

      {!done ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            {triesLeft} {triesLeft === 1 ? "try" : "tries"} left
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
      ) : (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-3xl font-bold">{won ? `${score}/${MAX_SCORE}` : "Not this time"}</p>
            <p className="mt-1 text-muted">
              {won ? `Found it with ${wrong + 1} ${wrong === 0 ? "try" : "tries"}` : `The impostor was ${impostor.name}.`}
              {progress.hintsUsed ? ` and ${progress.hintsUsed} 💡` : ""}
            </p>
          </div>
          <p className="rounded-xl border border-border bg-surface p-4 text-sm">🕵️ {puzzle.explanation}</p>
          <BuiltInEuropeCard company={featured} founders={featuredFounders} />
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
