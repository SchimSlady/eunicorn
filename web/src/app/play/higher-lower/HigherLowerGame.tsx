"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, X } from "lucide-react";
import type { Company, Dataset, HigherLowerPuzzle } from "@eunicorn/schema";
import { indexById, loadGame } from "@/lib/data";
import { getTodayResult, loadProgress, saveProgress, saveResult } from "@/lib/daily";
import { saveDifficulty, type Difficulty } from "@/lib/difficulty";
import { METRIC_META, formatMetric } from "@/lib/format";
import { shareText as buildShareText } from "@/lib/scoring";
import { CompanyLogo } from "@/components/CompanyLogo";
import { BuiltInEuropeCard } from "@/components/BuiltInEuropeCard";
import { GameIntro } from "@/components/GameIntro";
import { Flag } from "@/components/Flag";
import { GameHeader } from "@/components/GameHeader";
import { Announce, NoPuzzle } from "@/components/Announce";
import { GameFooter } from "@/components/GameFooter";
import { HintButton, HintList } from "@/components/HintButton";
import { ResultHeader } from "@/components/ResultHeader";

const MODE = "higher-lower";
const TITLE = "Higher or Lower";
const POINTS_PER_ROUND = 2;
/**
 * How each difficulty changes the game: the chain itself. Generated puzzles carry one chain
 * per level (easy: values far apart, hard: close together); a hand-made puzzle has one chain
 * for all levels. Hard also has no hints.
 */
const RULES: Record<Difficulty, { hints: boolean }> = {
  easy: { hints: true },
  medium: { hints: true },
  hard: { hints: false },
};

type Puzzle = HigherLowerPuzzle & {
  variants?: Partial<Record<Difficulty, { companyIds: string[]; hints: HigherLowerPuzzle["hints"] }>>;
};

/** The puzzle as played at this level: that level's chain and hints, if the puzzle has them. */
function atLevel(p: Puzzle, d: Difficulty): HigherLowerPuzzle {
  const v = p.variants?.[d];
  return v ? { ...p, companyIds: v.companyIds, hints: v.hints } : p;
}

/** How the two panels phrase the metric. */
const PHRASE: Record<HigherLowerPuzzle["metric"], { has: string; than: (name: string) => string }> = {
  lastValuationUsd: { has: "was last valued at", than: (n) => `valuation than ${n}` },
  totalRaisedUsd: { has: "has raised", than: (n) => `raised than ${n}` },
  founded: { has: "was founded in", than: (n) => `founding year than ${n}` },
  employees: { has: "has", than: (n) => `employees than ${n}` },
};

type Call = "higher" | "lower";


interface Progress {
  difficulty: Difficulty;
  answers: string[]; // "higher" | "lower" per round
  hintsUsed: number;
}

interface Round {
  previous: string; // shown with its value
  next: string; // the player says whether its value is higher or lower
  answer?: string;
  correct: boolean;
  truth: Call; // ties count either way, so this is only for display
}

/**
 * Classic higher or lower along a fixed chain (same for everyone): round i shows
 * companyIds[i-1] with its value and asks whether companyIds[i] is higher or lower.
 */
function playRounds(p: HigherLowerPuzzle, answers: string[], companies: Map<string, Company>): Round[] {
  const value = (id: string) => companies.get(id)?.[p.metric] ?? 0;
  const rounds: Round[] = [];
  for (let i = 1; i < p.companyIds.length; i++) {
    const previous = p.companyIds[i - 1];
    const next = p.companyIds[i];
    const a = value(previous);
    const b = value(next);
    const answer = answers[i - 1];
    const correct = (answer === "higher" && b >= a) || (answer === "lower" && b <= a);
    rounds.push({ previous, next, answer, correct, truth: b >= a ? "higher" : "lower" });
    if (answer === undefined || !correct) break; // unanswered, or the wrong answer that ended it
  }
  return rounds;
}

function evaluate(p: HigherLowerPuzzle, progress: Progress, companies: Map<string, Company>) {
  const rounds = playRounds(p, progress.answers, companies);
  const totalRounds = p.companyIds.length - 1;
  const correct = rounds.filter((r) => r.correct).length;
  const hintCost = p.hints.slice(0, progress.hintsUsed).reduce((s, h) => s + h.cost, 0);
  return {
    rules: RULES[progress.difficulty],
    rounds,
    totalRounds,
    correct,
    maxScore: totalRounds * POINTS_PER_ROUND,
    // Sudden death: the first wrong answer ends the game.
    done: progress.answers.length >= totalRounds || rounds.some((r) => r.answer !== undefined && !r.correct),
    score: Math.max(0, correct * POINTS_PER_ROUND - hintCost),
  };
}

