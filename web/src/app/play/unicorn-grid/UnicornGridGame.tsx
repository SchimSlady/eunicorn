"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { Company, Dataset, GridCriterion, Hint, UnicornGridPuzzle } from "@eunicorn/schema";
import { indexById, loadGame } from "@/lib/data";
import { getTodayResult, loadProgress, saveProgress, saveResult } from "@/lib/daily";
import { saveDifficulty, type Difficulty } from "@/lib/difficulty";
import { formatPoints, shareText as buildShareText } from "@/lib/scoring";
import { CompanyLogo } from "@/components/CompanyLogo";
import { sectorLabel } from "@/lib/format";
import { distinctAnswers } from "@/lib/grid";
import { RevealButton } from "@/components/RevealButton";
import { CompanySearch } from "@/components/CompanySearch";
import { BuiltInEuropeCard } from "@/components/BuiltInEuropeCard";
import { Flag } from "@/components/Flag";
import { GameIntro } from "@/components/GameIntro";
import { GameHeader } from "@/components/GameHeader";
import { Announce, GameSkeleton, NoPuzzle } from "@/components/Announce";
import { Hints, hintState } from "@/components/Hints";
import { ResultArea } from "@/components/ResultArea";
import { StatsPanel } from "@/components/StatsPanel";
import { recordFinish, recordStart } from "@/lib/stats";

const MODE = "unicorn-grid";
const TITLE = "Unicorn Grid";

/** A wrong guess costs one point of the squares' values. There is no limit on guesses: the game ends when the grid is full, or when you give up. */
const WRONG_COST = 1;

/** What a square's hints cost, in order: a description of one answer, then its first letter. */
const HINT_COSTS = [1, 2];

/**
 * The hints for a square point at one valid answer that is not on the board yet, the best-known
 * one that still lets the rest of the board be filled. When the player uses it elsewhere, the
 * hints move on to another answer, so a hint never points at a square already answered.
 */
function hintsFor(p: UnicornGridPuzzle, cells: (string | null)[], cell: number, companies: Map<string, Company>): Hint[] {
  const fame = (id: string) => companies.get(id)?.difficulty ?? 3;
  const bestKnownFirst = (_: number, ids: string[]) => [...ids].sort((a, b) => fame(a) - fame(b) || a.localeCompare(b));
  const used = new Set(cells.filter((id): id is string => !!id));
  const id = distinctAnswers(p.validAnswers, cells, bestKnownFirst)?.[cell] ?? p.validAnswers[cell].find((x) => !used.has(x));
  const one = id ? companies.get(id) : undefined;
  if (!one) return [];
  const texts = [
    `One answer: ${one.sectors.map(sectorLabel).join(", ")} from ${one.city}`,
    `One answer starts with ${one.name[0].toUpperCase()}`,
  ];
  return texts.map((text, i) => ({ text, cost: HINT_COSTS[i] }));
}

/** The part of the puzzle that differs by level. A hand-made puzzle has no variants: one for all. */
type Level = Pick<UnicornGridPuzzle, "rows" | "cols" | "validAnswers" | "cellHints">;
type Puzzle = UnicornGridPuzzle & { variants?: Partial<Record<Difficulty, Level>> };

function atLevel(p: Puzzle, d: Difficulty): UnicornGridPuzzle {
  const v = p.variants?.[d];
  return v ? { ...p, ...v } : p;
}


interface Progress {
  difficulty: Difficulty;
  cells: (string | null)[]; // company id per square, row-major
  wrong: number;
  cellHints: number[]; // hints revealed per square
  gaveUp: boolean;
}

/**
 * A square is worth the company's difficulty (1 = everyone knows it, 5 = insider) in €M,
 * so lesser-known answers raise more. Max = the most obscure valid answer for every square.
 */
function evaluate(p: UnicornGridPuzzle, progress: Progress, companies: Map<string, Company>) {
  const filled = progress.cells.filter(Boolean).length;
  const done = progress.gaveUp || filled === 9;
  const worth = (id: string) => companies.get(id)?.difficulty ?? 1;
  const hintCost = progress.cellHints.reduce((s, n) => s + HINT_COSTS.slice(0, n).reduce((a, c) => a + c, 0), 0);
  const raised = progress.cells.reduce((s, id) => s + (id ? worth(id) : 0), 0);
  return {
    filled,
    done,
    worth,
    hintsUsed: progress.cellHints.reduce((s, n) => s + n, 0),
    maxScore: p.validAnswers.reduce((s, ids) => s + Math.max(...ids.map(worth)), 0),
    score: Math.max(0, raised - progress.wrong * WRONG_COST - hintCost),
  };
}

