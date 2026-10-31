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
const POINTS_PER_PAIR = 2;
/** Picked when the hard-mode timer runs out; always counts as wrong. */
const TIMEOUT = "timeout";

/** How each difficulty changes the rules. Same pairs for everyone. */
const RULES: Record<Difficulty, { showFirstValue: boolean; hints: boolean; secondsPerPair: number | null }> = {
  easy: { showFirstValue: true, hints: true, secondsPerPair: null },
  medium: { showFirstValue: false, hints: true, secondsPerPair: null },
  hard: { showFirstValue: false, hints: false, secondsPerPair: 10 },
};

const RULES_TEXT: Record<Difficulty, string> = {
  easy: "See one company's number · hints",
  medium: "No numbers until you answer · hints",
  hard: "No numbers · no hints · 10 seconds per pair",
};

interface Progress {
  difficulty: Difficulty;
  answers: string[]; // picked company id per pair, or TIMEOUT
  hintsUsed: number;
}

function evaluate(p: HigherLowerPuzzle, progress: Progress) {
  const rules = RULES[progress.difficulty];
  const correct = progress.answers.filter((a, i) => a === p.pairs[i].higher).length;
  const hintCost = p.hints.slice(0, progress.hintsUsed).reduce((s, h) => s + h.cost, 0);
  const maxScore = p.pairs.length * POINTS_PER_PAIR;
  return {
    rules,
    correct,
    maxScore,
    done: progress.answers.length >= p.pairs.length,
    score: Math.max(0, correct * POINTS_PER_PAIR - hintCost),
  };
}

function shareText(p: HigherLowerPuzzle, progress: Progress): string {
  const { score, maxScore } = evaluate(p, progress);
  const squares = p.pairs.map((pair, i) => (progress.answers[i] === pair.higher ? "🟩" : "🟥"));
  const level = DIFFICULTY_META[progress.difficulty];
  const hints = progress.hintsUsed ? ` 💡${progress.hintsUsed}` : "";
  return `EUnicorn #${p.number} 📈 Higher or Lower ${score}/${maxScore}\n${level.emoji} ${level.label}\n${squares.join("")}${hints}\neunicorn.eu`;
}

export function HigherLowerGame() {
  const [puzzle, setPuzzle] = useState<HigherLowerPuzzle | null | undefined>(undefined);
  const [data, setData] = useState<Dataset | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  // After answering, the pair stays on screen with both numbers until "Next".
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

  // Hard mode: a countdown per pair. Running out counts as a wrong answer.
  const pairIndex = progress?.answers.length ?? 0;
  const seconds = progress ? RULES[progress.difficulty].secondsPerPair : null;
  const finished = !!puzzle && pairIndex >= puzzle.pairs.length;
  useEffect(() => {
    if (seconds === null || reviewing || finished) {
      setSecondsLeft(null);
      return;
    }
    const deadline = Date.now() + seconds * 1000;
    setSecondsLeft(seconds);
    const id = setInterval(() => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))), 200);
    return () => clearInterval(id);
  }, [seconds, pairIndex, reviewing, finished]);

  function update(next: Progress) {
    if (!puzzle) return;
    setProgress(next);
    saveProgress(MODE, puzzle.date, next);
    const result = evaluate(puzzle, next);
    if (result.done && !getTodayResult(MODE, puzzle.date)) {
      saveResult(MODE, {
        date: puzzle.date,
        score: result.score,
        maxScore: result.maxScore,
        hintsUsed: next.hintsUsed,
        share: shareText(puzzle, next),
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
          {puzzle.pairs.length} pairs of European startups. {meta.question}
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

  const { rules, correct, maxScore, done, score } = evaluate(puzzle, progress);

  // The pair on screen: the one being answered, or the one just answered while reviewing.
  const shownIndex = reviewing ? pairIndex - 1 : pairIndex;
  const pair = puzzle.pairs[shownIndex];
  const given = reviewing ? progress.answers[shownIndex] : undefined;

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
    const all = puzzle.pairs.flatMap((p) => [companies.get(p.a)!, companies.get(p.b)!]);
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
            {correct} of {puzzle.pairs.length} right{progress.hintsUsed ? ` · ${progress.hintsUsed} 💡` : ""}
          </p>
        </div>
        <ul className="space-y-2">
          {puzzle.pairs.map((p, i) => {
            const right = progress.answers[i] === p.higher;
            const a = companies.get(p.a)!;
            const b = companies.get(p.b)!;
            return (
              <li key={i} className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3 text-sm">
                <span aria-label={right ? "Right" : "Wrong"}>{right ? "✅" : "❌"}</span>
                <span className={`flex-1 ${p.higher === a.id ? "font-semibold" : "text-muted"}`}>
                  {a.name} {formatMetric(a, puzzle.metric)}
                </span>
                <span className="text-muted">vs</span>
                <span className={`flex-1 text-right ${p.higher === b.id ? "font-semibold" : "text-muted"}`}>
                  {b.name} {formatMetric(b, puzzle.metric)}
                </span>
              </li>
            );
          })}
        </ul>
        {hintsBlock}
        <BuiltInEuropeCard company={featured} founders={founders} />
        <ShareButton text={shareText(puzzle, progress)} />
        <Countdown />
        <Link href="/" className="block text-center text-sm font-medium text-primary">
          ← More games
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">
          Pair {shownIndex + 1} of {puzzle.pairs.length}
        </span>
        {secondsLeft !== null && (
          <span className={`font-mono font-semibold ${secondsLeft <= 3 ? "text-red-600" : "text-muted"}`}>⏱ {secondsLeft}s</span>
        )}
      </div>

      <p className="text-center text-lg font-semibold">{meta.question}</p>

      <div className="space-y-2">
        {[pair.a, pair.b].map((id, i) => {
          const c = companies.get(id)!;
          const showValue = reviewing || (i === 0 && rules.showFirstValue);
          const isHigher = id === pair.higher;
          const reviewStyle = !reviewing
            ? "border-border bg-surface hover:border-primary"
            : isHigher
              ? "border-green-600 bg-green-600/10"
              : given === id
                ? "border-red-600/50 bg-red-600/10"
                : "border-border bg-surface opacity-70";
          return (
            <div key={id}>
              {i === 1 && <p className="py-1 text-center text-xs font-semibold uppercase tracking-widest text-muted">vs</p>}
              <button
                type="button"
                disabled={reviewing}
                onClick={() => answer(id)}
                className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition ${reviewStyle}`}
              >
                <CompanyLogo company={c} size={52} />
                <span className="flex-1">
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
            {given === pair.higher ? "✅ Right" : given === TIMEOUT ? "⏱ Time's up" : "❌ Wrong"}
          </p>
          <button
            type="button"
            onClick={() => setReviewing(false)}
            className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-on-primary transition active:scale-[0.98]"
          >
            {done ? "See result" : "Next pair"}
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
