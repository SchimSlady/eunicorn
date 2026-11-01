"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, X } from "lucide-react";
import type { Company, Dataset } from "@eunicorn/schema";
import { metricValue, type WebHigherLowerPuzzle } from "@/lib/higherLower";
import { indexById, loadGame } from "@/lib/data";
import { getTodayResult, loadProgress, saveProgress, saveResult } from "@/lib/daily";
import { saveDifficulty, type Difficulty } from "@/lib/difficulty";
import { formatMetric } from "@/lib/format";
import { shareText as buildShareText } from "@/lib/scoring";
import { CompanyLogo } from "@/components/CompanyLogo";
import { BuiltInEuropeCard } from "@/components/BuiltInEuropeCard";
import { GameIntro } from "@/components/GameIntro";
import { Flag } from "@/components/Flag";
import { GameHeader } from "@/components/GameHeader";
import { Announce, GameSkeleton, NoPuzzle } from "@/components/Announce";
import { Hints, hintState } from "@/components/Hints";
import { ResultArea } from "@/components/ResultArea";
import { StatsPanel } from "@/components/StatsPanel";
import { recordFinish, recordStart } from "@/lib/stats";

const MODE = "higher-lower";
const TITLE = "Higher or Lower";
const POINTS_PER_ROUND = 2;

/**
 * A level changes which companies are in the chain (well known on Easy, insiders on Hard) and
 * how many hints are on offer; the game is the same. Generated puzzles carry one chain per level;
 * a hand-made puzzle has one chain for all levels.
 */
type Puzzle = WebHigherLowerPuzzle;
type HigherLowerPuzzle = WebHigherLowerPuzzle;

/** The puzzle as played at this level: that level's chain and hints, if the puzzle has them. */
function atLevel(p: Puzzle, d: Difficulty): HigherLowerPuzzle {
  const v = p.variants?.[d];
  return v ? { ...p, companyIds: v.companyIds, hints: v.hints } : p;
}

