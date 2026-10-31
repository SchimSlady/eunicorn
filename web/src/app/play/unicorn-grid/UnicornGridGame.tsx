"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import type { Company, Dataset, GridCriterion, UnicornGridPuzzle } from "@eunicorn/schema";
import { indexById, loadDataset } from "@/lib/data";
import { getTodayResult, loadProgress, loadTodayPuzzle, saveProgress, saveResult } from "@/lib/daily";
import { saveDifficulty, type Difficulty } from "@/lib/difficulty";
import { shareText as buildShareText } from "@/lib/scoring";
import { CompanyLogo } from "@/components/CompanyLogo";
import { CompanySearch } from "@/components/CompanySearch";
import { BuiltInEuropeCard } from "@/components/BuiltInEuropeCard";
import { Flag } from "@/components/Flag";
import { GameIntro } from "@/components/GameIntro";
import { GameHeader } from "@/components/GameHeader";
import { GameFooter } from "@/components/GameFooter";
import { HintButton, HintList } from "@/components/HintButton";
import { ResultHeader } from "@/components/ResultHeader";

const MODE = "unicorn-grid";
const TITLE = "Unicorn Grid";

/** How each difficulty changes the rules. Same grid for everyone. */
const RULES: Record<Difficulty, { guesses: number; hints: boolean; logosInSearch: boolean }> = {
  easy: { guesses: 12, hints: true, logosInSearch: true },
  medium: { guesses: 9, hints: true, logosInSearch: true },
  hard: { guesses: 9, hints: false, logosInSearch: false },
};

const RULES_TEXT: Record<Difficulty, string> = {
  easy: "12 guesses for 9 squares · hints",
  medium: "9 guesses, one per square · hints",
  hard: "9 guesses · no hints, no logos",
};

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
  const rules = RULES[progress.difficulty];
  const filled = progress.cells.filter(Boolean).length;
  const guessesLeft = rules.guesses - filled - progress.wrong;
  const done = progress.gaveUp || filled === 9 || guessesLeft <= 0;
  const worth = (id: string) => companies.get(id)?.difficulty ?? 1;
  const hintCost = progress.cellHints.reduce((s, n, i) => s + p.cellHints[i].slice(0, n).reduce((a, h) => a + h.cost, 0), 0);
  const raised = progress.cells.reduce((s, id) => s + (id ? worth(id) : 0), 0);
  return {
    rules,
    filled,
    guessesLeft,
    done,
    worth,
    hintsUsed: progress.cellHints.reduce((s, n) => s + n, 0),
    maxScore: p.validAnswers.reduce((s, ids) => s + Math.max(...ids.map(worth)), 0),
    score: Math.max(0, raised - hintCost),
  };
}

