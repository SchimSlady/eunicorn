"use client";

import { useEffect, useMemo, useState } from "react";
import type { Company, Dataset, GridCriterion, UnicornGridPuzzle } from "@eunicorn/schema";
import { indexById, loadGame } from "@/lib/data";
import { getTodayResult, loadProgress, saveProgress, saveResult } from "@/lib/daily";
import { hintLimit, saveDifficulty, type Difficulty } from "@/lib/difficulty";
import { shareText as buildShareText } from "@/lib/scoring";
import { CompanyLogo } from "@/components/CompanyLogo";
import { distinctAnswers, gridMissReason, investorIndex } from "@/lib/grid";
import { MissToast, type MissIcon } from "@/components/MissToast";
import { nudgeClass } from "@/lib/nudge";
import { companyFact, strengthOf } from "@/lib/hints";
import { RevealButton } from "@/components/RevealButton";
import { CompanySearch } from "@/components/CompanySearch";
import { BuiltInEuropeCard } from "@/components/BuiltInEuropeCard";
import { CompanyTap, OverviewProvider } from "@/components/CompanyOverview";
import { Flag } from "@/components/Flag";
import { GameIntro } from "@/components/GameIntro";
import { GameHeader } from "@/components/GameHeader";
import { Announce, GameSkeleton, NoPuzzle } from "@/components/Announce";
import { Hints } from "@/components/Hints";
import { ResultArea } from "@/components/ResultArea";
import { StatsPanel } from "@/components/StatsPanel";
import { recordFinish, recordStart } from "@/lib/stats";

const MODE = "unicorn-grid";
const TITLE = "Startup Grid";

/** No limit on guesses and no cost for a wrong one: the game ends when the grid is full, or when you give up. */

/**
 * The answer a hint for a square is about: a valid answer not on the board yet, the best-known one
 * that still lets the rest of the board be filled, so a hint never points at a company already used.
 */
function hintAnswer(p: UnicornGridPuzzle, cells: (string | null)[], cell: number, companies: Map<string, Company>): Company | undefined {
  const fame = (id: string) => companies.get(id)?.difficulty ?? 3;
  const bestKnownFirst = (_: number, ids: string[]) => [...ids].sort((a, b) => fame(a) - fame(b) || a.localeCompare(b));
  const used = new Set(cells.filter((id): id is string => !!id));
  const id = distinctAnswers(p.validAnswers, cells, bestKnownFirst)?.[cell] ?? p.validAnswers[cell].find((x) => !used.has(x));
  return id ? companies.get(id) : undefined;
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
  /** Hints revealed per square by the earlier per-square version; kept only to count them. */
  cellHints: number[];
  /** Hints revealed for the whole board (Pablo, 2026-11-02), as shown, with the square each is about. */
  hints?: { cell: number; text: string }[];
  gaveUp: boolean;
}

/**
 * The score is the number of squares filled, out of 9 (Pablo, 2026-11-02). A company's fame
 * (difficulty) still orders the hints, so a hint points at the best-known open answer.
 */
function evaluate(p: UnicornGridPuzzle, progress: Progress, companies: Map<string, Company>) {
  const filled = progress.cells.filter(Boolean).length;
  const done = progress.gaveUp || filled === 9;
  const worth = (id: string) => companies.get(id)?.difficulty ?? 1;
  return {
    filled,
    done,
    worth,
    hintsUsed: (progress.hints?.length ?? 0) + progress.cellHints.reduce((s, n) => s + n, 0),
    maxScore: 9,
    score: filled,
  };
}

function shareText(p: UnicornGridPuzzle, progress: Progress, companies: Map<string, Company>): string {
  const { hintsUsed, filled } = evaluate(p, progress, companies);
  const squares = progress.cells.map((id, i) => (id ? "🟩" : "⬜") + (i % 3 === 2 && i < 8 ? "\n" : "")); // share text, not UI. taste-skill-ignore
  const summary = `${filled} of 9 squares`;
  return buildShareText({ number: p.number, modeTitle: TITLE, difficulty: progress.difficulty, hintsUsed, squares, summary });
}

/**
 * A row or column heading. A country is just its flag and an investor is its logo, which is all a
 * player needs; the name stays for screen readers, and shows if a logo is missing or fails to load.
 * (Country labels carry an emoji flag in the data; the UI shows an SVG flag instead.)
 */
function CriterionLabel({ c, logo }: { c: GridCriterion; logo?: string }) {
  const [broken, setBroken] = useState(false);
  const text = c.label.replace(/\p{Regional_Indicator}/gu, "").trim();
  if (c.kind === "country") {
    return (
      <>
        <span aria-hidden>
          <Flag country={c.value} size={44} />
        </span>
        <span className="sr-only">{text}</span>
      </>
    );
  }
  if (c.kind === "investor" && logo && !broken) {
    return (
      <>
        <span aria-hidden className="flex aspect-square w-full items-center justify-center rounded-xl bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" onError={() => setBroken(true)} className="max-h-full max-w-full object-contain" />
        </span>
        <span className="sr-only">{text}</span>
      </>
    );
  }
  return <span className="text-center text-[11px] font-semibold leading-tight sm:text-xs">{text}</span>;
}

