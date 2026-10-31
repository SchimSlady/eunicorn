import type { GameMode } from "@eunicorn/schema";

export interface ModeInfo {
  mode: GameMode;
  title: string;
  /** One line for the home card. */
  tagline: string;
  /** One or two sentences on the intro screen. */
  description: string;
}

export const MODES: ModeInfo[] = [
  {
    mode: "who-raised-this",
    title: "Who Raised This?",
    tagline: "Guess the startup from its round",
    description: "Guess the startup behind a funding round. Every wrong guess reveals a new clue.",
  },
  {
    mode: "unicorn-grid",
    title: "Unicorn Grid",
    tagline: "Fill the 3×3 grid",
    description: "Name a startup for each square that fits its row and column. Lesser-known answers raise more.",
  },
  {
    mode: "higher-lower",
    title: "Higher or Lower",
    tagline: "Higher or lower than the last?",
    description: "See one company's number, then say if the next one is higher or lower. One wrong call ends the run.",
  },
  {
    mode: "impostor",
    title: "Impostor",
    tagline: "Spot the odd one out",
    description: "Five startups, one category. Find the one that doesn't belong.",
  },
];

export const MODE_INFO = Object.fromEntries(MODES.map((m) => [m.mode, m])) as Record<GameMode, ModeInfo>;
