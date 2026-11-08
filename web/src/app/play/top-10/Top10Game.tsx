"use client";

import { useEffect, useMemo, useState } from "react";

import type { Company, Dataset } from "@eunicorn/schema";
import { indexById, loadGame } from "@/lib/data";
import { getTodayResult, loadProgress, saveProgress, saveResult } from "@/lib/daily";
import { saveDifficulty, type Difficulty, hintLimit } from "@/lib/difficulty";
import { countryName, formatMetric, formatUsdAsEur } from "@/lib/format";
import { shareText as buildShareText } from "@/lib/scoring";
import type { Top10Puzzle, Top10Round } from "@/lib/top10";
import { nudgeClass } from "@/lib/nudge";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Flag } from "@/components/Flag";
import { CompanySearch } from "@/components/CompanySearch";
import { BuiltInEuropeCard } from "@/components/BuiltInEuropeCard";
import { CompanyTap, OverviewProvider } from "@/components/CompanyOverview";
import { GameIntro } from "@/components/GameIntro";
import { GameHeader } from "@/components/GameHeader";
import { Announce, GameSkeleton, NoPuzzle } from "@/components/Announce";
import { Hints } from "@/components/Hints";
import { companyFact, pickRandom, strengthOf } from "@/lib/hints";
import { ResultArea } from "@/components/ResultArea";
import { RevealButton } from "@/components/RevealButton";
import { StatsPanel } from "@/components/StatsPanel";
import { recordFinish, recordStart } from "@/lib/stats";
import { REGIONS, slotOf, type Region } from "@/lib/regions";
import { explainMiss } from "@/lib/top10Checks";
import { MissToast } from "@/components/MissToast";

const MODE = "top-10";
const TITLE = "Top 10";
const MAX_SCORE = 10;

/** The score is the number found (Pablo, 2026-11-02): wrong names cost nothing. No limit on guesses: the game ends at ten found, or when you give up. */

interface Progress {
  difficulty: Difficulty;
  guesses: string[]; // company ids, in order: found or wrong
  hintsUsed: number;
  /** The hints revealed so far, as shown (drawn when revealed, so they don't change on reload). */
  hintTexts?: string[];
  /** The startup each hint is about, so the next hint picks a different one. */
  hintIds?: string[];
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
  // Hints are free (Pablo, 2026-11-02): they show in the share text and break leaderboard ties, but cost no points.
  return { found, wrong, done, score: found.length };
}

function shareText(p: Top10Puzzle, round: Top10Round, progress: Progress, region?: Region): string {
  const { found } = evaluate(round, progress);
  // One square per place in the list (found or not), so "3 of 10" shows as 3 of 10 squares.
  const squares = round.companyIds.map((id) => (progress.guesses.includes(id) ? "🟩" : "⬜")); // share text, not UI. taste-skill-ignore
  return buildShareText({
    number: p.number,
    modeTitle: region ? `${TITLE} · ${REGIONS[region].label}` : TITLE,
    difficulty: progress.difficulty,
    hintsUsed: progress.hintsUsed,
    squares,
    summary: `${found.length} of 10 found`,
  });
}

