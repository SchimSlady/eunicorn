"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { Company, Dataset } from "@eunicorn/schema";
import { indexById, loadGame } from "@/lib/data";
import { getTodayResult, loadProgress, saveProgress, saveResult } from "@/lib/daily";
import { saveDifficulty, type Difficulty } from "@/lib/difficulty";
import { formatMetric } from "@/lib/format";
import { shareText as buildShareText } from "@/lib/scoring";
import type { Top10Puzzle, Top10Round } from "@/lib/top10";
import { CompanyLogo } from "@/components/CompanyLogo";
import { CompanySearch } from "@/components/CompanySearch";
import { BuiltInEuropeCard } from "@/components/BuiltInEuropeCard";
import { GameIntro } from "@/components/GameIntro";
import { GameHeader } from "@/components/GameHeader";
import { Announce, NoPuzzle } from "@/components/Announce";
import { HintButton, HintList } from "@/components/HintButton";
import { ResultArea } from "@/components/ResultArea";
import { RevealButton } from "@/components/RevealButton";
import { StatsPanel } from "@/components/StatsPanel";
import { recordFinish, recordStart } from "@/lib/stats";

const MODE = "top-10";
const TITLE = "Top 10";
const MAX_SCORE = 10;

/** Lives (wrong names allowed) and hints per level; the list itself differs by level too. */
const RULES: Record<Difficulty, { lives: number; hints: boolean }> = {
  easy: { lives: 5, hints: true },
  medium: { lives: 3, hints: true },
  hard: { lives: 3, hints: false },
};

interface Progress {
  difficulty: Difficulty;
  guesses: string[]; // company ids, in order: found or wrong
  hintsUsed: number;
  gaveUp: boolean;
}

/** The list as played at this level. */
function atLevel(p: Top10Puzzle, d: Difficulty): Top10Round {
  return p.variants?.[d] ?? p;
}

function evaluate(p: Top10Round, progress: Progress) {
  const rules = RULES[progress.difficulty];
  const found = progress.guesses.filter((id) => p.companyIds.includes(id));
  const wrong = progress.guesses.length - found.length;
  const done = progress.gaveUp || found.length === p.companyIds.length || wrong >= rules.lives;
  const hintCost = p.hints.slice(0, progress.hintsUsed).reduce((s, h) => s + h.cost, 0);
  return { rules, found, wrong, livesLeft: rules.lives - wrong, done, score: Math.max(0, found.length - hintCost) };
}

function shareText(p: Top10Puzzle, round: Top10Round, progress: Progress): string {
  const { found, score } = evaluate(round, progress);
  const squares = progress.guesses.map((id) => (round.companyIds.includes(id) ? "🟩" : "🟥")); // share text, not UI. taste-skill-ignore
  return buildShareText({
    number: p.number,
    modeTitle: TITLE,
    difficulty: progress.difficulty,
    hintsUsed: progress.hintsUsed,
    squares,
    summary: `${found.length} of 10 found`,
    score,
    maxScore: MAX_SCORE,
  });
}

