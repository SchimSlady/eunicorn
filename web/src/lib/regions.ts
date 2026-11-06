import type { Company } from "@eunicorn/schema";
import type { PlayMode } from "./top10";

/**
 * The Local tab: the same daily games, but only with startups from one place, for players who
 * know their own scene best. Kept apart from the daily games on purpose: those stay one puzzle
 * for everyone (one number, one streak, one set of stats); a local game has its own once-a-day
 * lock per region and doesn't count towards the streak or today's player stats.
 */
export type Region = "munich" | "berlin" | "germany";

/** Towns around Munich that people count as the Munich scene (the TUM campus in Garching, the labs in Weßling ...). */
const MUNICH_AREA = new Set(["Munich", "Garching", "Weßling", "Unterföhring", "Ismaning", "Ottobrunn", "Martinsried", "Planegg", "Oberhaching", "Unterschleißheim", "Taufkirchen", "Gräfelfing"]);

const inCity = (city: string) => (kind?: string) => `${kind ? `${kind} ` : ""}startups in ${city}`;

export const REGIONS: Record<
  Region,
  {
    label: string;
    /** "startups in Munich", "AI startups in Munich", "German AI startups" */
    who: (kind?: string) => string;
    /** Round flag on the region button: Bavaria's lozenges for Munich, Berlin's bear, Germany's flag (public/regions, public/flags). */
    flag: string;
    test: (c: Company) => boolean;
  }
> = {
  munich: { label: "Munich", who: inCity("Munich"), flag: "/regions/bavaria.svg", test: (c) => c.country === "DE" && MUNICH_AREA.has(c.city) },
  berlin: { label: "Berlin", who: inCity("Berlin"), flag: "/regions/berlin.svg", test: (c) => c.country === "DE" && c.city === "Berlin" },
  germany: { label: "Germany", who: (kind) => `German ${kind ? `${kind} ` : ""}startups`, flag: "/flags/de.svg", test: (c) => c.country === "DE" },
};

export const REGION_IDS = Object.keys(REGIONS) as Region[];

export function isRegion(r: unknown): r is Region {
  return typeof r === "string" && r in REGIONS;
}

/** The games the Local tab offers: the two that work on a small pool of companies. */
export const LOCAL_MODES: PlayMode[] = ["top-10", "higher-lower"];

/**
 * Where a game's progress and result live on the device: the mode for the daily game,
 * mode + region for a local one, so each region can be played once a day on its own.
 */
export type Slot = PlayMode | `${PlayMode}@${Region}`;

export function slotOf(mode: PlayMode, region?: Region): Slot {
  return region ? `${mode}@${region}` : mode;
}

export function localPath(region: Region, mode: PlayMode): string {
  return `/local/${region}/${mode}`;
}

const KEY = "eunicorn:region";

/** The region last chosen on this device; Munich until one is chosen. */
export function loadRegion(): Region {
  try {
    const r = localStorage.getItem(KEY);
    return isRegion(r) ? r : "munich";
  } catch {
    return "munich";
  }
}

export function saveRegion(r: Region): void {
  try {
    localStorage.setItem(KEY, r);
  } catch {
    // Storage blocked; the choice just won't be remembered.
  }
}
