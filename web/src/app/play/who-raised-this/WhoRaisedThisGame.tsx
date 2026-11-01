"use client";

import { useEffect, useMemo, useState } from "react";
import type { Company, Dataset, Round, WhoRaisedThisPuzzle } from "@eunicorn/schema";
import { indexById, loadGame } from "@/lib/data";
import { getTodayResult, loadProgress, saveProgress, saveResult } from "@/lib/daily";
import { saveDifficulty, type Difficulty } from "@/lib/difficulty";
import { shareText as buildShareText } from "@/lib/scoring";
import { CompanySearch } from "@/components/CompanySearch";
import { BuiltInEuropeCard } from "@/components/BuiltInEuropeCard";
import { GameIntro } from "@/components/GameIntro";
import { GameHeader } from "@/components/GameHeader";
import { Announce, GameSkeleton, NoPuzzle } from "@/components/Announce";
import { Hints, hintState } from "@/components/Hints";
import { ResultArea } from "@/components/ResultArea";
import { StatsPanel } from "@/components/StatsPanel";
import { recordFinish, recordStart } from "@/lib/stats";
import { DealBoard } from "./DealBoard";
import { RevealButton } from "@/components/RevealButton";

const MODE = "who-raised-this";
const TITLE = "Who Raised This?";
const MAX_SCORE = 10;

/** The same at every level: a level only changes which startup it is and how many hints are on offer. */
const START_CLUES = 1;

/** The part of the puzzle that differs by level. A hand-made puzzle has no variants: one for all. */
type Level = Pick<WhoRaisedThisPuzzle, "answerCompanyId" | "roundId" | "clues" | "hints">;
type Puzzle = WhoRaisedThisPuzzle & { variants?: Partial<Record<Difficulty, Level>> };

function atLevel(p: Puzzle, d: Difficulty): WhoRaisedThisPuzzle {
  const v = p.variants?.[d];
  return v ? { ...p, ...v } : p;
}

interface Progress {
  difficulty: Difficulty;
  guesses: string[]; // company ids, in order
  hintsUsed: number;
  gaveUp: boolean;
}

/** Everything derived from the puzzle + what the player has done so far. */
function evaluate(p: WhoRaisedThisPuzzle, progress: Progress) {
  const won = progress.guesses.includes(p.answerCompanyId);
  const wrong = progress.guesses.filter((id) => id !== p.answerCompanyId).length;
  const lost = !won && progress.gaveUp;
  const done = won || lost;
  const hintCost = p.hints.slice(0, progress.hintsUsed).reduce((s, h) => s + h.cost, 0);
  return {
    won,
    wrong,
    done,
    // Each wrong guess reveals one more clue; when the game is over, show everything.
    cluesShown: done ? p.clues.length : Math.min(START_CLUES + wrong, p.clues.length),
    score: won ? Math.max(1, MAX_SCORE - wrong - hintCost) : 0,
  };
}

function shareText(p: WhoRaisedThisPuzzle, progress: Progress): string {
  const { won } = evaluate(p, progress);
  const squares = progress.guesses.map((id) => (id === p.answerCompanyId ? "🟩" : "🟥")); // share text, not UI. taste-skill-ignore
  const summary = won ? `Got it on guess ${progress.guesses.length}` : progress.gaveUp ? "Gave up" : "Missed it";
  return buildShareText({ number: p.number, modeTitle: TITLE, difficulty: progress.difficulty, hintsUsed: progress.hintsUsed, squares, summary });
}

export function WhoRaisedThisGame() {
  const [puzzle, setPuzzle] = useState<Puzzle | null | undefined>(undefined);
  const [data, setData] = useState<Dataset | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    loadGame<Puzzle>(MODE).then(({ puzzle: p, data: d }) => {
      setData(d);
      setPuzzle(p);
      if (p) setProgress(loadProgress<Progress>(MODE, p.date));
    });
  }, []);

  const companies = useMemo(() => (data ? indexById(data.companies) : new Map<string, Company>()), [data]);

  if (puzzle === undefined || !data) return <GameSkeleton />;
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

  const play = atLevel(puzzle, progress.difficulty);
  const answer = companies.get(play.answerCompanyId)!;
  const { won, wrong, done, cluesShown, score } = evaluate(play, progress);

  function update(next: Progress) {
    setProgress(next);
    saveProgress(MODE, puzzle!.date, next);
    const atNext = atLevel(puzzle!, next.difficulty);
    const result = evaluate(atNext, next);
    if (result.done && !getTodayResult(MODE, puzzle!.date)) {
      saveResult(MODE, {
        date: puzzle!.date,
        score: result.score,
        maxScore: MAX_SCORE,
        hintsUsed: next.hintsUsed,
        share: shareText(atNext, next),
      });
      recordFinish(MODE, next.difficulty, { bucket: result.won ? Math.min(next.guesses.length, 8) : 0, score: result.score, maxScore: MAX_SCORE, won: result.won });
    }
  }

  // CC BY 4.0: rounds from the Tech.eu Funding Explorer must credit it, linked to the deal.
  const round = data.rounds.find((r) => r.id === play.roundId) as (Round & { attributionUrl?: string }) | undefined;

  const founders = answer.founderIds
    .map((id) => data.people.find((p) => p.id === id)?.name)
    .filter((n): n is string => !!n);

  return (
    <div className="space-y-6">
      <GameHeader title={TITLE} mode={MODE} difficulty={progress.difficulty} />
      <Announce
        text={
          done
            ? won
              ? `Right, it was ${answer.name}.`
              : `It was ${answer.name}.`
            : progress.guesses.length
              ? `${companies.get(progress.guesses.at(-1)!)?.name} is not it. New clue: ${play.clues[cluesShown - 1].text}`
              : `First clue: ${play.clues[0].text}`
        }
      />

      <DealBoard clues={play.clues} cluesShown={cluesShown} done={done} answer={answer} round={round} />

      {!done ? (
        <div className="space-y-3">
          <CompanySearch
            companies={data.companies}
            exclude={new Set(progress.guesses)}
            onPick={(c) => update({ ...progress, guesses: [...progress.guesses, c.id] })}
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">{wrong === 0 ? "No wrong guesses yet" : `${wrong} wrong`}</span>
            <Hints
              {...hintState(progress.difficulty, play.hints, progress.hintsUsed)}
              onReveal={() => update({ ...progress, hintsUsed: progress.hintsUsed + 1 })}
            />
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
            share={shareText(play, progress)}
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
          <BuiltInEuropeCard company={answer} founders={founders} reason="Today's answer" />
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
