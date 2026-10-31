import type { GameMode } from "@eunicorn/schema";
import type { Difficulty } from "./difficulty";

export interface ModeInfo {
  mode: GameMode;
  title: string;
  /** One line for the home card. */
  tagline: string;
  /** One or two sentences on the intro screen. */
  description: string;
  /** What each level changes, one line, shown under the level picker. */
  levels: Record<Difficulty, string>;
}

export const MODES: ModeInfo[] = [
  {
    mode: "who-raised-this",
    title: "Who Raised This?",
    tagline: "Guess the startup from its round",
    description: "Guess the startup behind a funding round. Every wrong guess reveals a new clue.",
    levels: {
      easy: "3 clues up front, 8 guesses, hints on.",
      medium: "1 clue up front, 8 guesses, hints on.",
      hard: "1 clue up front, 4 guesses, no hints, no logos in the search.",
    },
  },
  {
    mode: "unicorn-grid",
    title: "Unicorn Grid",
    tagline: "Fill the 3×3 grid",
    description: "Name a startup for each square that fits its row and column. Lesser-known answers raise more.",
    levels: {
      easy: "12 guesses, hints on.",
      medium: "9 guesses, hints on.",
      hard: "9 guesses, no hints, no logos in the search.",
    },
  },
  {
    mode: "higher-lower",
    title: "Higher or Lower",
    tagline: "Higher or lower than the last?",
    description: "See one company's number, then say if the next one is higher or lower. One wrong call ends the run.",
    levels: {
      easy: "Values far apart (at least 2×), hints on.",
      medium: "Values closer together (1.3× to 2×), hints on.",
      hard: "Close calls (under 1.3×), no hints.",
    },
  },
  {
    mode: "impostor",
    title: "Impostor",
    tagline: "Spot the odd one out",
    description: "Five startups, one category. Find the one that doesn't belong.",
    levels: {
      easy: "3 tries, hints on.",
      medium: "2 tries, hints on.",
      hard: "1 try, no hints.",
    },
  },
];

export const MODE_INFO = Object.fromEntries(MODES.map((m) => [m.mode, m])) as Record<GameMode, ModeInfo>;