export function UnicornGridGame() {
  const [daily, setDaily] = useState<Puzzle | null | undefined>(undefined);
  const [data, setData] = useState<Dataset | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  // A company that fits several open squares waits here until the player taps one of them.
  const [pending, setPending] = useState<{ company: Company; cells: number[] } | null>(null);
  // The last guess that fit no open square: which headings it meets (✓ / ✗ on the board), and the
  // filled square it would have fit, if any.
  const [miss, setMiss] = useState<{ id: string; n: number; icon: MissIcon; text: string } | null>(null);
  // Whether that guess's toast is still up (it goes after a moment; the reason stays in the search).
  const [toast, setToast] = useState(false);
  // Wrong guesses this visit: they stay in the search, greyed out (they can't fit later either: squares only fill up).
  const [tried, setTried] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    loadGame<Puzzle>(MODE).then(({ puzzle: p, data: d }) => {
      setData(d);
      setDaily(p);
      if (p) setProgress(loadProgress<Progress>(MODE, p.date, p));
    });
  }, []);

  const companies = useMemo(() => (data ? indexById(data.companies) : new Map<string, Company>()), [data]);
  const investorLogos = useMemo(() => new Map((data?.investors ?? []).map((i) => [i.id, i.logo])), [data]);
  const investorsOf = useMemo(() => (data ? investorIndex(data) : () => new Set<string>()), [data]);

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

  function place(cell: number, c: Company) {
    const cells = [...progress!.cells];
    cells[cell] = c.id;
    update({ ...progress!, cells });
    setPending(null);
    setMiss(null);
  }

  /** A pick from the search: into the one open square it fits, a choice between several, or a wrong guess. */
  function pick(c: Company) {
    const fits = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((cell) => !progress!.cells[cell] && puzzle.validAnswers[cell].includes(c.id));
    if (fits.length === 1) return place(fits[0], c);
    if (fits.length > 1) {
      setPending({ company: c, cells: fits });
      setMiss(null);
      return;
    }
    update({ ...progress!, wrong: progress!.wrong + 1 });
    showMiss(c);
  }

  /** Why a wrong guess missed, as a toast over the board (again, when the player picks a tried one from the search). */
  function showMiss(c: Company) {
    const taken = [0, 1, 2, 3, 4, 5, 6, 7, 8].find((cell) => progress!.cells[cell] && puzzle.validAnswers[cell].includes(c.id));
    const reason = gridMissReason(c, puzzle.rows, puzzle.cols, investorsOf, taken !== undefined ? squareName(taken) : undefined);
    setTried((t) => new Map(t).set(c.id, reason.text));
    setMiss({ id: c.id, n: (miss?.n ?? 0) + 1, ...reason });
    setToast(true);
  }

  // Answers shown in squares the player left empty: the best-known valid ones such that, like
  // for the player, every company appears only once on the board.
  const byWorth = (_: number, ids: string[]) => [...ids].sort((a, b) => worth(a) - worth(b));
  const fill = distinctAnswers(puzzle.validAnswers, progress.cells, byWorth);
  const revealed: (Company | null)[] = progress.cells.map((placed, cell) =>
    placed ? null : companies.get(fill?.[cell] ?? byWorth(cell, puzzle.validAnswers[cell])[0])!,
  );
  const reveal = (cell: number) => revealed[cell] ?? companies.get(puzzle.validAnswers[cell][0])!;

  const strip = (s: string) => s.replace(/\p{Regional_Indicator}/gu, "").trim();

  // Hints (Pablo, 2026-11-02): for the whole board (Easy 5, Medium 3, Hard 1). Each names the open
  // square it is about, a square without a hint yet and with the fewest answers first, and is about a
  // different startup, softer first and stronger later. Never the square's own sector or investor.
  const hintCap = hintLimit(progress.difficulty, Infinity);
  const boardHints = progress.hints ?? [];
  const open = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((cell) => !progress.cells[cell]);
  const squareName = (cell: number) => `${strip(puzzle.rows[Math.floor(cell / 3)].label)} × ${strip(puzzle.cols[cell % 3].label)}`;
  const hinted = new Set(boardHints.map((h) => h.cell));
  const nextCell = [...open].sort(
    (a, b) => Number(hinted.has(a)) - Number(hinted.has(b)) || puzzle.validAnswers[a].length - puzzle.validAnswers[b].length || a - b,
  )[0];
  const canHint = boardHints.length < hintCap && nextCell !== undefined;
  function revealHint() {
    if (!canHint) return;
    const one = hintAnswer(puzzle!, progress!.cells, nextCell, companies);
    if (!one) return;
    const crit = [puzzle!.rows[Math.floor(nextCell / 3)], puzzle!.cols[nextCell % 3]];
    const fact = companyFact(one, strengthOf(boardHints.length, hintCap), {
      data: data!,
      hideSectors: new Set(crit.filter((k) => k.kind === "sector").map((k) => String(k.value))),
      hideInvestor: crit.find((k) => k.kind === "investor")?.value as string | undefined,
    });
    update({ ...progress!, hints: [...boardHints, { cell: nextCell, text: `${squareName(nextCell)}: one answer ${fact.startsWith("starts") ? "" : "was "}${fact}` }] });
  }

  const usedCompanies = progress.cells.filter((id): id is string => !!id).map((id) => companies.get(id)!);
  // End card: the player's rarest pick (highest difficulty); with no square filled, an answer they could have used.
  const featured = [...usedCompanies].sort((a, b) => b.difficulty - a.difficulty)[0] ?? reveal(0);
  const featuredReason = usedCompanies.length ? "Your rarest pick" : "One you could have used";
  const featuredFounders = featured.founderIds
    .map((id) => data.people.find((p) => p.id === id)?.name)
    .filter((n): n is string => !!n);

  return (
    <OverviewProvider data={data}>
    <div className="space-y-6">
      <GameHeader title={TITLE} mode={MODE} difficulty={progress.difficulty} />
      <Announce
        text={
          pending
            ? `Tap a highlighted square for ${pending.company.name}.`
            : miss
              ? `${companies.get(miss.id)?.name} doesn't fit. ${miss.text}.`
              : `${used.size} of 9 squares filled.`
        }
      />

      <div className="grid grid-cols-4 gap-1.5">
        <div aria-hidden />
        {puzzle.cols.map((c, i) => (
          <div key={i} className="flex aspect-square items-center justify-center rounded-2xl bg-eu-blue p-1 text-white">
            <CriterionLabel c={c} logo={c.kind === "investor" ? investorLogos.get(c.value) : undefined} />
          </div>
        ))}
        {puzzle.rows.map((r, ri) => (
          <div key={ri} className="contents">
            <div className="flex aspect-square items-center justify-center rounded-2xl bg-eu-blue p-1 text-white">
              <CriterionLabel c={r} logo={r.kind === "investor" ? investorLogos.get(r.value) : undefined} />
            </div>
            {[0, 1, 2].map((ci) => {
              const cell = ri * 3 + ci;
              const id = progress.cells[cell];
              const c = id ? companies.get(id)! : null;
              const shown = c ?? (done ? reveal(cell) : null);
              const candidate = !!pending && pending.cells.includes(cell);
              const cls = `relative flex aspect-square flex-col items-stretch justify-center gap-1 rounded-2xl border-2 p-1 transition ${
                c
                  ? "animate-pop border-correct bg-correct/10"
                  : candidate
                    ? "border-primary bg-primary/15"
                    : shown
                      ? "border-dashed border-border bg-surface opacity-60"
                      : `border-border bg-surface ${pending ? "opacity-40" : ""}`
              }`;
              // Only the logo, filling the square (Pablo, 2026-11-02); companies without one show their
              // initials. The name stays in the square's accessible name. White behind it because many logos are dark.
              const face = shown && (
                <div className="min-h-0 flex-1">
                  <CompanyLogo company={shown} fill />
                </div>
              );
              // Game over: a square with a company opens its overview.
              if (done && shown) {
                return (
                  <CompanyTap key={cell} company={shown} active className={cls}>
                    {face}
                  </CompanyTap>
                );
              }
              return (
                <button
                  key={cell}
                  type="button"
                  disabled={!candidate}
                  onClick={() => place(cell, pending!.company)}
                  aria-label={c ? c.name : candidate ? `Put ${pending!.company.name} in ${squareName(cell)}` : squareName(cell)}
                  className={cls}
                >
                  {face}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {!done ? (
        <div className="space-y-3">
          {pending ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary bg-surface p-3 text-sm">
              <span>
                Where does <strong>{pending.company.name}</strong> go? Tap a highlighted square.
              </span>
              <button
                type="button"
                onClick={() => setPending(null)}
                className="min-h-11 shrink-0 rounded-full border border-border px-4 font-semibold hover:border-primary"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <div className="relative flex items-start gap-2">
                {miss && toast && companies.get(miss.id) && (
                  <MissToast key={`${miss.id}-${miss.n}`} company={companies.get(miss.id)!} icon={miss.icon} text={miss.text} onDone={() => setToast(false)} />
                )}
                <div className={`min-w-0 flex-1 rounded-2xl ${nudgeClass(miss?.n)}`}>
                  <CompanySearch companies={data.companies} exclude={used} tried={tried} onTried={showMiss} onPick={pick} onType={() => setToast(false)} />
                </div>
                <Hints
                  compact
                  available={hintCap > 0}
                  revealed={boardHints.map((h) => ({ text: h.text, cost: 0 }))}
                  next={canHint ? { text: "", cost: 0 } : undefined}
                  onReveal={revealHint}
                  total={hintCap}
                />
              </div>
            </>
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
                score={score}
                maxScore={maxScore}
                order={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
                label={(b) => String(b)}
                axis="Squares filled"
                unit="squares"
              />
            }
          />
          <BuiltInEuropeCard company={featured} founders={featuredFounders} reason={featuredReason} />
        </div>
      )}
    </div>
    </OverviewProvider>
  );
}
