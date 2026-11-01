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
      "Name the ten companies in the list: type a startup, and if it's in the top 10 it lands on its rank. Every empty slot shows the flag of its country.",
      "Every company you find counts. A name that isn't in the list costs you points, and so do hints. Guess as often as you like.",
      "The list comes from our verified database, by last valuation or total raised. Easy lists are Europe or a big country, Medium adds other countries and big sectors, Hard adds smaller sectors and cities.",
      "Easy, Medium and Hard play the same. The level sets how big the list's scope is, and how many hints you get: all on Easy, half on Medium, none on Hard.",
    ],
  },
  {
    mode: "who-raised-this",
    title: "Who Raised This?",
    description: "Guess the startup behind a funding round. Every wrong guess reveals a new clue.",
    rules: [
      "A funding round is on the board: the amount and the stage. Guess which startup raised it.",
      "Every wrong guess unlocks the next clue: when it was announced, sector, founding year, HQ, investors, founders.",
      "Each wrong guess costs points, and so do hints. Guess as often as you like.",
      "Easy, Medium and Hard play the same. The level sets how well known the startups are, and how many hints you get: all on Easy, half on Medium, none on Hard.",
    ],
  },
  {
    mode: "unicorn-grid",
    title: "Unicorn Grid",
    description: "Name a startup for each square that fits its row and column. Lesser-known answers raise more.",
    rules: [
      "Fill each square with a startup that fits both its row and its column.",
      "Each company can be used only once.",
      "Lesser-known answers score more: an insider pick is worth up to five times a household name.",
      "A wrong guess costs points, and so do hints. Guess as often as you like.",
      "Easy, Medium and Hard play the same. The level sets how well known the startups are, how simple the categories are, and how many hints you get: all on Easy, half on Medium, none on Hard.",
    ],
  },
  {
    mode: "higher-lower",
    title: "Higher or Lower",
    description: "See one company's number, then say if the next one is higher or lower. One wrong call ends the run.",
    rules: [
      "You see one company's valuation or total raised. Is the next company's number higher or lower?",
      "Each right call scores. One wrong call ends the run, after at most 15 rounds.",
      "Neighbouring numbers are never close calls: at least 30% apart.",
      "Easy, Medium and Hard play the same. The level sets how well known the startups are, and how many hints you get: all on Easy, half on Medium, none on Hard.",
    ],
  },
  {
    mode: "impostor",
    title: "Impostor",
    description: "Six startups, one category. Find the one that doesn't belong.",
    rules: [
      "All but one of the startups share something: a country, a city, a sector, a founding period or unicorn status.",
      "Usually one doesn't belong, sometimes two or three: the prompt says how many. Find them all.",
      "Each wrong pick costs points, and so do hints. Pick as often as you like.",
      "Easy, Medium and Hard play the same. The level sets how well known the startups are, and how many hints you get: all on Easy, half on Medium, none on Hard.",
    ],
  },
];

export const MODE_INFO = Object.fromEntries(MODES.map((m) => [m.mode, m])) as Record<PlayMode, ModeInfo>;

/** The games on the home page, in order. Who Raised This? waits among the coming-soon games for now. */
export const LIVE_MODES: ModeInfo[] = (["top-10", "unicorn-grid", "higher-lower", "impostor"] as PlayMode[]).map((m) => MODE_INFO[m]);