/** How the two panels phrase the metric. */
/** `higher` / `lower` are the button labels; for founding years "higher" means later. */
const PHRASE: Record<HigherLowerPuzzle["metric"], { has: string; higher: string; lower: string; question: (name: string) => string }> = {
  lastValuationUsd: { has: "was last valued at", higher: "higher", lower: "lower", question: (n: string) => `Is ${n} higher or lower?` },
  totalRaisedUsd: { has: "has raised", higher: "higher", lower: "lower", question: (n: string) => `Is ${n} higher or lower?` },
  founded: { has: "was founded in", higher: "later", lower: "earlier", question: (n: string) => `Was ${n} founded earlier or later?` },
  employees: { has: "has", higher: "higher", lower: "lower", question: (n: string) => `Is ${n} higher or lower?` },
  biggestRoundUsd: { has: "raised in its biggest round", higher: "higher", lower: "lower", question: (n: string) => `Was ${n}'s biggest round higher or lower?` },
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
  const value = (id: string) => {
    const c = companies.get(id);
    return c ? (metricValue(c, p.metric) ?? 0) : 0;
  };
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
  const { rounds, correct, totalRounds } = evaluate(p, progress, companies);
  const squares = rounds.filter((r) => r.answer !== undefined).map((r) => (r.correct ? "🟩" : "🟥")); // share text, not UI. taste-skill-ignore
  const summary = `${correct} of ${totalRounds} right`;
  return buildShareText({ number: p.number, modeTitle: p.theme ? `${TITLE} · ${p.theme}` : TITLE, difficulty: progress.difficulty, hintsUsed: progress.hintsUsed, squares, summary });
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
      recordFinish(MODE, next.difficulty, { bucket: result.correct, score: result.score, maxScore: result.maxScore, won: result.correct === result.totalRounds });
    }
  }

  function answer(call: Call) {
    if (!progress) return;
    update({ ...progress, answers: [...progress.answers, call] });
    setReviewing(true);
  }

  if (puzzle === undefined || !data) return <GameSkeleton />;
  if (puzzle === null) return <NoPuzzle />;

  const phrase = PHRASE[puzzle.metric];

  // No progress yet: choose the level first. The game is set up from that choice.
  if (!progress) {
    return (
      <GameIntro
        mode={MODE}
        onStart={(d) => {
          saveDifficulty(d);
          const fresh: Progress = { difficulty: d, answers: [], hintsUsed: 0 };
          recordStart(MODE, d);
          setProgress(fresh);
          saveProgress(MODE, puzzle.date, fresh);
        }}
      />
    );
  }

  const play = atLevel(puzzle, progress.difficulty);
  const { rounds, totalRounds, correct, maxScore, done, score } = evaluate(play, progress, companies);
  const roundIndex = progress.answers.length;

  if (done && !reviewing) {
    // The company that ended the run; with every call right, the last one in the chain.
    const missed = rounds.find((r) => r.answer !== undefined && !r.correct);
    const featured = companies.get(missed ? missed.next : play.companyIds.at(-1)!)!;
    const reason = missed ? "The one that ended your run" : "The last one in the chain";
    const founders = featured.founderIds
      .map((id) => data.people.find((p) => p.id === id)?.name)
      .filter((n): n is string => !!n);
    return (
      <div className="space-y-6">
        <GameHeader title={TITLE} mode={MODE} difficulty={progress.difficulty} />
        <ResultArea
          score={score}
          maxScore={maxScore}
          detail={`${correct} of ${totalRounds} right${progress.hintsUsed ? ` · ${progress.hintsUsed} ${progress.hintsUsed === 1 ? "hint" : "hints"}` : ""}`}
          share={shareText(play, progress, companies)}
          stats={
            <StatsPanel
              mode={MODE}
              bucket={correct}
              score={score}
              maxScore={maxScore}
              order={Array.from({ length: totalRounds + 1 }, (_, i) => i)}
              label={(b) => String(b)}
              axis="Rounds right"
            />
          }
        />
        <LastRound
          round={missed ?? rounds.filter((r) => r.answer !== undefined).at(-1)!}
          ended={!!missed}
          companies={companies}
          metric={play.metric}
          phrase={phrase}
        />
        <BuiltInEuropeCard company={featured} founders={founders} reason={reason} />
      </div>
    );
  }

  // The round on screen: the one being answered, or the one just answered while reviewing.
  const round = rounds[reviewing ? roundIndex - 1 : roundIndex];
  const prev = companies.get(round.previous)!;
  const next = companies.get(round.next)!;

  return (
    <div className="space-y-5">
      <GameHeader title={TITLE} mode={MODE} difficulty={progress.difficulty} />
      <Announce
        text={
          reviewing
            ? `${round.correct ? "Right" : "Wrong"}. ${next.name} ${phrase.has} ${formatMetric(next, play.metric)}.`
            : `${prev.name} ${phrase.has} ${formatMetric(prev, play.metric)}. ${phrase.question(next.name)}`
        }
      />

      {play.theme && (
        <p className="text-center text-sm font-semibold">
          <span className="rounded-full bg-primary px-3 py-1 text-on-primary">Theme day: {play.theme}</span>
        </p>
      )}

      {/* One dot per round, sharing the width, so even 15 rounds fit a phone. */}
      <div className="text-sm">
        <span className="flex gap-1" role="img" aria-label={`Round ${reviewing ? roundIndex : roundIndex + 1} of ${totalRounds}, ${correct} right so far`}>
          {Array.from({ length: totalRounds }, (_, i) => {
            const r = rounds[i];
            const cls = r?.answer === undefined ? "border-2 border-primary/60" : r.correct ? "bg-correct" : "bg-wrong";
            return <span key={i} className={`h-2.5 min-w-0 flex-1 rounded-full ${cls}`} />;
          })}
        </span>
      </div>

      {/* Two panels: side by side on wide screens, top and bottom on phones, VS in the middle. */}
      <div key={`${round.previous}-${round.next}`} className="grid overflow-hidden rounded-3xl text-white md:grid-cols-2">
        <Panel company={prev} tone="bg-eu-blue" phone="pb-7 pt-4">
          <span className="text-sm text-white/70">{phrase.has}</span>
          <span className="font-display text-3xl font-bold text-eu-yellow sm:text-5xl">{formatMetric(prev, play.metric)}</span>
        </Panel>

        <Panel company={next} tone="relative bg-[#00205e]" phone="pb-4 pt-7">
          {/* On the boundary between the panels: top edge on phones, left edge side by side. */}
          <span className="absolute left-1/2 top-0 z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white font-display text-base font-bold text-eu-blue shadow-lg md:left-0 md:top-1/2 md:h-14 md:w-14 md:text-lg">
            VS
          </span>
          {reviewing ? (
            <>
              {/* Same label as the left panel (side by side), so the two values sit on one line. */}
              <span className="hidden text-sm text-white/70 md:block">{phrase.has}</span>
              {/* The value and whether the call was right, on one line. */}
              <div className="mt-1 flex items-center gap-2.5 md:mt-0">
                <span className="animate-flip-in font-display text-3xl font-bold text-eu-yellow sm:text-5xl">{formatMetric(next, play.metric)}</span>
                <span
                  className={`flex animate-pop items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ${
                    round.correct ? "bg-correct" : "bg-wrong"
                  }`}
                >
                  {round.correct ? <Check size={16} aria-hidden /> : <X size={16} aria-hidden />}
                  {round.correct ? "Right" : "Wrong"}
                </span>
              </div>
              <button
                type="button"
                autoFocus
                onClick={() => setReviewing(false)}
                className="mt-2 w-full max-w-56 rounded-full bg-primary px-4 py-2.5 font-semibold text-on-primary transition active:scale-[0.98]"
              >
                {done ? "See result" : "Next company"}
              </button>
            </>
          ) : (
            <>
              <span aria-hidden className="hidden h-5 md:block" />
              <div className="mt-1 grid w-full grid-cols-2 gap-2 sm:max-w-56 sm:grid-cols-1">
                {(["higher", "lower"] as const).map((call) => (
                  <button
                    key={call}
                    type="button"
                    onClick={() => answer(call)}
                    className="flex items-center justify-center gap-1.5 rounded-full border-2 border-white/80 px-3 py-2.5 font-semibold capitalize text-eu-yellow transition hover:bg-white/10 active:scale-[0.98]"
                  >
                    {phrase[call]} {call === "higher" ? <ArrowUp size={18} aria-hidden /> : <ArrowDown size={18} aria-hidden />}
                  </button>
                ))}
              </div>
            </>
          )}
        </Panel>

      </div>

      {!reviewing && (
        <div className="flex justify-end">
          <Hints
            {...hintState(progress.difficulty, play.hints, progress.hintsUsed)}
            onReveal={() => update({ ...progress, hintsUsed: progress.hintsUsed + 1 })}
          />
        </div>
      )}
    </div>
  );
}

