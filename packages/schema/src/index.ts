/**
 * EUnicorn shared data contract.
 *
 * This file is the boundary between /data (produces JSON) and /web (consumes JSON).
 * Change it only via a PR that both of you review.
 */

export type ISODate = string; // "2026-11-01"
export type CountryCode = string; // ISO 3166-1 alpha-2, e.g. "DE", "GB"

export type Sector =
  | "fintech"
  | "ai"
  | "mobility"
  | "climate"
  | "health"
  | "defense"
  | "consumer"
  | "saas"
  | "gaming"
  | "travel"
  | "crypto"
  | "quick-commerce"
  | "space"
  | "quantum"
  | "semiconductors"
  | "robotics"
  | "cybersecurity"
  | "biotech"
  | "edtech"
  | "proptech"
  | "telecom"
  | "hrtech"
  | "legaltech"
  | "foodtech"
  | "logistics"
  | "ecommerce"
  | "devtools";

export type CompanyStatus = "private" | "public" | "acquired" | "defunct";

export type RoundStage =
  | "pre-seed"
  | "seed"
  | "series-a"
  | "series-b"
  | "series-c"
  | "series-d"
  | "series-e"
  | "series-f+"
  | "growth"
  | "secondary"
  | "ipo";

export interface Person {
  id: string; // kebab-case slug, e.g. "nik-storonsky"
  name: string;
}

export interface Investor {
  id: string; // kebab-case slug, e.g. "index-ventures"
  name: string;
  domain?: string;
  /** How well known: 1 = top 10 VCs, 2 = ~50 famous, 3 = next ~200, 4 = the rest. Clue only tiers 1–2 (3 on hard days). */
  tier?: 1 | 2 | 3 | 4;
}

export interface Round {
  id: string; // "<company-id>-<stage>-<year>", e.g. "mistral-ai-series-a-2023"
  companyId: string;
  stage: RoundStage;
  date: ISODate; // first-of-month is fine when the day is unknown: "2023-12-01"
  amountUsd: number;
  /** As announced, if not USD. */
  amountOriginal?: { value: number; currency: "EUR" | "GBP" | "SEK" | "CHF" };
  postMoneyValuationUsd?: number;
  leadInvestorIds: string[];
  investorIds: string[];
  sources: string[]; // URLs
  verified: boolean;
}

export interface Company {
  id: string; // kebab-case slug, e.g. "revolut"
  name: string;
  domain: string; // used to resolve the logo
  /** Path under /web/public/logos, e.g. "/logos/revolut.svg". Absent until the logo is curated. */
  logo?: string;
  european: boolean; // EU + UK + EEA + CH. false = only used as an impostor
  country: CountryCode;
  city: string;
  founded: number;
  sectors: Sector[];
  status: CompanyStatus;
  /** Ever valued at >= $1B */
  unicorn: boolean;
  founderIds: string[];
  totalRaisedUsd?: number;
  lastValuationUsd?: number;
  employees?: number;
  careersUrl?: string;
  /** One-liner for the "Built in Europe" end card. */
  funFact?: string;
  /** 1 = everyone knows it, 5 = insider. Drives the Mon→Sun difficulty curve. */
  difficulty: 1 | 2 | 3 | 4 | 5;
  verified: boolean;
}

export interface Dataset {
  companies: Company[];
  rounds: Round[];
  investors: Investor[];
  people: Person[];
}

/* ---------- Puzzles: one file per mode per day: data/puzzles/<date>/<mode>.json ---------- */

export type GameMode = "who-raised-this" | "unicorn-grid" | "higher-lower" | "impostor";

/**
 * Hints let a stuck player keep going instead of giving up (unlike Futbol11).
 * Each hint costs points; the share card shows hints used as 💡.
 * Hints are revealed in array order.
 */
export interface Hint {
  text: string; // e.g. "Starts with an M", "Founded by ex-Google DeepMind researchers"
  cost: number; // points deducted
}

interface PuzzleBase<M extends GameMode> {
  mode: M;
  date: ISODate;
  /** Sequential puzzle number for share text: "EUnicorn #12". */
  number: number;
  /** Puzzle-level hints. Unicorn Grid additionally has per-cell hints. */
  hints: Hint[];
}

/** Clues revealed one by one; the player guesses a company after each. */
export interface WhoRaisedThisPuzzle extends PuzzleBase<"who-raised-this"> {
  answerCompanyId: string;
  roundId: string;
  clues: Array<
    | { kind: "amount"; text: string }
    | { kind: "year"; text: string }
    | { kind: "city"; text: string }
    | { kind: "sector"; text: string }
    | { kind: "lead-investor"; text: string }
    | { kind: "investors"; text: string }
    | { kind: "founders"; text: string }
    | { kind: "logo-blurred"; text: string }
  >;
}

export type GridCriterion =
  | { kind: "country"; value: CountryCode; label: string }
  | { kind: "city"; value: string; label: string }
  | { kind: "sector"; value: Sector; label: string }
  | { kind: "unicorn"; value: true; label: string }
  | { kind: "status"; value: CompanyStatus; label: string }
  | { kind: "founded-after"; value: number; label: string }
  | { kind: "founded-before"; value: number; label: string }
  | { kind: "investor"; value: string; label: string }; // investor id

/** 3x3: cell (r, c) must match rows[r] AND cols[c]. */
export interface UnicornGridPuzzle extends PuzzleBase<"unicorn-grid"> {
  rows: [GridCriterion, GridCriterion, GridCriterion];
  cols: [GridCriterion, GridCriterion, GridCriterion];
  /** Precomputed valid company ids per cell, row-major (9 entries). Each must have >= 1. */
  validAnswers: string[][];
  /** Row-major (9 entries): hints for each cell, e.g. "One answer starts with K", then 3 logos to pick from. */
  cellHints: Hint[][];
}

export type HigherLowerMetric = "totalRaisedUsd" | "lastValuationUsd" | "founded" | "employees";

/**
 * A chain: companyIds[0] vs companyIds[1]; the company the player picks stays on and
 * faces the next one in the list. N companies = N-1 rounds. Right answer = higher metric
 * value (ties count either way), computed from the dataset, so every company needs the metric.
 */
export interface HigherLowerPuzzle extends PuzzleBase<"higher-lower"> {
  metric: HigherLowerMetric;
  companyIds: string[];
}

export interface ImpostorPuzzle extends PuzzleBase<"impostor"> {
  /** Shown to the player, e.g. "All of these are European unicorns". */
  prompt: string;
  companyIds: string[]; // 5, shuffled
  impostorId: string;
  explanation: string; // shown after the guess
}

export type Puzzle = WhoRaisedThisPuzzle | UnicornGridPuzzle | HigherLowerPuzzle | ImpostorPuzzle;
