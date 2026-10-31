import type { GameMode } from "@eunicorn/schema";

export interface ModeInfo {
  mode: GameMode;
  title: string;
  /** One line for the home card. */
  tagline: string;
  /** Intro screen: what the game is. */
  description: string;
  /** Intro screen: how it works, one rule per line. */
  howTo: string[];
  /** Not playable yet: shown as "Coming soon" on the home page. */
  comingSoon?: boolean;
}

export const MODES: ModeInfo[] = [
  {
    mode: "who-raised-this",
    title: "Who Raised This?",
    tagline: "Guess the startup from its funding round",
    description: "A European startup raised a round. You get the amount first, then more clues. Name the company.",
    howTo: [
      "Every wrong guess reveals the next clue: date, sector, city, lead investor, founders, logo.",
      "Fewer guesses, more € raised.",
      "Stuck? Hints cost a little, but keep you in the game.",
    ],
  },
  {
    mode: "unicorn-grid",
    title: "Unicorn Grid",
    tagline: "Fill the 3×3 grid with European startups",
    description: "Each square needs a startup that matches both its row and its column, like Germany × AI.",
    howTo: [
      "Tap a square, then name a startup that matches its row and column.",
      "Lesser-known answers raise more: up to €5M per square.",
      "Every company only once. Wrong guesses cost a guess.",
    ],
  },
  {
    mode: "higher-lower",
    title: "Higher or Lower",
    tagline: "Pick the bigger one, then face the next",
    description: "Two startups, one question: which is valued higher? The one you pick stays on and faces the next challenger.",
    howTo: [
      "Five rounds, same chain of companies for everyone.",
      "Pick wrong and your pick still stays on, so choose carefully.",
      "Every right answer raises €2M.",
    ],
  },
  {
    mode: "impostor",
    title: "Impostor",
    tagline: "Spot the one that doesn't belong",
    description: "Five startups and a category, like \"European unicorns\". One of them is an impostor. Find it.",
    howTo: [
      "Tap the company that doesn't fit.",
      "Each wrong pick costs €4M.",
      "Afterwards you learn why it didn't belong.",
    ],
  },
];

export const MODE_INFO = Object.fromEntries(MODES.map((m) => [m.mode, m])) as Record<GameMode, ModeInfo>;
