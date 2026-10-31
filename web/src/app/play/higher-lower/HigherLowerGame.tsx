"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Company, Dataset, HigherLowerPuzzle } from "@eunicorn/schema";
import { indexById, loadDataset } from "@/lib/data";
import { getTodayResult, loadProgress, loadTodayPuzzle, saveProgress, saveResult } from "@/lib/daily";
import { DIFFICULTY_META, loadDifficulty, saveDifficulty, type Difficulty } from "@/lib/difficulty";
import { METRIC_META, formatMetric } from "@/lib/format";
import { CompanyLogo } from "@/components/CompanyLogo";
import { ShareButton } from "@/components/ShareButton";
import { Countdown } from "@/components/Countdown";
import { BuiltInEuropeCard } from "@/components/BuiltInEuropeCard";
import { DifficultyPicker } from "@/components/DifficultyPicker";

const MODE = "higher-lower";
const POINTS_PER_ROUND = 2;
/** Recorded when the hard-mode timer runs out; always counts as wrong. */
const TIMEOUT = "timeout";

/** How each difficulty changes the rules. Same chain of companies for everyone. */
const RULES: Record<Difficulty, { showChampionValue: boolean; hints: boolean; secondsPerRound: number | null }> = {
  easy: { showChampionValue: true, hints: true, secondsPerRound: null },
  medium: { showChampionValue: false, hints: true, secondsPerRound: null },
  hard: { showChampionValue: false, hints: false, secondsPerRound: 10 },
};

const RULES_TEXT: Record<Difficulty, string> = {
  easy: "See the current company's number · hints",
  medium: "No numbers until you answer · hints",
  hard: "No numbers · no hints · 10 seconds per round",
};

interface Progress {
  difficulty: Difficulty;
  answers: string[]; // picked company id per round, or TIMEOUT
  hintsUsed: number;
}

interface Round {
  champion: string; // stays on from the previous round (the player's pick)
  challenger: string; // next company in the chain
  answer?: string;
  correct: boolean;
  higher: string;
}

/**
 * Replays the chain: round 1 is companyIds[0] vs companyIds[1]; after that, whatever the
 * player picked stays on and faces the next company. A timeout carries the right answer on.
 */
function playRounds(p: HigherLowerPuzzle, answers: string[], companies: Map<string, Company>): Round[] {
  const value = (id: string) => companies.get(id)?.[p.metric] ?? 0;
  const rounds: Round[] = [];
  let champion = p.companyIds[0];
  for (let i = 1; i < p.companyIds.length; i++) {
    const challenger = p.companyIds[i];
    const higher = value(champion) >= value(challenger) ? champion : challenger;
    const answer = answers[i - 1];
    const other = answer === champion ? challenger : champion;
    // Ties count either way.
    const correct = answer !== undefined && answer !== TIMEOUT && value(answer) >= value(other);
    rounds.push({ champion, challenger, answer, correct, higher });
    if (answer === undefined) break;
    champion = answer === TIMEOUT ? higher : answer;
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
    done: progress.answers.length >= totalRounds,
    score: Math.max(0, correct * POINTS_PER_ROUND - hintCost),
  };
}

function shareText(p: HigherLowerPuzzle, progress: Progress, companies: Map<string, Company>): string {
  const { rounds, score, maxScore } = evaluate(p, progress, companies);
  const squares = rounds.map((r) => (r.correct ? "🟩" : "🟥"));
  const level = DIFFICULTY_META[progress.difficulty];
  const hints = progress.hintsUsed ? ` 💡${progress.hintsUsed}` : "";
  return `EUnicorn #${p.number} 📈 Higher or Lower ${score}/${maxScore}\n${level.emoji} ${level.label}\n${squares.join("")}${hints}\neunicorn.eu`;
}

