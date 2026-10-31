"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, CalendarDays, Check, Handshake, Image as ImageIcon, Lock, MapPin, Tag, Target, Users, X, type LucideIcon } from "lucide-react";
import type { Company, Dataset, WhoRaisedThisPuzzle } from "@eunicorn/schema";
import { indexById, loadDataset } from "@/lib/data";
import { getTodayResult, loadProgress, loadTodayPuzzle, saveProgress, saveResult } from "@/lib/daily";
import { saveDifficulty, type Difficulty } from "@/lib/difficulty";
import { shareText as buildShareText } from "@/lib/scoring";
import { CompanyLogo } from "@/components/CompanyLogo";
import { CompanySearch } from "@/components/CompanySearch";
import { BuiltInEuropeCard } from "@/components/BuiltInEuropeCard";
import { GameIntro } from "@/components/GameIntro";
import { GameHeader } from "@/components/GameHeader";
import { GameFooter } from "@/components/GameFooter";
import { HintButton, HintList } from "@/components/HintButton";
import { ResultHeader } from "@/components/ResultHeader";

const MODE = "who-raised-this";
const TITLE = "Who Raised This?";
const MAX_SCORE = 10;

/** How each difficulty changes the rules. Same puzzle for everyone; only the help differs. */
const RULES: Record<Difficulty, { startClues: number; maxGuesses: number; hints: boolean; logosInSearch: boolean }> = {
  easy: { startClues: 3, maxGuesses: 8, hints: true, logosInSearch: true },
  medium: { startClues: 1, maxGuesses: 8, hints: true, logosInSearch: true },
  hard: { startClues: 1, maxGuesses: 4, hints: false, logosInSearch: false },
};


const CLUE_ICONS: Record<WhoRaisedThisPuzzle["clues"][number]["kind"], LucideIcon> = {
  amount: Banknote,
  year: CalendarDays,
  sector: Tag,
  city: MapPin,
  "lead-investor": Target,
  investors: Handshake,
  founders: Users,
  "logo-blurred": ImageIcon,
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
  const { maxGuesses, score } = evaluate(p, progress);
  const squares = Array.from({ length: maxGuesses }, (_, i) => {
    const id = progress.guesses[i];
    if (id === undefined) return "⬜";
    return id === p.answerCompanyId ? "🟩" : "🟥"; // share text, not UI. taste-skill-ignore
  });
  return buildShareText({ number: p.number, modeTitle: TITLE, difficulty: progress.difficulty, hintsUsed: progress.hintsUsed, squares, score });
}

export function WhoRaisedThisGame() {
  const [puzzle, setPuzzle] = useState<WhoRaisedThisPuzzle | null | undefined>(undefined);
  const [data, setData] = useState<Dataset | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    Promise.all([loadTodayPuzzle<WhoRaisedThisPuzzle>(MODE), loadDataset()]).then(([p, d]) => {
      setData(d);
      setPuzzle(p);
      if (p) setProgress(loadProgress<Progress>(MODE, p.date));
    });
  }, []);

  const companies = useMemo(() => (data ? indexById(data.companies) : new Map<string, Company>()), [data]);

  if (puzzle === undefined || !data) return <p className="text-muted">Loading…</p>;
  if (puzzle === null) return <p className="text-muted">No puzzle today. Check back tomorrow.</p>;

  // No progress yet: choose the level first. The game is set up from that choice.
  if (!progress) {
    return (
      <GameIntro
        mode={MODE}
        onStart={(d) => {
          saveDifficulty(d);
          const fresh: Progress = { difficulty: d, guesses: [], hintsUsed: 0, gaveUp: false };
          setProgress(fresh);
          saveProgress(MODE, puzzle.date, fresh);
        }}
      />
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
      <GameHeader title={TITLE} difficulty={progress.difficulty} />

      <ol className="space-y-2">
        {puzzle.clues.slice(0, cluesShown).map((clue, i) => {
          const Icon = CLUE_ICONS[clue.kind];
          return (
            <li key={i} className="flex animate-flip-in items-center gap-3 rounded-2xl border border-border bg-surface p-3">
              <Icon size={20} className="shrink-0 text-primary" aria-hidden />
              {clue.kind === "logo-blurred" ? (
                <CompanyLogo company={answer} size={56} blurred={!done} />
              ) : (
                <span className="font-medium">{clue.text}</span>
              )}
            </li>
          );
        })}
        {!done && cluesLocked > 0 && (
          <li className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-3 text-sm text-muted">
            <Lock size={16} aria-hidden />
            {cluesLocked} more {cluesLocked === 1 ? "clue" : "clues"}
          </li>
        )}
      </ol>

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
              <HintButton onClick={() => update({ ...progress, hintsUsed: progress.hintsUsed + 1 })} />
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
        <div className="space-y-6">
          <ResultHeader
            score={score}
            maxScore={MAX_SCORE}
            detail={
              won
                ? `${wrong + 1} ${wrong === 0 ? "guess" : "guesses"}${progress.hintsUsed ? ` · ${progress.hintsUsed} ${progress.hintsUsed === 1 ? "hint" : "hints"}` : ""}`
                : `It was ${answer.name}`
            }
          />
          <BuiltInEuropeCard company={answer} founders={founders} />
          <GameFooter share={shareText(puzzle, progress)} />
        </div>
      )}
    </div>
  );
}
