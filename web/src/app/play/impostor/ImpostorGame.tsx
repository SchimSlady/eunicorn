"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, VenetianMask } from "lucide-react";
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
import { Announce, GameSkeleton, NoPuzzle } from "@/components/Announce";
import { ResultArea } from "@/components/ResultArea";
import { RevealButton } from "@/components/RevealButton";
import { nudgeClass } from "@/lib/nudge";
import { StatsPanel } from "@/components/StatsPanel";
import { recordFinish, recordStart } from "@/lib/stats";

const MODE = "impostor";
const TITLE = "Impostor";
/**
 * Select-then-submit (Pablo, 2026-11-02): the player selects the startups they think don't belong
 * (how many is not shown) and submits. A wrong submit only says "Not quite"; the fewer tries, the
 * better. Score for today's stats and the leaderboard: 100 / tries (1 try = 100, 2 = 50, ...).
 */
const MAX_SCORE = 100;
/** Tries from this number on share one column in the chart ("6+"). */
const TRIES_CAP = 6;

interface Progress {
  difficulty: Difficulty;
  /** Currently selected company ids. */
  selected: string[];
  /** Every submitted selection, in order; the last one is right when the game is won. */
  tries: string[][];
  hintsUsed: number;
  gaveUp?: boolean;
}

/** Progress saved by the earlier pick-one-at-a-time version had `picks`; start those afresh. */
function normalise(p: Progress | null): Progress | null {
  if (!p) return null;
  return { ...p, selected: p.selected ?? [], tries: p.tries ?? [] };
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id));

/** A puzzle may carry one variant per level (the startups' fame differs). */
type Variant = Pick<ImpostorPuzzle, "prompt" | "companyIds" | "impostorId" | "explanation" | "hints"> & {
  /** Every company that doesn't belong, when there is more than one. */
  impostorIds?: string[];
};
type Puzzle = ImpostorPuzzle & Variant & { variants?: Partial<Record<Difficulty, Variant>> };
type Play = ImpostorPuzzle & { impostorIds?: string[] };

const impostorsOf = (p: Play) => p.impostorIds ?? [p.impostorId];

/** The puzzle as played at this level; a hand-made puzzle without variants is the same for all. */
function atLevel(p: Puzzle, d: Difficulty): Play {
  return p.variants?.[d] ? { ...p, ...p.variants[d] } : p;
}

function evaluate(p: Play, progress: Progress) {
  const impostors = impostorsOf(p);
  const tries = progress.tries.length;
  const won = progress.tries.some((t) => sameSet(t, impostors));
  const done = won || !!progress.gaveUp;
  // Hints are free (Pablo, 2026-11-02): they show in the share text and break leaderboard ties, but cost nothing.
  return { won, tries, done, score: won ? Math.round(MAX_SCORE / tries) : 0 };
}

const triesText = (n: number) => `${n} ${n === 1 ? "try" : "tries"}`;

function shareText(p: Play, progress: Progress): string {
  const { won, tries } = evaluate(p, progress);
  // One square per try: red for a wrong submit, green for the right one.
  const squares = progress.tries.map((t) => (sameSet(t, impostorsOf(p)) ? "🟩" : "🟥")); // share text, not UI. taste-skill-ignore
  const summary = won ? `Solved in ${triesText(tries)}` : "Missed it";
  return buildShareText({ number: p.number, modeTitle: TITLE, difficulty: progress.difficulty, hintsUsed: progress.hintsUsed, squares, summary });
}

