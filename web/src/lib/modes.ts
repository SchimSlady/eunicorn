import type { PlayMode } from "@/lib/top10";

export interface ModeInfo {
  mode: PlayMode;
  title: string;
  /** One or two sentences on the intro screen. */
  description: string;
  /** "How to play" behind the ? in the game header: short lines, in order. */
  rules: string[];
}

/** Every mode the web app can run (Who Raised This? is parked but its page still works). */
export const MODES: ModeInfo[] = [
  {
    mode: "top-10",
    title: "Top 10",
    description: "Name the ten biggest startups in a list, by valuation or money raised.",
    rules: [
      "Name the ten startups in today's list, for example the ten most valuable in Germany.",
      "Type a startup: if it's in the list, it lands on its rank. Each empty slot shows its country's flag.",
      "Wrong names cost points. Find as many as you can, or tap Show the list to see the rest.",
    ],
  },
  {
    mode: "who-raised-this",
    title: "Who Raised This?",
    description: "Guess the startup behind a funding round. Every wrong guess reveals a new clue.",
    rules: [
      "A funding round is on the board: the amount and the stage. Guess which startup raised it.",
      "Every wrong guess reveals a new clue: when, sector, founding year, HQ, investors, founders.",
      "The fewer guesses you need, the more points you score.",
    ],
  },
  {
    mode: "unicorn-grid",
    title: "Unicorn Grid",
    description: "Name a startup for each square that fits its row and column.",
    rules: [
      "Fill each square with a startup that fits both its row and its column.",
      "Each startup can be used only once, and lesser-known answers score more.",
      "Wrong guesses cost points. Fill as many squares as you can.",
    ],
  },
  {
    mode: "higher-lower",
    title: "Higher or Lower",
    description: "See one company's number, then say if the next one is higher or lower. One wrong call ends the run.",
    rules: [
      "You see one startup's number: valuation, money raised, biggest round or founding year.",
      "Is the next startup's number higher or lower? Every right call scores.",
      "One wrong call ends the run, after at most 15 rounds.",
    ],
  },
  {
    mode: "impostor",
    title: "Impostor",
    description: "Six startups, one category. Find the ones that don't belong.",
    rules: [
      "Most of the startups share something: a country, a city, a sector, a founding period or unicorn status.",
      "Find the ones that don't belong: usually one, sometimes two or three.",
      "Wrong picks cost points. The game ends once you've found them all.",
    ],
  },
];

export const MODE_INFO = Object.fromEntries(MODES.map((m) => [m.mode, m])) as Record<PlayMode, ModeInfo>;

/** The games on the home page, in order. Who Raised This? waits among the coming-soon games for now. */
export const LIVE_MODES: ModeInfo[] = (["top-10", "unicorn-grid", "higher-lower", "impostor"] as PlayMode[]).map((m) => MODE_INFO[m]);
