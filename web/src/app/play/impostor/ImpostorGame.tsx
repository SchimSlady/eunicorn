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
import { HintButton, HintList } from "@/components/HintButton";
import { ResultArea } from "@/components/ResultArea";
import { StatsPanel } from "@/components/StatsPanel";
import { recordFinish, recordStart } from "@/lib/stats";

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

/** A puzzle may carry one variant per level (more options and a closer impostor on Hard). */
type Variant = Pick<ImpostorPuzzle, "prompt" | "companyIds" | "impostorId" | "explanation" | "hints"> & {
  /** Category not shown until the end (Medium/Hard): the player finds the pattern. */
  hidden?: boolean;
};
type Puzzle = ImpostorPuzzle & Variant & { variants?: Partial<Record<Difficulty, Variant>> };

/** The puzzle as played at this level; a hand-made puzzle without variants is the same for all. */
function atLevel(p: Puzzle, d: Difficulty): ImpostorPuzzle & Variant {
  return p.variants?.[d] ? { ...p, ...p.variants[d] } : p;
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
          recordStart(MODE, d);
          setProgress(fresh);
          saveProgress(MODE, puzzle.date, fresh);
        }}
      />
    );
  }

  const play = atLevel(puzzle, progress.difficulty);
  const { rules, won, wrong, done, score } = evaluate(play, progress);
  const triesLeft = rules.tries - wrong;
  const impostor = companies.get(play.impostorId)!;
  // End card features one of the genuine companies, preferring one with a fun fact.
  const genuine = play.companyIds.filter((id) => id !== play.impostorId).map((id) => companies.get(id)!);
  const featured = genuine.find((c) => c.funFact) ?? genuine[0];
  const featuredFounders = featured.founderIds
    .map((id) => data.people.find((p) => p.id === id)?.name)
    .filter((n): n is string => !!n);

  function update(next: Progress) {
    setProgress(next);
    saveProgress(MODE, puzzle!.date, next);
    const atLvl = atLevel(puzzle!, next.difficulty);
    const result = evaluate(atLvl, next);
    if (result.done && !getTodayResult(MODE, puzzle!.date)) {
      saveResult(MODE, {
        date: puzzle!.date,
        score: result.score,
        maxScore: MAX_SCORE,
        hintsUsed: next.hintsUsed,
        share: shareText(atLvl, next),
      });
      recordFinish(MODE, next.difficulty, { bucket: result.won ? next.picks.length : 0, score: result.score, maxScore: MAX_SCORE, won: result.won });
    }
  }

  return (
    <div className="space-y-6">
      <GameHeader title={TITLE} mode={MODE} difficulty={progress.difficulty} />
      <Announce
        text={
          won
            ? "Right, that's the impostor."
            : progress.picks.length
              ? `${companies.get(progress.picks.at(-1)!)?.name} belongs. ${triesLeft} ${triesLeft === 1 ? "try" : "tries"} left.`
              : ""
        }
      />

      {/* The five companies on a circle around the category; tap the one that doesn't belong. */}
      <div className="relative mx-auto aspect-square w-full max-w-[420px]">
        <span aria-hidden className="absolute inset-[13%] rounded-full border-2 border-dashed border-border" />
        <p className="absolute inset-[29%] flex items-center justify-center rounded-full bg-eu-blue p-3 text-center font-display text-sm font-bold leading-snug text-white sm:text-base">
          {play.hidden && !done ? "One of these doesn't belong. Which one?" : play.prompt}
        </p>
        <ul>
          {play.companyIds.map((id, i) => {
            const c = companies.get(id)!;
            const picked = progress.picks.includes(id);
            const isImpostor = id === play.impostorId;
            // While playing, only wrong picks are marked. Once done, reveal the impostor.
            const state = done ? (isImpostor ? "impostor" : "genuine") : picked ? "wrong" : "open";
            const ring = {
              open: "ring-border group-hover:ring-primary",
              wrong: "animate-shake ring-wrong opacity-60",
              impostor: "animate-pop ring-correct",
              genuine: "ring-border opacity-60",
            }[state];
            // Start at the top and go clockwise. Up to 6 options: big tiles 37% out; more: smaller tiles, wider ring.
            const a = -Math.PI / 2 + (i * 2 * Math.PI) / play.companyIds.length;
            const many = play.companyIds.length > 6;
            const r = many ? 40 : 37;
            return (
              <li
                key={id}
                className={`absolute -translate-x-1/2 -translate-y-1/2 ${many ? "w-[22%]" : "w-[30%]"}`}
                style={{ left: `${50 + r * Math.cos(a)}%`, top: `${50 + r * Math.sin(a)}%` }}
              >
                <button
                  type="button"
                  disabled={done || picked}
                  onClick={() => update({ ...progress, picks: [...progress.picks, id] })}
                  aria-label={`${c.name}${state === "wrong" ? ", not the impostor" : state === "impostor" ? ", the impostor" : ""}`}
                  className="group flex w-full flex-col items-center gap-1 text-center"
                >
                  <span className={`relative rounded-[22%] ring-[3px] transition ${ring}`}>
                    <CompanyLogo company={c} size={many ? 46 : 60} />
                    {state !== "open" && (
                      <span
                        className={`absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full ${
                          state === "wrong" ? "bg-wrong" : state === "impostor" ? "bg-correct" : "bg-border"
                        } text-white`}
                      >
                        {state === "wrong" && <X size={14} aria-hidden />}
                        {state === "impostor" && <VenetianMask size={14} aria-hidden />}
                        {state === "genuine" && <Check size={14} aria-hidden />}
                      </span>
                    )}
                  </span>
                  <span className={`line-clamp-2 text-xs font-semibold leading-tight ${state === "wrong" ? "line-through" : ""}`}>
                    {c.name}
                  </span>
                  {done && (
                    <span className="flex items-center gap-1 text-[10px] text-muted">
                      <Flag country={c.country} size={10} /> {c.city}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <HintList hints={play.hints.slice(0, progress.hintsUsed)} />

      {!done ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            {triesLeft} {triesLeft === 1 ? "try" : "tries"} left
          </span>
          {rules.hints && progress.hintsUsed < play.hints.length && (
            <HintButton cost={play.hints[progress.hintsUsed].cost} onClick={() => update({ ...progress, hintsUsed: progress.hintsUsed + 1 })} />
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <ResultArea
            score={score}
            maxScore={MAX_SCORE}
            detail={
              (won ? `${wrong + 1} ${wrong === 0 ? "try" : "tries"}` : `It was ${impostor.name}`) +
              (progress.hintsUsed ? ` · ${progress.hintsUsed} ${progress.hintsUsed === 1 ? "hint" : "hints"}` : "")
            }
            share={shareText(play, progress)}
            stats={
              <StatsPanel
                mode={MODE}
                bucket={won ? progress.picks.length : 0}
                scorePct={(score / MAX_SCORE) * 100}
                order={[1, 2, 3, 0]}
                label={(b) => (b === 0 ? "X" : String(b))}
                axis="Tries needed"
              />
            }
          />
          <p className="flex animate-flip-in items-start gap-2 rounded-2xl border border-border bg-surface p-4 text-sm">
            <VenetianMask size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden />
            {play.explanation}
          </p>
          <BuiltInEuropeCard company={featured} founders={featuredFounders} />
        </div>
      )}
    </div>
  );
}