export function ImpostorGame() {
  const [puzzle, setPuzzle] = useState<Puzzle | null | undefined>(undefined);
  const [data, setData] = useState<Dataset | null>(null);
  /** Wrong submits this visit, to shake the chosen cards (lib/nudge.ts). */
  const [wrongShake, setWrongShake] = useState(0);
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    loadGame<Puzzle>(MODE).then(({ puzzle: p, data: d }) => {
      setData(d);
      setPuzzle(p);
      if (p) setProgress(normalise(loadProgress<Progress>(MODE, p.date)));
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
          const fresh: Progress = { difficulty: d, selected: [], tries: [], hintsUsed: 0 };
          recordStart(MODE, d);
          setProgress(fresh);
          saveProgress(MODE, puzzle.date, fresh);
        }}
      />
    );
  }

  const play = atLevel(puzzle, progress.difficulty);
  const impostors = impostorsOf(play);
  const { won, done, score, tries } = evaluate(play, progress);
  const lastWrong = !done && tries > 0;
  const impostor = companies.get(play.impostorId)!;
  // End card: the impostor, the company the whole puzzle was about.
  const featured = impostor;
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
      recordFinish(MODE, next.difficulty, { bucket: result.won ? Math.min(result.tries, TRIES_CAP) : 0, score: result.score, maxScore: MAX_SCORE, won: result.won });
    }
  }

  return (
    <div className="space-y-6">
      <GameHeader title={TITLE} mode={MODE} difficulty={progress.difficulty} />
      <Announce
        text={
          won
            ? impostors.length > 1
              ? "Right, those are the impostors."
              : "Right, that's the impostor."
            : lastWrong
              ? `Not quite. Try ${tries + 1}.`
              : ""
        }
      />

      {/* The companies on a circle around the category; select the ones that don't belong, then submit. */}
      <div className="relative mx-auto aspect-square w-full max-w-[420px]">
        <span aria-hidden className="absolute inset-[13%] rounded-full border-2 border-dashed border-border" />
        <p className="absolute inset-[29%] flex items-center justify-center rounded-full bg-eu-blue p-3 text-center font-display text-sm font-bold leading-snug text-white sm:text-base">
          {play.prompt}
        </p>
        <ul>
          {play.companyIds.map((id, i) => {
            const c = companies.get(id)!;
            const selected = progress.selected.includes(id);
            const isImpostor = impostors.includes(id);
            // While playing only the selection shows (no right or wrong per company). Once done, reveal the impostors.
            const state = done ? (isImpostor ? "impostor" : "genuine") : selected ? "selected" : "open";
            const ring = {
              open: "ring-border group-hover:ring-primary",
              selected: "ring-primary",
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
                  disabled={done}
                  aria-pressed={done ? undefined : selected}
                  onClick={() =>
                    update({ ...progress, selected: selected ? progress.selected.filter((x) => x !== id) : [...progress.selected, id] })
                  }
                  aria-label={`${c.name}${state === "impostor" ? ", an impostor" : ""}`}
                  className={`group flex w-full flex-col items-center gap-1 text-center ${selected ? nudgeClass(wrongShake, { ring: false }) : ""}`}
                >
                  <span className={`relative rounded-[22%] ring-[3px] transition ${ring}`}>
                    <CompanyLogo company={c} size={many ? 46 : 60} />
                    {done && (
                      <span
                        className={`absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full ${
                          state === "impostor" ? "bg-correct" : "bg-border"
                        } text-white`}
                      >
                        {state === "impostor" && <VenetianMask size={14} aria-hidden />}
                        {state === "genuine" && <Check size={14} aria-hidden />}
                      </span>
                    )}
                  </span>
                  <span className="line-clamp-2 text-xs font-semibold leading-tight">
                    {c.name}
                  </span>
                  {/* While playing: "Selected", never a check, which would read as a right answer (Pablo, 2026-11-03). */}
                  {!done && (
                    <span aria-hidden className={`text-[10px] font-bold uppercase tracking-wide text-primary ${selected ? "" : "invisible"}`}>
                      Selected
                    </span>
                  )}
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

      {!done ? (
        <div className="space-y-3">
          {lastWrong && (
            <p key={tries} className="text-center text-sm font-semibold text-wrong">
              Not quite. Try again.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={progress.selected.length === 0 || progress.tries.some((t) => sameSet(t, progress.selected))}
              onClick={() => {
                const next = { ...progress, tries: [...progress.tries, [...progress.selected]] };
                update(next);
                // A wrong submit: shake the chosen cards (only right after submitting, not on reload).
                if (!evaluate(play, next).done) setWrongShake((n) => n + 1);
              }}
              className="min-h-11 flex-1 rounded-full bg-primary px-4 font-semibold text-on-primary transition active:scale-[0.98] disabled:opacity-40"
            >
              {progress.selected.length === 0
                ? "Select the impostors"
                : `Submit ${progress.selected.length} ${progress.selected.length === 1 ? "impostor" : "impostors"}`}
            </button>
          </div>
          {tries > 0 && <RevealButton label="Reveal answer" onConfirm={() => update({ ...progress, gaveUp: true })} />}
        </div>
      ) : (
        <div className="space-y-6">
          <ResultArea
            score={score}
            maxScore={MAX_SCORE}
            detail={
              (won ? `Solved in ${triesText(tries)}` : impostors.length > 1 ? "Missed it" : `It was ${impostor.name}`) +
              (progress.hintsUsed ? ` · ${progress.hintsUsed} ${progress.hintsUsed === 1 ? "hint" : "hints"}` : "")
            }
            share={shareText(play, progress)}
            stats={
              <StatsPanel
                mode={MODE}
                bucket={won ? Math.min(tries, TRIES_CAP) : 0}
                score={score}
                maxScore={MAX_SCORE}
                // Best on the right (Pablo, 2026-11-02): most tries left, one try right; unsolved games aren't shown.
                order={[6, 5, 4, 3, 2, 1]}
                label={(b) => (b === TRIES_CAP ? `${TRIES_CAP}+` : String(b))}
                axis="Tries needed"
                display={won ? { value: String(tries), caption: tries === 1 ? "try" : "tries" } : { value: "–", caption: "not solved" }}
              />
            }
          />
          <p className="flex animate-flip-in items-start gap-2 rounded-2xl border border-border bg-surface p-4 text-sm">
            <VenetianMask size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden />
            {play.explanation}
          </p>
          <BuiltInEuropeCard company={featured} founders={featuredFounders} reason={impostors.length > 1 ? "One of the impostors" : "The impostor"} />
        </div>
      )}
    </div>
  );
}
