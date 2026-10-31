import type { GameMode } from "@eunicorn/schema";

export interface ModeInfo {
  mode: GameMode;
  title: string;
  /** One line for the home card. */
  tagline: string;
  /** One or two sentences on the intro screen. */
  description: string;
  /** "How to play" behind the ? in the game header: short lines, in order. */
  rules: string[];
}

/** Said for every mode, under its own rules. */
export const COMMON_RULES = [
  "One puzzle per game per day, new at midnight (Berlin time). Everyone gets the same one.",
  "Points are shown as money raised. Hints cost what their button says.",
];

export const MODES: ModeInfo[] = [
  {
    mode: "who-raised-this",
    title: "Who Raised This?",
    tagline: "Guess the startup from its round",
    description: "Guess the startup behind a funding round. Every wrong guess reveals a new clue.",
    rules: [
      "A funding round is on the board: the amount and the stage. Guess which startup raised it.",
      "Every wrong guess unlocks the next clue: when it was announced, sector, founding year, HQ, investors, founders.",
      "You start with €10m. Each wrong guess costs €1m.",
      "Easy: 3 clues up front, 8 guesses. Medium: 1 clue, 8 guesses. Hard: 1 clue, 4 guesses, no hints, no logos in the search.",
    ],
  },
  {
    mode: "unicorn-grid",
    title: "Unicorn Grid",
    tagline: "Fill the 3×3 grid",
    description: "Name a startup for each square that fits its row and column. Lesser-known answers raise more.",
    rules: [
      "Fill each square with a startup that fits both its row and its column.",
      "Each company can be used only once.",
      "Lesser-known answers raise more: a company is worth €1m to €5m, depending on how well known it is.",
      "Wrong guesses use up your guesses. Easy: 12 guesses. Medium: 9. Hard: 9, no hints, no logos in the search.",
    ],
  },
  {
    mode: "higher-lower",
    title: "Higher or Lower",
    tagline: "Higher or lower than the last?",
    description: "See one company's number, then say if the next one is higher or lower. One wrong call ends the run.",
    rules: [
      "You see one company's valuation or total raised. Is the next company's number higher or lower?",
      "Each right call raises €2m. One wrong call ends the run.",
      "The level sets how close the numbers are: Easy far apart (2× or more), Medium closer, Hard close calls and no hints.",
    ],
  },
  {
    mode: "impostor",
    title: "Impostor",
    tagline: "Spot the odd one out",
    description: "Five startups, one category. Find the one that doesn't belong.",
    rules: [
      "Five startups share something: a country, a city, a sector, a founding period or unicorn status. One doesn't.",
      "Find the impostor. You start with €10m; each wrong pick costs €4m.",
      "Easy: 3 tries. Medium: 2 tries. Hard: 1 try, no hints.",
    ],
  },
];

export const MODE_INFO = Object.fromEntries(MODES.map((m) => [m.mode, m])) as Record<GameMode, ModeInfo>;
