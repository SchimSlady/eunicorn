"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleCheck } from "lucide-react";

import { getTodayResult, todayKey } from "@/lib/daily";
import { MODE_INFO } from "@/lib/modes";
import { LOCAL_MODES, REGIONS, REGION_IDS, loadRegion, localPath, saveRegion, slotOf, type Region } from "@/lib/regions";
import type { PlayMode } from "@/lib/top10";
import { ModePreview } from "./ModePreview";

/** The Local tab: pick a region, then one card per local game, with ✓ Played once that region's game is done today. */
export function LocalCards() {
  // Munich on the server and the first paint; the device's last choice right after.
  const [region, setRegion] = useState<Region>("munich");
  const [played, setPlayed] = useState<Set<PlayMode>>(new Set());

  useEffect(() => setRegion(loadRegion()), []);
  useEffect(() => {
    const day = todayKey();
    setPlayed(new Set(LOCAL_MODES.filter((m) => getTodayResult(slotOf(m, region), day))));
  }, [region]);

  function choose(r: Region) {
    setRegion(r);
    saveRegion(r);
  }

  return (
    <div className="space-y-5">
      <div role="radiogroup" aria-label="Region" className="flex flex-wrap gap-2">
        {REGION_IDS.map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={r === region}
            onClick={() => choose(r)}
            className={`min-h-11 rounded-full border px-5 font-semibold transition ${
              r === region ? "border-primary bg-primary text-on-primary" : "border-border bg-surface hover:border-primary"
            }`}
          >
            {REGIONS[r].label}
          </button>
        ))}
      </div>

      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {LOCAL_MODES.map((mode) => (
          <li key={mode}>
            <Link
              href={localPath(region, mode)}
              className="block h-full overflow-hidden rounded-2xl border border-border bg-surface transition hover:-translate-y-0.5 hover:border-primary"
            >
              <div className="relative">
                <ModePreview mode={mode} />
                {played.has(mode) && (
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-correct">
                    <CircleCheck size={14} aria-hidden /> Played
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="font-display text-lg font-bold leading-tight">{MODE_INFO[mode].title}</p>
                <p className="mt-0.5 text-sm text-muted">{REGIONS[region].label}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