function shareText(p: UnicornGridPuzzle, progress: Progress, companies: Map<string, Company>): string {
  const { score, hintsUsed } = evaluate(p, progress, companies);
  const squares = progress.cells.map((id, i) => (id ? "🟩" : "⬜") + (i % 3 === 2 && i < 8 ? "\n" : ""));
  return buildShareText({ number: p.number, modeTitle: TITLE, difficulty: progress.difficulty, hintsUsed, squares, score });
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
  const [puzzle, setPuzzle] = useState<UnicornGridPuzzle | null | undefined>(undefined);
  const [data, setData] = useState<Dataset | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  // Feedback for the last guess: which square shakes and why.
  const [miss, setMiss] = useState<{ cell: number; name: string; n: number } | null>(null);

  useEffect(() => {
    Promise.all([loadTodayPuzzle<UnicornGridPuzzle>(MODE), loadDataset()]).then(([p, d]) => {
      setData(d);
      setPuzzle(p);
      if (p) setProgress(loadProgress<Progress>(MODE, p.date));
    });
  }, []);

  const companies = useMemo(() => (data ? indexById(data.companies) : new Map<string, Company>()), [data]);

  if (puzzle === undefined || !data) return <p className="text-muted">Loading…</p>;
  if (puzzle === null) return <p className="text-muted">No puzzle today. Check back tomorrow.</p>;

  // No progress yet: show the intro and choose the level. The game is set up from that choice.
  if (!progress) {
    return (
      <GameIntro
        mode={MODE}
        number={puzzle.number}
        rules={RULES_TEXT}
        onStart={(d) => {
          saveDifficulty(d);
          const fresh: Progress = { difficulty: d, cells: Array(9).fill(null), wrong: 0, cellHints: Array(9).fill(0), gaveUp: false };
          setProgress(fresh);
          saveProgress(MODE, puzzle.date, fresh);
        }}
      />
    );
  }

  const { rules, filled, guessesLeft, done, worth, hintsUsed, maxScore, score } = evaluate(puzzle, progress, companies);
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

  // Answers shown in squares the player left empty: the best-known valid one that isn't
  // already on the board, so (like the player) every company appears only once if possible.
  const revealed: (Company | null)[] = [];
  const taken = new Set(used);
  for (let cell = 0; cell < 9; cell++) {
    if (progress.cells[cell]) {
      revealed.push(null);
      continue;
    }
    const options = [...puzzle.validAnswers[cell]].sort((a, b) => worth(a) - worth(b));
    const id = options.find((o) => !taken.has(o)) ?? options[0];
    taken.add(id);
    revealed.push(companies.get(id)!);
  }
  const reveal = (cell: number) => revealed[cell] ?? companies.get(puzzle.validAnswers[cell][0])!;

  const sel = selected !== null && !done ? selected : null;
  const selRow = sel !== null ? puzzle.rows[Math.floor(sel / 3)] : null;
  const selCol = sel !== null ? puzzle.cols[sel % 3] : null;
  const strip = (s: string) => s.replace(/\p{Regional_Indicator}/gu, "").trim();

  const usedCompanies = progress.cells.filter((id): id is string => !!id).map((id) => companies.get(id)!);
  const featured =
    [...usedCompanies].sort((a, b) => b.difficulty - a.difficulty).find((c) => c.funFact) ??
    usedCompanies[0] ??
    reveal(0);
  const featuredFounders = featured.founderIds
    .map((id) => data.people.find((p) => p.id === id)?.name)
    .filter((n): n is string => !!n);

  return (
    <div className="space-y-6">
      <GameHeader title={TITLE} number={puzzle.number} difficulty={progress.difficulty} />

      <div className="grid grid-cols-4 gap-1.5">
        <div className="flex flex-col items-center justify-center rounded-xl bg-eu-blue p-1 text-center text-white">
          <span className="font-display text-xl font-bold leading-none">{done ? filled : guessesLeft}</span>
          <span className="text-[10px] uppercase tracking-wider text-white/70">{done ? "of 9" : "guesses"}</span>
        </div>
        {puzzle.cols.map((c, i) => (
          <div key={i} className="flex aspect-square items-center justify-center rounded-xl bg-eu-blue/10 p-1">
            <CriterionLabel c={c} />
          </div>
        ))}
        {puzzle.rows.map((r, ri) => (
          <div key={ri} className="contents">
            <div className="flex aspect-square items-center justify-center rounded-xl bg-eu-blue/10 p-1">
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
                  className={`relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 p-1 transition ${
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
                      <CompanyLogo company={shown} size={34} />
                      <span className="line-clamp-1 text-[10px] font-semibold leading-tight">{shown.name}</span>
                      {c && <span className="absolute right-1 top-1 text-[9px] font-bold text-correct">€{worth(c.id)}M</span>}
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
                showLogos={rules.logosInSearch}
                autoFocus
                onPick={(c) => guess(sel, c)}
              />
              {miss?.cell === sel && (
                <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-wrong">
                  <X size={16} aria-hidden /> {miss.name} doesn&apos;t fit this square
                </p>
              )}
              <HintList hints={puzzle.cellHints[sel].slice(0, progress.cellHints[sel])} />
              {rules.hints && progress.cellHints[sel] < puzzle.cellHints[sel].length && (
                <div className="flex justify-end">
                  <HintButton
                    next={puzzle.cellHints[sel][progress.cellHints[sel]]}
                    onClick={() => {
                      const cellHints = [...progress.cellHints];
                      cellHints[sel] += 1;
                      update({ ...progress, cellHints });
                    }}
                  />
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-sm text-muted">Tap a square, then name a European startup that fits its row and column.</p>
          )}
          <button
            type="button"
            onClick={() => update({ ...progress, gaveUp: true })}
            className="w-full text-center text-xs text-muted underline"
          >
            Finish and show answers
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <ResultHeader
            score={score}
            maxScore={maxScore}
            detail={`${filled} of 9 squares${hintsUsed ? ` · ${hintsUsed} ${hintsUsed === 1 ? "hint" : "hints"}` : ""}`}
          />
          <p className="flex items-center justify-center gap-1.5 text-center text-sm text-muted">
            <Check size={16} className="text-correct" aria-hidden /> Lesser-known answers raise more. Faded squares show an answer you missed.
          </p>
          <BuiltInEuropeCard company={featured} founders={featuredFounders} />
          <GameFooter share={shareText(puzzle, progress, companies)} />
        </div>
      )}
    </div>
  );
}