export function Top10Game() {
  const [puzzle, setPuzzle] = useState<Top10Puzzle | null | undefined>(undefined);
  const [data, setData] = useState<Dataset | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [miss, setMiss] = useState<{ name: string; n: number } | null>(null);

  useEffect(() => {
    loadGame<Top10Puzzle>(MODE).then(({ puzzle: p, data: d }) => {
      setData(d);
      setPuzzle(p);
      if (p) setProgress(loadProgress<Progress>(MODE, p.date));
    });
  }, []);

  const companies = useMemo(() => (data ? indexById(data.companies) : new Map<string, Company>()), [data]);

  if (puzzle === undefined || !data) return <p className="text-muted">Loading…</p>;
  if (puzzle === null) return <NoPuzzle />;

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

  const round = atLevel(puzzle, progress.difficulty);
  const { rules, found, wrong, livesLeft, done, score } = evaluate(round, progress);

  function update(next: Progress) {
    setProgress(next);
    saveProgress(MODE, puzzle!.date, next);
    const r = atLevel(puzzle!, next.difficulty);
    const result = evaluate(r, next);
    if (result.done && !getTodayResult(MODE, puzzle!.date)) {
      saveResult(MODE, { date: puzzle!.date, score: result.score, maxScore: MAX_SCORE, hintsUsed: next.hintsUsed, share: shareText(puzzle!, r, next) });
      recordFinish(MODE, next.difficulty, { bucket: result.found.length, score: result.score, maxScore: MAX_SCORE, won: result.found.length === 10 });
    }
  }

  function guess(c: Company) {
    const hit = round.companyIds.includes(c.id);
    setMiss(hit ? null : { name: c.name, n: (miss?.n ?? 0) + 1 });
    update({ ...progress!, guesses: [...progress!.guesses, c.id] });
  }

  const wrongOnes = progress.guesses.filter((id) => !round.companyIds.includes(id)).map((id) => companies.get(id)!);
  const top = companies.get(round.companyIds[0])!;
  const topFounders = top.founderIds.map((id) => data.people.find((p) => p.id === id)?.name).filter((n): n is string => !!n);

  return (
    <div className="space-y-5">
      <GameHeader title={TITLE} mode={MODE} difficulty={progress.difficulty} />
      <Announce
        text={
          miss && !done
            ? `${miss.name} is not in the list. ${livesLeft} ${livesLeft === 1 ? "life" : "lives"} left.`
            : `${found.length} of 10 found.`
        }
      />

      <p className="rounded-2xl bg-eu-blue p-4 text-center font-display text-lg font-bold leading-snug text-white">{round.title}</p>

      <ol className="space-y-1.5">
        {round.companyIds.map((id, i) => {
          const c = companies.get(id)!;
          const got = found.includes(id);
          const shown = got || done;
          return (
            <li
              key={id}
              className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-1.5 ${
                got ? "animate-flip-in border-border bg-surface" : shown ? "border-border bg-surface/40 opacity-60" : "border-dashed border-border"
              }`}
            >
              <span className="w-6 text-right font-display text-lg font-bold text-primary">{i + 1}</span>
              {shown ? (
                <>
                  <CompanyLogo company={c} size={32} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{c.name}</span>
                  <span className="shrink-0 text-sm tabular-nums text-muted">{formatMetric(c, round.metric)}</span>
                </>
              ) : (
                <span className="text-sm text-muted">?</span>
              )}
            </li>
          );
        })}
      </ol>

      {wrongOnes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {wrongOnes.map((c, i) => (
            <span
              key={c.id}
              className={`flex items-center gap-1 rounded-full bg-wrong/15 py-1 pl-2 pr-3 text-sm font-medium text-wrong ${i === wrongOnes.length - 1 && miss && !done ? "animate-shake" : ""}`}
            >
              <X size={14} aria-hidden /> <span className="line-through">{c.name}</span>
            </span>
          ))}
        </div>
      )}

      <HintList hints={round.hints.slice(0, progress.hintsUsed)} />

      {!done ? (
        <div className="space-y-3">
          <CompanySearch companies={data.companies} exclude={new Set(progress.guesses)} onPick={guess} />
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted">
              <span className="flex gap-1" aria-hidden>
                {Array.from({ length: rules.lives }, (_, i) => (
                  <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < livesLeft ? "bg-primary" : "bg-wrong/60"}`} />
                ))}
              </span>
              {livesLeft} {livesLeft === 1 ? "life" : "lives"} left · {found.length}/10
            </span>
            {rules.hints && progress.hintsUsed < round.hints.length && (
              <HintButton cost={round.hints[progress.hintsUsed].cost} onClick={() => update({ ...progress, hintsUsed: progress.hintsUsed + 1 })} />
            )}
          </div>
          <RevealButton label="Show the list" onConfirm={() => update({ ...progress, gaveUp: true })} />
        </div>
      ) : (
        <div className="space-y-6">
          <ResultArea
            score={score}
            maxScore={MAX_SCORE}
            detail={`${found.length} of 10 found${wrong ? ` · ${wrong} wrong` : ""}${progress.hintsUsed ? ` · ${progress.hintsUsed} ${progress.hintsUsed === 1 ? "hint" : "hints"}` : ""}`}
            share={shareText(puzzle, round, progress)}
            stats={
              <StatsPanel
                mode={MODE}
                bucket={found.length}
                scorePct={(score / MAX_SCORE) * 100}
                order={Array.from({ length: 11 }, (_, i) => i)}
                label={(b) => String(b)}
                axis="Companies found"
              />
            }
          />
          <BuiltInEuropeCard company={top} founders={topFounders} />
        </div>
      )}
    </div>
  );
}
