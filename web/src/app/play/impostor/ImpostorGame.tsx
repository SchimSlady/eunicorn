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
import { Announce, GameSkeleton, NoPuzzle } from "@/components/Announce";
import { ResultArea } from "@/components/ResultArea";
import { RevealButton } from "@/components/RevealButton";
import { nudgeClass } from "@/lib/nudge";
import { StatsPanel } from "@/components/StatsPanel";
import { recordFinish, recordStart } from "@/lib/stats";

const MODE = "impostor";
const TITLE = "Impostor";
/**
 * One click at a time: every pick is judged at once. A right pick turns green, the first wrong pick
 * ends the game. Find them all to win (how many there are is not shown). Win = 100; a loss keeps
 * half the share of impostors found, so starting with the sure ones pays off.
 */
const MAX_SCORE = 100;

interface Progress {
  difficulty: Difficulty;
  /** Companies picked so far, in order. Every one but possibly the last is an impostor. */
  picks: string[];
  hintsUsed: number;
  gaveUp?: boolean;
}

/** Progress saved by the earlier select-and-submit version has no `picks`; start those afresh. */
function normalise(p: Progress | null): Progress | null {
  if (!p) return null;
  return { ...p, picks: p.picks ?? [] };
}

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
  const found = progress.picks.filter((id) => impostors.includes(id)).length;
  const lost = progress.picks.some((id) => !impostors.includes(id));
  const won = found === impostors.length;
  const done = won || lost || !!progress.gaveUp;
  // Hints are free (Pablo, 2026-11-02): they show in the share text and break leaderboard ties, but cost nothing.
  const score = won ? MAX_SCORE : Math.round((MAX_SCORE / 2) * (found / impostors.length));
  // Stats column: 0 = out on the first pick, 1 = found some, 2 = found all.
  const bucket = won ? 2 : found > 0 ? 1 : 0;
  return { won, lost, found, done, score, bucket };
}

function shareText(p: Play, progress: Progress): string {
  const { won, found } = evaluate(p, progress);
  const impostors = impostorsOf(p);
  // One square per pick: green for an impostor, red for the pick that ended it.
  const squares = progress.picks.map((id) => (impostors.includes(id) ? "🟩" : "🟥")); // share text, not UI. taste-skill-ignore
  const summary = won ? `Found ${found === 1 ? "the impostor" : `all ${found} impostors`}` : found > 0 ? `Found ${found} of ${impostors.length}` : "Missed it";
  return buildShareText({ number: p.number, modeTitle: TITLE, difficulty: progress.difficulty, hintsUsed: progress.hintsUsed, squares, summary });
}

export function ImpostorGame() {
  const [puzzle, setPuzzle] = useState<Puzzle | null | undefined>(undefined);
  const [data, setData] = useState<Dataset | null>(null);
  /** Wrong picks this visit, to shake the wrong card (lib/nudge.ts). */
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
          const fresh: Progress = { difficulty: d, picks: [], hintsUsed: 0 };
          recordStart(MODE, d);
          setProgress(fresh);
          saveProgress(MODE, puzzle.date, fresh);
        }}
      />
    );
  }

  const play = atLevel(puzzle, progress.difficulty);
  const impostors = impostorsOf(play);
  const { won, lost, found, done, score, bucket } = evaluate(play, progress);
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
      recordFinish(MODE, next.difficulty, { bucket: result.bucket, score: result.score, maxScore: MAX_SCORE, won: result.won });
    }
  }

  return (
    <div className="space-y-6">
      <GameHeader title={TITLE} mode={MODE} difficulty={progress.difficulty} />
      <Announce
        text={
          won
            ? impostors.length > 1
              ? "Right, those are all the impostors."
              : "Right, that's the impostor."
            : lost
              ? "Wrong, that one belongs."
              : ""
        }
      />

      {/* The companies on a circle around the category; click the ones that don't belong; each click is judged at once. */}
      <div className="relative mx-auto aspect-square w-full max-w-[420px]">
        <span aria-hidden className="absolute inset-[13%] rounded-full border-2 border-dashed border-border" />
        <p className="absolute inset-[29%] flex items-center justify-center rounded-full bg-eu-blue p-3 text-center font-display text-sm font-bold leading-snug text-white sm:text-base">
          {play.prompt}
        </p>
        <ul>
          {play.companyIds.map((id, i) => {
            const c = companies.get(id)!;
            const picked = progress.picks.includes(id);
            const isImpostor = impostors.includes(id);
            // A pick shows right or wrong at once; once done, the rest of the impostors are revealed too.
            const state = picked ? (isImpostor ? "found" : "wrong") : done ? (isImpostor ? "impostor" : "genuine") : "open";
            const ring = {
              open: "ring-border group-hover:ring-primary",
              found: "animate-pop ring-correct",
              wrong: "ring-wrong",
              impostor: "ring-correct",
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
                  onClick={() => {
                    const next = { ...progress, picks: [...progress.picks, id] };
                    update(next);
                    if (!isImpostor) setWrongShake((n) => n + 1);
                  }}
                  aria-label={`${c.name}${state === "found" || state === "impostor" ? ", an impostor" : state === "wrong" ? ", not an impostor" : ""}`}
                  className={`group flex w-full flex-col items-center gap-1 text-center ${state === "wrong" ? nudgeClass(wrongShake, { ring: false }) : ""}`}
                >
                  <span className={`relative rounded-[22%] ring-[3px] transition ${ring}`}>
                    <CompanyLogo company={c} size={many ? 46 : 60} />
                    {(done || picked) && (
                      <span
                        className={`absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full ${
                          state === "wrong" ? "bg-wrong" : state === "genuine" ? "bg-border" : "bg-correct"
                        } text-white`}
                      >
                        {(state === "found" || state === "impostor") && <VenetianMask size={14} aria-hidden />}
                        {state === "wrong" && <X size={14} aria-hidden />}
                        {state === "genuine" && <Check size={14} aria-hidden />}
                      </span>
                    )}
                  </span>
                  <span className="line-clamp-2 text-xs font-semibold leading-tight">
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

      {!done ? (
        <div className="space-y-3">
          <p className="text-center text-sm text-muted">Tap the startups you are sure about.</p>
          {progress.picks.length > 0 && <RevealButton label="Reveal answer" onConfirm={() => update({ ...progress, gaveUp: true })} />}
        </div>
      ) : (
        <div className="space-y-6">
          <ResultArea
            score={score}
            maxScore={MAX_SCORE}
            detail={
              (won ? (impostors.length > 1 ? `Found all ${found}` : "Found it") : found > 0 ? `Found ${found} of ${impostors.length}` : impostors.length > 1 ? "Missed them" : `It was ${impostor.name}`) +
              (progress.hintsUsed ? ` · ${progress.hintsUsed} ${progress.hintsUsed === 1 ? "hint" : "hints"}` : "")
            }
            share={shareText(play, progress)}
            stats={
              <StatsPanel
                mode={MODE}
                bucket={bucket}
                score={score}
                maxScore={MAX_SCORE}
                order={[0, 1, 2]}
                label={(b) => ["Out at once", "Found some", "Found all"][b]}
                axis="Result"
                display={{ value: String(found), caption: found === 1 ? "impostor found" : "impostors found" }}
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