function shareText(p: HigherLowerPuzzle, progress: Progress, companies: Map<string, Company>): string {
  const { rounds, score, correct, totalRounds, maxScore } = evaluate(p, progress, companies);
  const squares = rounds.filter((r) => r.answer !== undefined).map((r) => (r.correct ? "🟩" : "🟥")); // share text, not UI. taste-skill-ignore
  const summary = `${correct} of ${totalRounds} right`;
  return buildShareText({ number: p.number, modeTitle: TITLE, difficulty: progress.difficulty, hintsUsed: progress.hintsUsed, squares, summary, score, maxScore });
}

export function HigherLowerGame() {
  const [puzzle, setPuzzle] = useState<Puzzle | null | undefined>(undefined);
  const [data, setData] = useState<Dataset | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  // After answering, the round stays on screen with both numbers until "Next".
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    loadGame<Puzzle>(MODE).then(({ puzzle: p, data: d }) => {
      setData(d);
      setPuzzle(p);
      if (p) setProgress(loadProgress<Progress>(MODE, p.date));
    });
  }, []);

  const companies = useMemo(() => (data ? indexById(data.companies) : new Map<string, Company>()), [data]);

  function update(next: Progress) {
    if (!puzzle) return;
    const play = atLevel(puzzle, next.difficulty);
    setProgress(next);
    saveProgress(MODE, puzzle.date, next);
    const result = evaluate(play, next, companies);
    if (result.done && !getTodayResult(MODE, puzzle.date)) {
      saveResult(MODE, {
        date: puzzle.date,
        score: result.score,
        maxScore: result.maxScore,
        hintsUsed: next.hintsUsed,
        share: shareText(play, next, companies),
      });
    }
  }

  function answer(call: Call) {
    if (!progress) return;
    update({ ...progress, answers: [...progress.answers, call] });
    setReviewing(true);
  }

  if (puzzle === undefined || !data) return <p className="text-muted">Loading…</p>;
  if (puzzle === null) return <NoPuzzle />;

  const meta = METRIC_META[puzzle.metric];
  const phrase = PHRASE[puzzle.metric];

  // No progress yet: choose the level first. The game is set up from that choice.
  if (!progress) {
    return (
      <GameIntro
        mode={MODE}
        onStart={(d) => {
          saveDifficulty(d);
          const fresh: Progress = { difficulty: d, answers: [], hintsUsed: 0 };
          setProgress(fresh);
          saveProgress(MODE, puzzle.date, fresh);
        }}
      />
    );
  }

  const play = atLevel(puzzle, progress.difficulty);
  const { rules, rounds, totalRounds, correct, maxScore, done, score } = evaluate(play, progress, companies);
  const hints = play.hints.slice(0, progress.hintsUsed);
  const roundIndex = progress.answers.length;

  if (done && !reviewing) {
    const all = play.companyIds.map((id) => companies.get(id)!);
    const featured = all.find((c) => c.european && c.funFact) ?? all.find((c) => c.european)!;
    const founders = featured.founderIds
      .map((id) => data.people.find((p) => p.id === id)?.name)
      .filter((n): n is string => !!n);
    return (
      <div className="space-y-6">
        <GameHeader title={TITLE} difficulty={progress.difficulty} />
        <ResultHeader
          score={score}
          maxScore={maxScore}
          detail={`${correct} of ${totalRounds} right${progress.hintsUsed ? ` · ${progress.hintsUsed} ${progress.hintsUsed === 1 ? "hint" : "hints"}` : ""}`}
        />
        <ul className="space-y-2">
          {rounds.map((r, i) => {
            const a = companies.get(r.previous)!;
            const b = companies.get(r.next)!;
            return (
              <li key={i} className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-3 text-sm">
                {r.correct ? (
                  <Check size={18} className="shrink-0 text-correct" aria-label="Right" />
                ) : (
                  <X size={18} className="shrink-0 text-wrong" aria-label="Wrong" />
                )}
                <span className="flex-1 text-muted">
                  {a.name} {formatMetric(a, play.metric)}
                </span>
                {r.truth === "higher" ? (
                  <ArrowUp size={16} className="shrink-0 text-muted" aria-label="higher" />
                ) : (
                  <ArrowDown size={16} className="shrink-0 text-muted" aria-label="lower" />
                )}
                <span className="flex-1 text-right font-semibold">
                  {b.name} {formatMetric(b, play.metric)}
                </span>
              </li>
            );
          })}
        </ul>
        <HintList hints={hints} />
        <BuiltInEuropeCard company={featured} founders={founders} />
        <GameFooter share={shareText(play, progress, companies)} />
      </div>
    );
  }

  // The round on screen: the one being answered, or the one just answered while reviewing.
  const round = rounds[reviewing ? roundIndex - 1 : roundIndex];
  const prev = companies.get(round.previous)!;
  const next = companies.get(round.next)!;

  return (
    <div className="space-y-5">
      <GameHeader title={TITLE} difficulty={progress.difficulty} />
      <Announce
        text={
          reviewing
            ? `${round.correct ? "Right" : "Wrong"}. ${next.name} ${phrase.has} ${formatMetric(next, play.metric)}.`
            : `${prev.name} ${phrase.has} ${formatMetric(prev, play.metric)}. Is ${next.name} higher or lower?`
        }
      />

      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">
          Round {reviewing ? roundIndex : roundIndex + 1} of {totalRounds}
        </span>
        <span className="flex gap-1.5" aria-label={`${correct} right so far`}>
          {Array.from({ length: totalRounds }, (_, i) => {
            const r = rounds[i];
            const cls = r?.answer === undefined ? "border-2 border-primary/60" : r.correct ? "bg-correct" : "bg-wrong";
            return <span key={i} className={`h-2.5 w-5 rounded-full ${cls}`} />;
          })}
        </span>
      </div>

      {/* Two panels: side by side on wide screens, top and bottom on phones, VS in the middle. */}
      <div key={`${round.previous}-${round.next}`} className="grid overflow-hidden rounded-3xl text-white md:grid-cols-2">
        <Panel company={prev} tone="bg-eu-blue">
          <span className="text-sm text-white/70">{phrase.has}</span>
          <span className="font-display text-4xl font-bold text-eu-yellow sm:text-5xl">{formatMetric(prev, play.metric)}</span>
        </Panel>

        <Panel company={next} tone="relative bg-[#00205e] pt-12 md:pt-8">
          {/* On the boundary between the panels: top edge on phones, left edge side by side. */}
          <span className="absolute left-1/2 top-0 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white font-display text-lg font-bold text-eu-blue shadow-lg md:left-0 md:top-1/2">
            VS
          </span>
          {reviewing ? (
            <>
              <span className="text-sm text-white/70">{phrase.has}</span>
              <span className="animate-flip-in font-display text-4xl font-bold text-eu-yellow sm:text-5xl">{formatMetric(next, play.metric)}</span>
              <span
                className={`mt-1 flex animate-pop items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
                  round.correct ? "bg-correct" : "bg-wrong"
                }`}
              >
                {round.correct ? <Check size={16} aria-hidden /> : <X size={16} aria-hidden />}
                {round.correct ? "Right" : "Wrong"}
              </span>
            </>
          ) : (
            <>
              <div className="mt-1 flex w-full max-w-56 flex-col gap-2">
                {(["higher", "lower"] as const).map((call) => (
                  <button
                    key={call}
                    type="button"
                    onClick={() => answer(call)}
                    className="flex items-center justify-center gap-2 rounded-full border-2 border-white/80 px-4 py-2.5 font-semibold capitalize text-eu-yellow transition hover:bg-white/10 active:scale-[0.98]"
                  >
                    {call} {call === "higher" ? <ArrowUp size={18} aria-hidden /> : <ArrowDown size={18} aria-hidden />}
                  </button>
                ))}
              </div>
              <span className="text-sm text-white/70">{phrase.than(prev.name)}</span>
            </>
          )}
        </Panel>

      </div>

      <p className="text-center text-xs text-muted">{meta.label}, in euros</p>

      <HintList hints={hints} />

      {reviewing ? (
        <button
          type="button"
          onClick={() => setReviewing(false)}
          className="w-full rounded-full bg-primary px-4 py-3 font-semibold text-on-primary transition active:scale-[0.98]"
        >
          {done ? "See result" : "Next company"}
        </button>
      ) : (
        rules.hints &&
        progress.hintsUsed < play.hints.length && (
          <div className="flex justify-end">
            <HintButton cost={play.hints[progress.hintsUsed].cost} onClick={() => update({ ...progress, hintsUsed: progress.hintsUsed + 1 })} />
          </div>
        )
      )}
    </div>
  );
}

/** One half of the board: the company big, then whatever the round shows below it. */
function Panel({ company, tone, children }: { company: Company; tone: string; children: React.ReactNode }) {
  return (
    <div className={`flex min-h-64 flex-col items-center justify-center gap-1.5 px-6 py-8 text-center md:min-h-96 md:px-12 ${tone}`}>
      <CompanyLogo company={company} size={64} />
      <span className={`mt-2 font-display font-bold leading-tight ${company.name.length > 16 ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"}`}>
        {company.name}
      </span>
      <span className="flex items-center gap-1.5 text-xs text-white/60">
        <Flag country={company.country} size={12} /> {company.city}
      </span>
      {children}
    </div>
  );
}