function shareText(p: UnicornGridPuzzle, progress: Progress, companies: Map<string, Company>): string {
  const { score, hintsUsed, filled, maxScore } = evaluate(p, progress, companies);
  const squares = progress.cells.map((id, i) => (id ? "🟩" : "⬜") + (i % 3 === 2 && i < 8 ? "\n" : "")); // share text, not UI. taste-skill-ignore
  const summary = `${filled} of 9 squares`;
  return buildShareText({ number: p.number, modeTitle: TITLE, difficulty: progress.difficulty, hintsUsed, squares, summary, score, maxScore });
}

/** Country labels carry an emoji flag in the data; the UI shows an SVG flag instead. */
function CriterionLabel({ c }: { c: GridCriterion }) {
  const text = c.label.replace(/\p{Regional_Indicator}/gu, "").trim();
  return (
    <span className="flex flex-col items-center gap-1 text-center text-[11px] font-semibold leading-tight sm:text-xs">
      {c.kind === "country" && <Flag country={c.value} size={22} />}
      {text}
    </span>
  );
}

export function UnicornGridGame() {
  const [daily, setDaily] = useState<Puzzle | null | undefined>(undefined);
  const [data, setData] = useState<Dataset | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  // Feedback for the last guess: which square shakes and why.
  const [miss, setMiss] = useState<{ cell: number; name: string; n: number } | null>(null);

  useEffect(() => {
    loadGame<Puzzle>(MODE).then(({ puzzle: p, data: d }) => {
      setData(d);
      setDaily(p);
      if (p) setProgress(loadProgress<Progress>(MODE, p.date));
    });
  }, []);

  const companies = useMemo(() => (data ? indexById(data.companies) : new Map<string, Company>()), [data]);

  if (daily === undefined || !data) return <GameSkeleton />;
  if (daily === null) return <NoPuzzle />;

  // No progress yet: show the intro and choose the level. The game is set up from that choice.
  if (!progress) {
    return (
      <GameIntro
        mode={MODE}
        onStart={(d) => {
          saveDifficulty(d);
          const fresh: Progress = { difficulty: d, cells: Array(9).fill(null), wrong: 0, cellHints: Array(9).fill(0), gaveUp: false };
          recordStart(MODE, d);
          setProgress(fresh);
          saveProgress(MODE, daily.date, fresh);
        }}
      />
    );
  }

  const puzzle = atLevel(daily, progress.difficulty);
  const { filled, done, worth, hintsUsed, maxScore, score } = evaluate(puzzle, progress, companies);
  const used = new Set(progress.cells.filter((id): id is string => !!id));

  function update(next: Progress) {
    setProgress(next);
    saveProgress(MODE, puzzle!.date, next);
    const result = evaluate(puzzle!, next, companies);
    if (result.done && !getTodayResult(MODE, puzzle!.date)) {
      saveResult(MODE, {
        date: puzzle!.date,
        score: result.score,
        maxScore: result.maxScore,
        hintsUsed: result.hintsUsed,
        share: shareText(puzzle!, next, companies),
      });
      recordFinish(MODE, next.difficulty, { bucket: result.filled, score: result.score, maxScore: result.maxScore, won: result.filled === 9 });
    }
  }

  function guess(cell: number, c: Company) {
    if (puzzle!.validAnswers[cell].includes(c.id)) {
      const cells = [...progress!.cells];
      cells[cell] = c.id;
      update({ ...progress!, cells });
      setSelected(null);
      setMiss(null);
    } else {
      update({ ...progress!, wrong: progress!.wrong + 1 });
      setMiss({ cell, name: c.name, n: (miss?.n ?? 0) + 1 });
    }
  }

  // Answers shown in squares the player left empty: the best-known valid ones such that, like
  // for the player, every company appears only once on the board.
  const byWorth = (_: number, ids: string[]) => [...ids].sort((a, b) => worth(a) - worth(b));
  const fill = distinctAnswers(puzzle.validAnswers, progress.cells, byWorth);
  const revealed: (Company | null)[] = progress.cells.map((placed, cell) =>
    placed ? null : companies.get(fill?.[cell] ?? byWorth(cell, puzzle.validAnswers[cell])[0])!,
  );
  const reveal = (cell: number) => revealed[cell] ?? companies.get(puzzle.validAnswers[cell][0])!;

  const sel = selected !== null && !done ? selected : null;
  const selRow = sel !== null ? puzzle.rows[Math.floor(sel / 3)] : null;
  const selCol = sel !== null ? puzzle.cols[sel % 3] : null;
  const strip = (s: string) => s.replace(/\p{Regional_Indicator}/gu, "").trim();

  const usedCompanies = progress.cells.filter((id): id is string => !!id).map((id) => companies.get(id)!);
  // End card: the player's rarest pick (highest difficulty); with no square filled, an answer they could have used.
  const featured = [...usedCompanies].sort((a, b) => b.difficulty - a.difficulty)[0] ?? reveal(0);
  const featuredReason = usedCompanies.length ? "Your rarest pick" : "One you could have used";
  const featuredFounders = featured.founderIds
    .map((id) => data.people.find((p) => p.id === id)?.name)
    .filter((n): n is string => !!n);

  return (
    <div className="space-y-6">
      <GameHeader title={TITLE} mode={MODE} difficulty={progress.difficulty} />
      <Announce text={miss ? `${miss.name} doesn't fit that square.` : `${used.size} of 9 squares filled.`} />

      <div className="grid grid-cols-4 gap-1.5">
        <div className="flex flex-col items-center justify-center text-center text-muted">
          <span className="font-display text-xl font-bold leading-none text-foreground">{filled}/9</span>
        </div>
        {puzzle.cols.map((c, i) => (
          <div key={i} className="flex aspect-square items-center justify-center rounded-2xl bg-eu-blue p-1 text-white">
            <CriterionLabel c={c} />
          </div>
        ))}
        {puzzle.rows.map((r, ri) => (
          <div key={ri} className="contents">
            <div className="flex aspect-square items-center justify-center rounded-2xl bg-eu-blue p-1 text-white">
              <CriterionLabel c={r} />
            </div>
            {[0, 1, 2].map((ci) => {
              const cell = ri * 3 + ci;
              const id = progress.cells[cell];
              const c = id ? companies.get(id)! : null;
              const shown = c ?? (done ? reveal(cell) : null);
              const isSel = sel === cell;
              const shaking = miss?.cell === cell;
              return (
                <button
                  // Re-keyed per miss so the shake replays on every wrong guess.
                  key={shaking ? `${cell}-${miss!.n}` : cell}
                  type="button"
                  disabled={done || !!c}
                  onClick={() => {
                    setSelected(cell);
                    setMiss(null);
                  }}
                  aria-label={c ? `${c.name}` : `Square ${cell + 1}`}
                  className={`relative flex aspect-square flex-col items-stretch justify-center gap-1 rounded-2xl border-2 p-1 transition ${
                    c
                      ? "animate-pop border-correct bg-correct/10"
                      : isSel
                        ? "border-primary bg-surface"
                        : shown
                          ? "border-dashed border-border bg-surface opacity-60"
                          : "border-border bg-surface hover:border-primary"
                  } ${shaking ? "animate-shake border-wrong" : ""}`}
                >
                  {shown && (
                    <>
                      {/* The logo fills the square; white behind it because many logos are dark. */}
                      <div className="min-h-0 flex-1">
                        <CompanyLogo company={shown} fill />
                      </div>
                      {/* The name gets the full width on up to two lines; the reward sits in the corner. */}
                      <span className="line-clamp-2 px-0.5 text-center text-[11px] font-semibold leading-tight">{shown.name}</span>
                      {c && (
                        <span className="absolute -right-1.5 -top-1.5 z-10 rounded-full bg-correct px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
                          +{formatPoints(worth(c.id), maxScore)}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {!done ? (
        <div className="space-y-3">
          {sel !== null && selRow && selCol ? (
            <>
              <p className="text-center text-sm font-semibold">
                {strip(selRow.label)} <span className="text-muted">×</span> {strip(selCol.label)}
              </p>
              <CompanySearch
                key={sel}
                companies={data.companies}
                exclude={used}
                autoFocus
                onPick={(c) => guess(sel, c)}
              />
              {miss?.cell === sel && (
                <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-wrong">
                  <X size={16} aria-hidden /> {miss.name} doesn&apos;t fit this square
                </p>
              )}
              <div className="flex justify-end">
                <Hints
                  {...hintState(progress.difficulty, hintsFor(puzzle, progress.cells, sel, companies), progress.cellHints[sel])}
                  maxScore={maxScore}
                  onReveal={() => {
                    const cellHints = [...progress.cellHints];
                    cellHints[sel] += 1;
                    update({ ...progress, cellHints });
                  }}
                />
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-muted">Tap a square to start.</p>
          )}
          <RevealButton label="Show answers" onConfirm={() => update({ ...progress, gaveUp: true })} />
        </div>
      ) : (
        <div className="space-y-6">
          <ResultArea
            score={score}
            maxScore={maxScore}
            detail={`${filled} of 9 squares${hintsUsed ? ` · ${hintsUsed} ${hintsUsed === 1 ? "hint" : "hints"}` : ""}`}
            share={shareText(puzzle, progress, companies)}
            stats={
              <StatsPanel
                mode={MODE}
                bucket={filled}
                scorePct={maxScore ? (score / maxScore) * 100 : 0}
                order={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
                label={(b) => String(b)}
                axis="Squares filled"
              />
            }
          />
          <BuiltInEuropeCard company={featured} founders={featuredFounders} reason={featuredReason} />
        </div>
      )}
    </div>
  );
}
