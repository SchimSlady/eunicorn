import type { PlayMode } from "@/lib/top10";

import type { Difficulty } from "./difficulty";

/**
 * Client side of the anonymous play counter (/api/plays). Fire-and-forget: a failed request
 * never affects the game. The last finish is kept as a promise so the stats panel can wait
 * for it and include the player's own result.
 */

export interface PlayStats {
  starts: number;
  finishes: number;
  solved: number;
  buckets: Record<string, number>;
  scores: Record<string, number>;
}

let lastFinish: Promise<unknown> = Promise.resolve();

function send(body: object): Promise<unknown> {
  return fetch("/api/plays", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => null);
}

export function recordStart(mode: PlayMode, difficulty: Difficulty): void {
  void send({ mode, difficulty, event: "start" });
}

/** bucket: guess number / rounds right / squares filled, 0 = missed. */
export function recordFinish(
  mode: PlayMode,
  difficulty: Difficulty,
  result: { bucket: number; score: number; maxScore: number; won: boolean },
): void {
  lastFinish = send({
    mode,
    difficulty,
    event: "finish",
    bucket: result.bucket,
    scorePct: result.maxScore ? (result.score / result.maxScore) * 100 : 0,
    won: result.won,
  });
}

export async function loadStats(mode: PlayMode): Promise<PlayStats | null> {
  await lastFinish;
  const res = await fetch(`/api/plays?mode=${mode}`, { cache: "no-store" }).catch(() => null);
  return res?.status === 200 ? ((await res.json()) as PlayStats) : null;
}