export function HigherLowerGame() {
  const [puzzle, setPuzzle] = useState<HigherLowerPuzzle | null | undefined>(undefined);
  const [data, setData] = useState<Dataset | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  // After answering, the round stays on screen with both numbers until "Next".
  const [reviewing, setReviewing] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([loadTodayPuzzle<HigherLowerPuzzle>(MODE), loadDataset()]).then(([p, d]) => {
      setData(d);
      setPuzzle(p);
      if (p) setProgress(loadProgress<Progress>(MODE, p.date));
    });
  }, []);

  const companies = useMemo(() => (data ? indexById(data.companies) : new Map<string, Company>()), [data]);

  // Hard mode: a countdown per round. Running out counts as a wrong answer.
  const roundIndex = progress?.answers.length ?? 0;
  const seconds = progress ? RULES[progress.difficulty].secondsPerRound : null;
  const finished = !!puzzle && roundIndex >= puzzle.companyIds.length - 1;
  useEffect(() => {
    if (seconds === null || reviewing || finished) {
      setSecondsLeft(null);
      return;
    }
    const deadline = Date.now() + seconds * 1000;
    setSecondsLeft(seconds);
    const id = setInterval(() => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))), 200);
    return () => clearInterval(id);
  }, [seconds, roundIndex, reviewing, finished]);

  function update(next: Progress) {
    if (!puzzle) return;
    setProgress(next);
    saveProgress(MODE, puzzle.date, next);
    const result = evaluate(puzzle, next, companies);
    if (result.done && !getTodayResult(MODE, puzzle.date)) {
      saveResult(MODE, {
        date: puzzle.date,
        score: result.score,
        maxScore: result.maxScore,
        hintsUsed: next.hintsUsed,
        share: shareText(puzzle, next, companies),
      });
    }
  }

  function answer(id: string) {
    if (!progress) return;
    update({ ...progress, answers: [...progress.answers, id] });
    setReviewing(true);
  }

  useEffect(() => {
    if (secondsLeft === 0 && !reviewing && !finished) answer(TIMEOUT);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once when the clock hits zero
  }, [secondsLeft]);

  if (puzzle === undefined || !data) return <p className="text-muted">Loading…</p>;
  if (puzzle === null) return <p className="text-muted">No puzzle today. Check back tomorrow.</p>;

  const meta = METRIC_META[puzzle.metric];
  const header = (
    <header className="flex items-baseline justify-between">
      <h1 className="text-2xl font-bold">Higher or Lower</h1>
      <span className="text-sm text-muted">
        {progress && `${DIFFICULTY_META[progress.difficulty].emoji} ${DIFFICULTY_META[progress.difficulty].label} · `}#{puzzle.number}
      </span>
    </header>
  );

  // No progress yet: choose the level first. The game is set up from that choice.
  if (!progress) {
    return (
      <div className="space-y-6">
        {header}
        <p className="text-muted">
          {meta.question} The company you pick stays on and faces the next challenger. {puzzle.companyIds.length - 1} rounds.
        </p>
        <DifficultyPicker
          initial={loadDifficulty()}
          rules={RULES_TEXT}
          onStart={(d) => {
            saveDifficulty(d);
            const fresh: Progress = { difficulty: d, answers: [], hintsUsed: 0 };
            setProgress(fresh);
            saveProgress(MODE, puzzle.date, fresh);
          }}
        />
      </div>
    );
  }

  const { rules, rounds, totalRounds, correct, maxScore, done, score } = evaluate(puzzle, progress, companies);

  const hintsBlock = progress.hintsUsed > 0 && (
    <ul className="space-y-2">
      {puzzle.hints.slice(0, progress.hintsUsed).map((h, i) => (
        <li key={i} className="rounded-xl bg-eu-yellow/20 p-3 text-sm">
          💡 {h.text}
        </li>
      ))}
    </ul>
  );

  if (done && !reviewing) {
    const all = puzzle.companyIds.map((id) => companies.get(id)!);
    const featured = all.find((c) => c.european && c.funFact) ?? all.find((c) => c.european)!;
    const founders = featured.founderIds
      .map((id) => data.people.find((p) => p.id === id)?.name)
      .filter((n): n is string => !!n);
    return (
      <div className="space-y-6">
        {header}
        <div className="text-center">
          <p className="text-3xl font-bold">
            {score}/{maxScore}
          </p>
          <p className="mt-1 text-muted">
            {correct} of {totalRounds} right{progress.hintsUsed ? ` · ${progress.hintsUsed} 💡` : ""}
          </p>
        </div>
        <ul className="space-y-2">
          {rounds.map((r, i) => {
            const a = companies.get(r.champion)!;
            const b = companies.get(r.challenger)!;
            return (
              <li key={i} className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3 text-sm">
                <span aria-label={r.correct ? "Right" : "Wrong"}>{r.correct ? "✅" : "❌"}</span>
                <span className={`flex-1 ${r.higher === a.id ? "font-semibold" : "text-muted"}`}>
                  {a.name} {formatMetric(a, puzzle.metric)}
                </span>
                <span className="text-muted">vs</span>
                <span className={`flex-1 text-right ${r.higher === b.id ? "font-semibold" : "text-muted"}`}>
                  {b.name} {formatMetric(b, puzzle.metric)}
                </span>
              </li>
            );
          })}
        </ul>
        {hintsBlock}
        <BuiltInEuropeCard company={featured} founders={founders} />
        <ShareButton text={shareText(puzzle, progress, companies)} />
        <Countdown />
        <Link href="/" className="block text-center text-sm font-medium text-primary">
          ← More games
        </Link>
      </div>
    );
  }

  // The round on screen: the one being answered, or the one just answered while reviewing.
  const round = rounds[reviewing ? roundIndex - 1 : roundIndex];
  const given = reviewing ? round.answer : undefined;

  return (
    <div className="space-y-6">
      {header}

      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">
          Round {reviewing ? roundIndex : roundIndex + 1} of {totalRounds}
        </span>
        {secondsLeft !== null && (
          <span className={`font-mono font-semibold ${secondsLeft <= 3 ? "text-red-600" : "text-muted"}`}>⏱ {secondsLeft}s</span>
        )}
      </div>

      <p className="text-center text-lg font-semibold">{meta.question}</p>

      <div className="space-y-2">
        {[round.champion, round.challenger].map((id, i) => {
          const c = companies.get(id)!;
          const isChampion = i === 0;
          const showValue = reviewing || (isChampion && rules.showChampionValue);
          const isHigher = id === round.higher;
          const reviewStyle = !reviewing
            ? "border-border bg-surface hover:border-primary"
            : isHigher
              ? "border-green-600 bg-green-600/10"
              : given === id
                ? "border-red-600/50 bg-red-600/10"
                : "border-border bg-surface opacity-70";
          return (
            // Keyed per round so a card that moves up doesn't animate out of last round's colors.
            <div key={`${round.champion}-${round.challenger}-${id}`}>
              {!isChampion && <p className="py-1 text-center text-xs font-semibold uppercase tracking-widest text-muted">vs</p>}
              <button
                type="button"
                disabled={reviewing}
                onClick={() => answer(id)}
                className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition ${reviewStyle}`}
              >
                <CompanyLogo company={c} size={52} />
                <span className="flex-1">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-muted">
                    {isChampion ? (round === rounds[0] ? "Start" : "Your pick") : "Challenger"}
                  </span>
                  <span className="block text-lg font-bold">{c.name}</span>
                  <span className="block text-sm text-muted">
                    {c.city} · {c.founded}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-xs text-muted">{meta.label}</span>
                  <span className="block text-lg font-bold">{showValue ? formatMetric(c, puzzle.metric) : "?"}</span>
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {hintsBlock}

      {reviewing ? (
        <div className="space-y-2">
          <p className="text-center font-semibold">
            {round.correct ? "✅ Right" : given === TIMEOUT ? "⏱ Time's up" : "❌ Wrong"}
          </p>
          {!done && (
            <p className="text-center text-sm text-muted">
              {companies.get(given === TIMEOUT ? round.higher : given!)!.name} stays on for the next round.
            </p>
          )}
          <button
            type="button"
            onClick={() => setReviewing(false)}
            className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-on-primary transition active:scale-[0.98]"
          >
            {done ? "See result" : "Next challenger"}
          </button>
        </div>
      ) : (
        rules.hints &&
        progress.hintsUsed < puzzle.hints.length && (
          <div className="flex justify-end text-sm">
            <button
              type="button"
              onClick={() => update({ ...progress, hintsUsed: progress.hintsUsed + 1 })}
              className="rounded-full border border-border px-3 py-1 font-medium hover:border-primary"
            >
              💡 Hint (−{puzzle.hints[progress.hintsUsed].cost})
            </button>
          </div>
        )
      )}
    </div>
  );
}
