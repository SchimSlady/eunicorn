"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, VenetianMask, X } from "lucide-react";
import type { Company, Dataset, ImpostorPuzzle } from "@eunicorn/schema";
import { indexById, loadGame } from "@/lib/data";
import { getTodayResult, loadProgress, saveProgress, saveResult } from "@/lib/daily";
import { saveDifficulty, type Difficulty } from "@/lib/difficulty";
import { shareText as buildShareText } from "@/lib/scoring";
import { CompanyLogo } from "@/components/CompanyLogo";
import { BuiltInEuropeCard } from "@/components/BuiltInEuropeCard";
import { GameIntro } from "@/components/GameIntro";
import { Flag } from "@/components/Flag";
import { GameHeader } from "@/components/GameHeader";
import { Announce, NoPuzzle } from "@/components/Announce";
import { GameFooter } from "@/components/GameFooter";
import { HintButton, HintList } from "@/components/HintButton";
import { ResultHeader } from "@/components/ResultHeader";

const MODE = "impostor";
const TITLE = "Impostor";
const MAX_SCORE = 10;
const WRONG_PICK_COST = 4;

/** How each difficulty changes the rules. Same five companies for everyone. */
const RULES: Record<Difficulty, { tries: number; hints: boolean }> = {
  easy: { tries: 3, hints: true },
  medium: { tries: 2, hints: true },
  hard: { tries: 1, hints: false },
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
  const { won, score } = evaluate(p, progress);
  const squares = progress.picks.map((id) => (id === p.impostorId ? "🟩" : "🟥")); // share text, not UI. taste-skill-ignore
  const summary = won ? `Found it on try ${progress.picks.length}` : "Missed it";
  return buildShareText({ number: p.number, modeTitle: TITLE, difficulty: progress.difficulty, hintsUsed: progress.hintsUsed, squares, summary, score, maxScore: MAX_SCORE });
}

export function ImpostorGame() {
  const [puzzle, setPuzzle] = useState<ImpostorPuzzle | null | undefined>(undefined);
  const [data, setData] = useState<Dataset | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    loadGame<ImpostorPuzzle>(MODE).then(({ puzzle: p, data: d }) => {
      setData(d);
      setPuzzle(p);
      if (p) setProgress(loadProgress<Progress>(MODE, p.date));
    });
  }, []);

  const companies = useMemo(() => (data ? indexById(data.companies) : new Map<string, Company>()), [data]);

  if (puzzle === undefined || !data) return <p className="text-muted">Loading…</p>;
  if (puzzle === null) return <NoPuzzle />;

  // No progress yet: choose the level first. The game is set up from that choice.
  if (!progress) {
    return (
      <GameIntro
        mode={MODE}
        onStart={(d) => {
          saveDifficulty(d);
          const fresh: Progress = { difficulty: d, picks: [], hintsUsed: 0 };
          setProgress(fresh);
          saveProgress(MODE, puzzle.date, fresh);
        }}
      />
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
      <GameHeader title={TITLE} difficulty={progress.difficulty} />
      <Announce
        text={
          won
            ? "Right, that's the impostor."
            : progress.picks.length
              ? `${companies.get(progress.picks.at(-1)!)?.name} belongs. ${triesLeft} ${triesLeft === 1 ? "try" : "tries"} left.`
              : ""
        }
      />

      <p className="rounded-2xl bg-eu-blue p-4 text-center font-display text-lg font-bold text-white">{puzzle.prompt}</p>

      <ul className="space-y-2">
        {puzzle.companyIds.map((id) => {
          const c = companies.get(id)!;
          const picked = progress.picks.includes(id);
          const isImpostor = id === puzzle.impostorId;
          // While playing, only wrong picks are marked. Once done, reveal the impostor.
          const state = done ? (isImpostor ? "impostor" : "genuine") : picked ? "wrong" : "open";
          const styles = {
            open: "border-border bg-surface hover:border-primary",
            wrong: "animate-shake border-wrong/50 bg-wrong/10 opacity-70",
            impostor: "animate-pop border-correct bg-correct/10",
            genuine: "border-border bg-surface opacity-70",
          }[state];
          return (
            <li key={id}>
              <button
                type="button"
                disabled={done || picked}
                onClick={() => update({ ...progress, picks: [...progress.picks, id] })}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${styles}`}
              >
                <CompanyLogo company={c} size={44} />
                <span className="flex-1">
                  <span className={`block font-semibold ${state === "wrong" ? "line-through" : ""}`}>{c.name}</span>
                  {done && (
                    <span className="flex items-center gap-1.5 text-sm text-muted">
                      <Flag country={c.country} size={14} /> {c.city} · {c.founded}
                    </span>
                  )}
                </span>
                {state === "wrong" && <X size={20} className="text-wrong" aria-label="Not the impostor" />}
                {state === "impostor" && <VenetianMask size={22} className="text-correct" aria-label="The impostor" />}
                {state === "genuine" && <Check size={20} className="text-muted" aria-label="Belongs" />}
              </button>
            </li>
          );
        })}
      </ul>

      <HintList hints={puzzle.hints.slice(0, progress.hintsUsed)} />

      {!done ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            {triesLeft} {triesLeft === 1 ? "try" : "tries"} left
          </span>
          {rules.hints && progress.hintsUsed < puzzle.hints.length && (
            <HintButton cost={puzzle.hints[progress.hintsUsed].cost} onClick={() => update({ ...progress, hintsUsed: progress.hintsUsed + 1 })} />
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <ResultHeader
            score={score}
            maxScore={MAX_SCORE}
            detail={
              (won ? `${wrong + 1} ${wrong === 0 ? "try" : "tries"}` : `It was ${impostor.name}`) +
              (progress.hintsUsed ? ` · ${progress.hintsUsed} ${progress.hintsUsed === 1 ? "hint" : "hints"}` : "")
            }
          />
          <p className="flex animate-flip-in items-start gap-2 rounded-2xl border border-border bg-surface p-4 text-sm">
            <VenetianMask size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden />
            {puzzle.explanation}
          </p>
          <BuiltInEuropeCard company={featured} founders={featuredFounders} />
          <GameFooter share={shareText(puzzle, progress)} />
        </div>
      )}
    </div>
  );
}
