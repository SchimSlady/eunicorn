import type { PlayMode } from "@/lib/top10";

import type { Difficulty } from "./difficulty";

/**
 * Client side of the optional daily leaderboard (/api/leaderboard). A random id and the chosen
 * name are kept in this browser; nothing is sent unless the player adds themselves to the board.
 */

export interface BoardEntry {
  rank: number;
  name: string;
  scorePct: number;
  hints: number;
}

export interface Board {
  total: number;
  top: BoardEntry[];
  you: BoardEntry | null;
}

const DEVICE_KEY = "eunicorn:device";
const NAME_KEY = "eunicorn:name";

/** A random id for this browser, made up on first use: it only lets one device hold one entry per game and day. */
function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID(); // storage blocked: works for this visit only
  }
}

export function savedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export async function loadBoard(mode: PlayMode, difficulty: Difficulty): Promise<Board | null> {
  const res = await fetch(`/api/leaderboard?mode=${mode}&difficulty=${difficulty}&device=${deviceId()}`, { cache: "no-store" }).catch(() => null);
  return res?.status === 200 ? ((await res.json()) as Board) : null;
}

/** "name": rejected as a name; "duplicate": this device is already on today's board. */
export async function joinBoard(opts: {
  mode: PlayMode;
  difficulty: Difficulty;
  name: string;
  scorePct: number;
  hints: number;
}): Promise<"ok" | "name" | "duplicate" | "error"> {
  const res = await fetch("/api/leaderboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...opts, device: deviceId() }),
  }).catch(() => null);
  if (res?.status === 204) {
    try {
      localStorage.setItem(NAME_KEY, opts.name.trim());
    } catch {
      // Storage blocked; the name just isn't remembered.
    }
    return "ok";
  }
  return res?.status === 422 ? "name" : res?.status === 409 ? "duplicate" : "error";
}
