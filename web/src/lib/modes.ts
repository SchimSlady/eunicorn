import type { PlayMode } from "@/lib/top10";

export interface ModeInfo {
  mode: PlayMode;
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
  "Your score is a valuation from €0 to €1bn: a perfect game makes you a unicorn. Hints cost what their button says.",
];

/** Every mode the web app can run (Who Raised This? is parked but its page still works). */
export const MODES: ModeInfo[] = [
  {
    mode: "top-10",
    title: "Top 10",
    tagline: "Name the ten biggest",
    description: "Name the ten biggest startups in a list, by valuation or money raised. Every wrong name costs a life.",
    rules: [
      "Name the ten companies in the list: type a startup, and if it's in the top 10 it lands on its rank.",
      "Each company found adds €100m of valuation. A name that isn't in the list costs a life.",
      "Easy: all of Europe or a big country, 5 lives. Medium: another country or a big sector, 3 lives. Hard: a smaller sector or a city, 3 lives, no hints.",
      "The list comes from our verified database, by last valuation or total raised.",
    ],
  },
  {
    mode: "who-raised-this",
    title: "Who Raised This?",
    tagline: "Guess the startup from its round",
    description: "Guess the startup behind a funding round. Every wrong guess reveals a new clue.",
    rules: [
      "A funding round is on the board: the amount and the stage. Guess which startup raised it.",
      "Every wrong guess unlocks the next clue: when it was announced, sector, founding year, HQ, investors, founders.",
      "You start at a €1bn valuation. Each wrong guess costs €100m.",
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
      "Lesser-known answers add more valuation: an insider pick is worth up to five times a household name.",
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
      "Each right call adds the same share of €1bn. One wrong call ends the run.",
      "The level sets how close the numbers are: Easy far apart (2× or more), Medium closer, Hard close calls and no hints.",
    ],
  },
  {
    mode: "impostor",
    title: "Impostor",
    tagline: "Spot the odd one out",
    description: "Five startups, one category. Find the one that doesn't belong.",
    rules: [
      "All but one of the startups share something: a country, a city, a sector, a founding period or unicorn status.",
      "Find the impostor. You start at a €1bn valuation; each wrong pick costs €400m.",
      "Easy: 5 companies, the category is shown, 3 tries. Medium: 6 companies, find the pattern yourself (the first hint gives it away), 2 tries. Hard: 8 companies, hidden pattern, a sneakier impostor, 1 try, no hints.",
    ],
  },
];

export const MODE_INFO = Object.fromEntries(MODES.map((m) => [m.mode, m])) as Record<PlayMode, ModeInfo>;

/** The games on the home page, in order. Who Raised This? waits among the coming-soon games for now. */
export const LIVE_MODES: ModeInfo[] = (["top-10", "unicorn-grid", "higher-lower", "impostor"] as PlayMode[]).map((m) => MODE_INFO[m]);