/** One half of the board: the company big, then whatever the round shows below it. */
function Panel({ company, tone, phone, children }: { company: Company; tone: string; phone: string; children: React.ReactNode }) {
  // Side by side, both panels are laid out from the top on the same grid (the name always has room for two
  // lines), so logo, name, city and value line up across them. On a phone each is centred as before.
  return (
    <div className={`flex flex-col items-center justify-center gap-1 px-4 text-center md:min-h-96 md:justify-start md:gap-1.5 md:px-12 md:pb-8 md:pt-14 ${phone} ${tone}`}>
      <CompanyLogo company={company} size={52} />
      <span className={`mt-1 font-display font-bold leading-tight md:mt-2 md:flex md:min-h-[4.5rem] md:items-center md:justify-center ${company.name.length > 16 ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"}`}>
        {company.name}
      </span>
      <span className="flex items-center gap-1.5 text-xs text-white/60">
        <Flag country={company.country} size={12} /> {company.city}
      </span>
      {children}
    </div>
  );
}

/**
 * After the game, just the round that decided it (the miss, or the last round of a perfect run):
 * both companies with logo and value, which way it went and what the player said. A list of every
 * round got long and unreadable after a good run.
 */
function LastRound({
  round,
  ended,
  companies,
  metric,
  phrase,
}: {
  round: Round;
  ended: boolean;
  companies: Map<string, Company>;
  metric: Puzzle["metric"];
  phrase: (typeof PHRASE)[keyof typeof PHRASE];
}) {
  const a = companies.get(round.previous)!;
  const b = companies.get(round.next)!;
  const said = round.answer === "higher" ? phrase.higher : phrase.lower;
  const truth = round.truth === "higher" ? phrase.higher : phrase.lower;
  const side = (c: Company, strong: boolean) => (
    <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
      <CompanyLogo company={c} size={44} />
      <span className="max-w-full truncate text-sm font-semibold">{c.name}</span>
      <span className={`font-display text-xl font-bold ${strong ? "text-primary" : "text-muted"}`}>{formatMetric(c, metric)}</span>
    </div>
  );
  return (
    <section className="rounded-2xl border border-border bg-surface p-4" aria-label={ended ? "Where it ended" : "The last round"}>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">{ended ? "Where it ended" : "The last round"}</p>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {side(a, false)}
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full ${round.correct ? "bg-correct" : "bg-wrong"} text-white`}
          aria-label={round.correct ? "Right" : "Wrong"}
        >
          {round.correct ? <Check size={20} aria-hidden /> : <X size={20} aria-hidden />}
        </span>
        {side(b, true)}
      </div>
      <p className="mt-3 text-center text-sm text-muted">
        You said {said}. {b.name} was {truth}.
      </p>
    </section>
  );
}
