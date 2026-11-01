"use client";

import { useEffect, useMemo, useState } from "react";
import type { Company, Dataset } from "@eunicorn/schema";
import { indexById, loadGame } from "@/lib/data";
import { getTodayResult, loadProgress, saveProgress, saveResult } from "@/lib/daily";
import { saveDifficulty, type Difficulty } from "@/lib/difficulty";
import { countryName, formatMetric } from "@/lib/format";
import { shareText as buildShareText } from "@/lib/scoring";
import type { Top10Puzzle, Top10Round } from "@/lib/top10";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Flag } from "@/components/Flag";
import { CompanySearch } from "@/components/CompanySearch";
import { BuiltInEuropeCard } from "@/components/BuiltInEuropeCard";
import { GameIntro } from "@/components/GameIntro";
import { GameHeader } from "@/components/GameHeader";
import { Announce, GameSkeleton, NoPuzzle } from "@/components/Announce";
import { Hints, hintState } from "@/components/Hints";
import { ResultArea } from "@/components/ResultArea";
import { RevealButton } from "@/components/RevealButton";
import { Leaderboard } from "@/components/Leaderboard";
import { StatsPanel } from "@/components/StatsPanel";
import { recordFinish, recordStart } from "@/lib/stats";

const MODE = "top-10";
const TITLE = "Top 10";
const MAX_SCORE = 10;

/** A wrong name costs half a point of the ten. There is no limit on guesses: the game ends at ten found, or when you give up. */
const WRONG_COST = 0.5;

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
  const found = progress.guesses.filter((id) => p.companyIds.includes(id));
  const wrong = progress.guesses.length - found.length;
  const done = progress.gaveUp || found.length === p.companyIds.length;
  const hintCost = p.hints.slice(0, progress.hintsUsed).reduce((s, h) => s + h.cost, 0);
  return { found, wrong, done, score: Math.max(0, found.length - wrong * WRONG_COST - hintCost) };
}

function shareText(p: Top10Puzzle, round: Top10Round, progress: Progress): string {
  const { found } = evaluate(round, progress);
  const squares = progress.guesses.map((id) => (round.companyIds.includes(id) ? "🟩" : "🟥")); // share text, not UI. taste-skill-ignore
  return buildShareText({
    number: p.number,
    modeTitle: TITLE,
    difficulty: progress.difficulty,
    hintsUsed: progress.hintsUsed,
    squares,
    summary: `${found.length} of 10 found`,
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

  if (puzzle === undefined || !data) return <GameSkeleton />;
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
  const { found, wrong, done, score } = evaluate(round, progress);

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

  // End card: the player's rarest find (highest difficulty, then lowest rank); none found: No. 1.
  const foundCompanies = found.map((id) => companies.get(id)!);
  const top =
    [...foundCompanies].sort((a, b) => b.difficulty - a.difficulty || round.companyIds.indexOf(b.id) - round.companyIds.indexOf(a.id))[0] ??
    companies.get(round.companyIds[0])!;
  const topReason = foundCompanies.length ? "Your deepest pick" : "No. 1 on the list";
  const topFounders = top.founderIds.map((id) => data.people.find((p) => p.id === id)?.name).filter((n): n is string => !!n);

  return (
    <div className="space-y-3">
      <GameHeader title={TITLE} mode={MODE} difficulty={progress.difficulty} />
      <Announce
        text={
          miss && !done
            ? `${miss.name} is not in the list.`
            : `${found.length} of 10 found.`
        }
      />

      <p className="rounded-2xl bg-eu-blue px-3 py-2 text-center font-display text-base font-bold leading-snug text-white">{round.title}</p>

      {/* The rows share the screen height left over (about 24rem is taken by the rest), so the whole game fits without scrolling. */}
      <ol className="space-y-[3px]">
        {round.companyIds.map((id, i) => {
          const c = companies.get(id)!;
          const got = found.includes(id);
          const shown = got || done;
          return (
            <li
              key={id}
              style={{ height: "clamp(28px, calc((100dvh - 392px) / 10), 44px)" }}
              className={`flex items-center gap-2.5 rounded-xl border px-2.5 ${
                got ? "animate-flip-in border-border bg-surface" : shown ? "border-border bg-surface/40 opacity-60" : "border-dashed border-border"
              }`}
            >
              <span className="w-6 text-right font-display text-base font-bold text-primary">{i + 1}</span>
              {shown ? (
                <>
                  <CompanyLogo company={c} size={24} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{c.name}</span>
                  <span className="shrink-0 text-sm tabular-nums text-muted">{formatMetric(c, round.metric)}</span>
                </>
              ) : (
                // Every empty slot shows its country's flag, like Football 11: on a Europe list it narrows things
                // down, on a Germany or Sweden list every flag is the same and the clue is gone.
                <>
                  <Flag country={c.country} size={22} />
                  <span className="sr-only">From {countryName(c.country)}</span>
                  <span className="text-sm text-muted">?</span>
                </>
              )}
            </li>
          );
        })}
      </ol>

      {!done ? (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <CompanySearch companies={data.companies} exclude={new Set(progress.guesses)} onPick={guess} />
            </div>
            <Hints
              compact
              {...hintState(progress.difficulty, round.hints, progress.hintsUsed)}
              onReveal={() => update({ ...progress, hintsUsed: progress.hintsUsed + 1 })}
            />
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
              <>
                <StatsPanel
                mode={MODE}
                bucket={found.length}
                scorePct={(score / MAX_SCORE) * 100}
                order={Array.from({ length: 11 }, (_, i) => i)}
                label={(b) => String(b)}
                axis="Companies found"
              />
                <Leaderboard mode={MODE} difficulty={progress.difficulty} scorePct={(score / MAX_SCORE) * 100} hintsUsed={progress.hintsUsed} />
              </>
            }
          />
          <BuiltInEuropeCard company={top} founders={topFounders} reason={topReason} />
        </div>
      )}
    </div>
  );
}
