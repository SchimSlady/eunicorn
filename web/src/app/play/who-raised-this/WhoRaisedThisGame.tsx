"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import type { Company, Dataset, Round, WhoRaisedThisPuzzle } from "@eunicorn/schema";
import { indexById, loadGame } from "@/lib/data";
import { getTodayResult, loadProgress, saveProgress, saveResult } from "@/lib/daily";
import { saveDifficulty, type Difficulty } from "@/lib/difficulty";
import { shareText as buildShareText } from "@/lib/scoring";
import { CompanyLogo } from "@/components/CompanyLogo";
import { CompanySearch } from "@/components/CompanySearch";
import { BuiltInEuropeCard } from "@/components/BuiltInEuropeCard";
import { GameIntro } from "@/components/GameIntro";
import { GameHeader } from "@/components/GameHeader";
import { Announce, NoPuzzle } from "@/components/Announce";
import { HintButton, HintList } from "@/components/HintButton";
import { ResultArea } from "@/components/ResultArea";
import { StatsPanel } from "@/components/StatsPanel";
import { recordFinish, recordStart } from "@/lib/stats";
import { DealBoard, GuessPills } from "./DealBoard";
import { RevealButton } from "@/components/RevealButton";

const MODE = "who-raised-this";
const TITLE = "Who Raised This?";
const MAX_SCORE = 10;

/** How each difficulty changes the rules. Same puzzle for everyone; only the help differs. */
const RULES: Record<Difficulty, { startClues: number; maxGuesses: number; hints: boolean; logosInSearch: boolean }> = {
  easy: { startClues: 3, maxGuesses: 8, hints: true, logosInSearch: true },
  medium: { startClues: 1, maxGuesses: 8, hints: true, logosInSearch: true },
  hard: { startClues: 1, maxGuesses: 4, hints: false, logosInSearch: false },
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
  const { won, score } = evaluate(p, progress);
  const squares = progress.guesses.map((id) => (id === p.answerCompanyId ? "🟩" : "🟥")); // share text, not UI. taste-skill-ignore
  const summary = won ? `Got it on guess ${progress.guesses.length}` : progress.gaveUp ? "Gave up" : "Missed it";
  return buildShareText({ number: p.number, modeTitle: TITLE, difficulty: progress.difficulty, hintsUsed: progress.hintsUsed, squares, summary, score, maxScore: MAX_SCORE });
}

export function WhoRaisedThisGame() {
  const [puzzle, setPuzzle] = useState<WhoRaisedThisPuzzle | null | undefined>(undefined);
  const [data, setData] = useState<Dataset | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    loadGame<WhoRaisedThisPuzzle>(MODE).then(({ puzzle: p, data: d }) => {
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
          const fresh: Progress = { difficulty: d, guesses: [], hintsUsed: 0, gaveUp: false };
          recordStart(MODE, d);
          setProgress(fresh);
          saveProgress(MODE, puzzle.date, fresh);
        }}
      />
    );
  }

  const answer = companies.get(puzzle.answerCompanyId)!;
  const { rules, maxGuesses, won, wrong, done, cluesShown, score } = evaluate(puzzle, progress);
  const guessesLeft = maxGuesses - wrong;

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
      recordFinish(MODE, next.difficulty, { bucket: result.won ? next.guesses.length : 0, score: result.score, maxScore: MAX_SCORE, won: result.won });
    }
  }

  // CC BY 4.0: rounds from the Tech.eu Funding Explorer must credit it, linked to the deal.
  const round = data.rounds.find((r) => r.id === puzzle.roundId) as (Round & { attributionUrl?: string }) | undefined;

  const founders = answer.founderIds
    .map((id) => data.people.find((p) => p.id === id)?.name)
    .filter((n): n is string => !!n);

  return (
    <div className="space-y-6">
      <GameHeader title={TITLE} difficulty={progress.difficulty} />
      <Announce
        text={
          done
            ? won
              ? `Right, it was ${answer.name}.`
              : `It was ${answer.name}.`
            : progress.guesses.length
              ? `${companies.get(progress.guesses.at(-1)!)?.name} is not it. New clue: ${puzzle.clues[cluesShown - 1].text}`
              : `First clue: ${puzzle.clues[0].text}`
        }
      />

      <DealBoard clues={puzzle.clues} cluesShown={cluesShown} done={done} answer={answer} round={round} />

      <GuessPills guesses={progress.guesses} answerId={answer.id} max={maxGuesses} />

      <HintList hints={puzzle.hints.slice(0, progress.hintsUsed)} />

      {progress.guesses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {progress.guesses.map((id, i) => {
            const c = companies.get(id);
            if (!c) return null;
            const right = id === answer.id;
            const latest = i === progress.guesses.length - 1;
            return (
              <span
                key={id}
                className={`flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-sm font-medium ${
                  right ? "bg-correct text-white" : `bg-wrong/15 text-wrong ${latest && !done ? "animate-shake" : ""}`
                }`}
              >
                <CompanyLogo company={c} size={22} />
                {right ? <Check size={14} aria-label="Right" /> : <X size={14} aria-label="Wrong" />}
                <span className={right ? "" : "line-through"}>{c.name}</span>
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
              <HintButton cost={puzzle.hints[progress.hintsUsed].cost} onClick={() => update({ ...progress, hintsUsed: progress.hintsUsed + 1 })} />
            )}
          </div>
          <RevealButton label="Reveal answer" onConfirm={() => update({ ...progress, gaveUp: true })} />
        </div>
      ) : (
        <div className="space-y-6">
          <ResultArea
            score={score}
            maxScore={MAX_SCORE}
            detail={
              won
                ? `${wrong + 1} ${wrong === 0 ? "guess" : "guesses"}${progress.hintsUsed ? ` · ${progress.hintsUsed} ${progress.hintsUsed === 1 ? "hint" : "hints"}` : ""}`
                : `It was ${answer.name}`
            }
            share={shareText(puzzle, progress)}
            stats={
              <StatsPanel
                mode={MODE}
                bucket={won ? progress.guesses.length : 0}
                scorePct={(score / MAX_SCORE) * 100}
                order={[1, 2, 3, 4, 5, 6, 7, 8, 0]}
                label={(b) => (b === 0 ? "X" : String(b))}
                axis="Guesses needed"
              />
            }
          />
          <BuiltInEuropeCard company={answer} founders={founders} />
          {round?.attributionUrl && (
            <p className="text-center text-sm text-muted">
              Funding data:{" "}
              <a href={round.attributionUrl} rel="noopener" className="text-primary underline">
                Tech.eu Funding Explorer
              </a>{" "}
              (CC BY 4.0)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