/** region: the Local tab's game for that region (its own daily lock, no streak or player stats); none: the daily game. */
export function Top10Game({ region }: { region?: Region } = {}) {
  const slot = slotOf(MODE, region);
  const back = region ? { href: "/local", label: "Local games" } : undefined;
  const subtitle = region ? `Local · ${REGIONS[region].label}` : undefined;
  const [puzzle, setPuzzle] = useState<Top10Puzzle | null | undefined>(undefined);
  const [data, setData] = useState<Dataset | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  // The wrong guess whose reason is shown (the last one, or an earlier one the player tapped); n: shakes.
  const [miss, setMiss] = useState<{ id: string; n: number } | null>(null);
  // Whether that guess's toast is still up (it goes after a moment; the reason stays in the search).
  const [toast, setToast] = useState(false);

  useEffect(() => {
    loadGame<Top10Puzzle>(MODE, region).then(({ puzzle: p, data: d }) => {
      setData(d);
      setPuzzle(p);
      if (p) setProgress(loadProgress<Progress>(slot, p.date, p));
    });
  }, [region, slot]);

  const companies = useMemo(() => (data ? indexById(data.companies) : new Map<string, Company>()), [data]);

  if (puzzle === null) return <NoPuzzle back={back} />;
  if (puzzle === undefined || !data) return <GameSkeleton />;

  if (!progress) {
    return (
      <GameIntro
        mode={MODE}
        subtitle={subtitle}
        back={back}
        region={region}
        onStart={(d) => {
          saveDifficulty(d);
          const fresh: Progress = { difficulty: d, guesses: [], hintsUsed: 0, gaveUp: false };
          if (!region) recordStart(MODE, d);
          setProgress(fresh);
          saveProgress(slot, puzzle.date, fresh);
        }}
      />
    );
  }

  const round = atLevel(puzzle, progress.difficulty);
  const { found, wrong, done, score } = evaluate(round, progress);
  // Wrong guesses: they stay in the search, greyed out with their reason; and the one whose card is shown.
  const tried = new Map(
    progress.guesses
      .filter((id) => !round.companyIds.includes(id) && companies.has(id))
      .map((id) => [id, explainMiss(companies.get(id)!, round, data)?.text ?? "Not on this list"]),
  );
  const missed = miss ? companies.get(miss.id) : undefined;
  const missReason = missed ? explainMiss(missed, round, data) : null;

  function update(next: Progress) {
    setProgress(next);
    saveProgress(slot, puzzle!.date, next);
    const r = atLevel(puzzle!, next.difficulty);
    const result = evaluate(r, next);
    if (result.done && !getTodayResult(slot, puzzle!.date)) {
      saveResult(slot, { date: puzzle!.date, score: result.score, maxScore: MAX_SCORE, hintsUsed: next.hintsUsed, share: shareText(puzzle!, r, next, region) });
      // Today's player stats are the daily game's; a local game isn't counted in them.
      if (!region) recordFinish(MODE, next.difficulty, { bucket: result.found.length, score: result.score, maxScore: MAX_SCORE, won: result.found.length === 10 });
    }
  }

  // Hints (Pablo, 2026-11-02): each one about a random startup not found yet, softer first and
  // stronger later. Sectors all ten share (a sector list) aren't a clue, so they're left out.
  const hintCap = hintLimit(progress.difficulty, Infinity);
  const hintTexts = progress.hintTexts ?? [];
  const unfound = round.companyIds.filter((id) => !found.includes(id));
  function revealHint() {
    // A startup without a hint yet; only when every unfound one has had a hint, any unfound one again.
    const fresh = unfound.filter((x) => !(progress!.hintIds ?? []).includes(x));
    const id = pickRandom(fresh.length ? fresh : unfound);
    if (!id || hintTexts.length >= hintCap) return;
    const listed = round.companyIds.map((x) => companies.get(x)!);
    const shared = new Set(listed[0].sectors.filter((s) => listed.every((c) => c.sectors.includes(s))));
    const sharedPrograms = new Set((listed[0].programs ?? []).map((p) => p.programId).filter((pid) => listed.every((c) => c.programs?.some((p) => p.programId === pid))));
    // Facts already given for this startup (any case), so a second hint about it never repeats one.
    const prefix = `No. ${round.companyIds.indexOf(id) + 1}: `;
    const used = new Set(hintTexts.filter((t) => t.startsWith(prefix)).map((t) => t.slice(prefix.length).toLowerCase()));
    const fact = companyFact(companies.get(id)!, strengthOf(hintTexts.length, hintCap), { data: data!, hideSectors: shared, hidePrograms: sharedPrograms, hideCity: !!region, used });
    const texts = [...hintTexts, `No. ${round.companyIds.indexOf(id) + 1}: ${fact[0].toUpperCase()}${fact.slice(1)}`];
    update({ ...progress!, hintTexts: texts, hintIds: [...(progress!.hintIds ?? []), id], hintsUsed: texts.length });
  }

  function guess(c: Company) {
    const hit = round.companyIds.includes(c.id);
    setMiss(hit ? null : { id: c.id, n: (miss?.n ?? 0) + 1 });
    setToast(!hit);
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
    <OverviewProvider data={data}>
    <div className="space-y-3">
      <GameHeader title={TITLE} subtitle={subtitle} back={back} mode={MODE} difficulty={progress.difficulty} />
      <Announce
        text={
          missed && !done
            ? `${missed.name} is not on the list. ${missReason?.text ?? ""}`
            : `${found.length} of 10 found.`
        }
      />

      <div className="flex items-center gap-2 rounded-2xl bg-eu-blue px-3 py-2">
        <p className="min-w-0 flex-1 text-center font-display text-base font-bold leading-snug text-white">{round.title}</p>
        {/* A program's list ("CDTM startups in Munich"): its official logo, unmodified, on a white tile. */}
        {round.program?.logo && (
          <span className="flex h-11 shrink-0 items-center rounded-lg bg-white px-1 py-0.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={round.program.logo} alt={round.program.name} className="h-full w-auto max-w-20 object-contain" />
          </span>
        )}
      </div>

      {/* The rows share the screen height left over (about 24rem is taken by the rest), so the whole game fits without scrolling. svh (the height with the browser bars shown) instead of dvh: rows keep their opening size when the phone hides its address bar on scroll. */}
      <ol className="space-y-[3px]">
        {round.companyIds.map((id, i) => {
          const c = companies.get(id)!;
          const got = found.includes(id);
          const shown = got || done;
          return (
            <li
              key={id}
              style={{ height: `clamp(28px, calc((100svh - 392px) / 10), 44px)` }}
              className={`flex items-center gap-2.5 rounded-xl border px-2.5 ${
                got ? "animate-flip-in border-correct bg-correct/20" : shown ? "border-border bg-surface/40 opacity-60" : "border-muted/40 bg-surface"
              }`}
            >
              <span className="w-6 text-right font-display text-base font-bold text-primary">{i + 1}</span>
              {shown ? (
                <CompanyTap company={c} active={done} className="flex h-full min-w-0 flex-1 items-center gap-2.5">
                  <CompanyLogo company={c} size={24} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{c.name}</span>
                  <span className="shrink-0 text-sm tabular-nums text-muted">
                    {round.values?.[id] != null ? formatUsdAsEur(round.values[id]) : formatMetric(c, round.metric)}
                  </span>
                </CompanyTap>
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
          <div className="relative flex items-start gap-2">
            {missed && toast && (
              <MissToast
                key={`${missed.id}-${miss!.n}`}
                company={missed}
                icon={missReason?.icon ?? "rank"}
                text={missReason?.text ?? "Not in this top 10"}
                badge={missReason?.rank ? `No. ${missReason.rank}` : undefined}
                onDone={() => setToast(false)}
              />
            )}
            <div className={`min-w-0 flex-1 rounded-2xl ${nudgeClass(miss?.n)}`}>
              <CompanySearch
                companies={data.companies}
                exclude={new Set(found)}
                tried={tried}
                onTried={(c) => {
                  setMiss({ id: c.id, n: (miss?.n ?? 0) + 1 });
                  setToast(true);
                }}
                onType={() => setToast(false)}
                onPick={guess}
              />
            </div>
            <Hints
              compact
              available={hintCap > 0}
              revealed={hintTexts.map((text) => ({ text, cost: 0 }))}
              next={hintTexts.length < hintCap && unfound.length ? { text: "", cost: 0 } : undefined}
              onReveal={revealHint}
              total={hintCap}
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
            share={shareText(puzzle, round, progress, region)}
            stats={
              !region && <StatsPanel
                mode={MODE}
                bucket={found.length}
                score={score}
                maxScore={MAX_SCORE}
                order={Array.from({ length: 11 }, (_, i) => i)}
                label={(b) => String(b)}
                axis="Companies found"
                unit="found"
              />
            }
          />
          <BuiltInEuropeCard company={top} founders={topFounders} reason={topReason} />
        </div>
      )}
    </div>
    </OverviewProvider>
  );
}
