"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getTodayResult } from "@/lib/daily";
import { LIVE_MODES, MODE_INFO, type ModeInfo } from "@/lib/modes";
import { isRegion, localModes, localPath, slotOf } from "@/lib/regions";
import { ShareButton } from "./ShareButton";
import { Countdown } from "./Countdown";

/**
 * Share + countdown to the next puzzle, then straight on to the next live game not played today
 * (in home-page order after this one); "More games" once every game is done. After a Local game,
 * the next local game of the same region, then back to the Local tab.
 */
export function GameFooter({ share, score, maxScore }: { share: string; score?: number; maxScore?: number }) {
  const pathname = usePathname();
  // Read after mount: what's been played lives in this browser's storage.
  const [next, setNext] = useState<{ info: ModeInfo; href: string } | null>(null);
  const local = pathname.match(/^\/local\/([^/]+)\/([^/]+)/);
  const region = local && isRegion(local[1]) ? local[1] : undefined;

  useEffect(() => {
    if (region) {
      const other = localModes(region).find((m) => pathname !== localPath(region, m) && !getTodayResult(slotOf(m, region)));
      setNext(other ? { info: MODE_INFO[other], href: localPath(region, other) } : null);
      return;
    }
    const at = LIVE_MODES.findIndex((m) => pathname === `/play/${m.mode}`);
    const after = [...LIVE_MODES.slice(at + 1), ...LIVE_MODES.slice(0, Math.max(0, at))];
    const m = after.find((m) => !getTodayResult(m.mode));
    setNext(m ? { info: m, href: `/play/${m.mode}` } : null);
  }, [pathname, region]);

  return (
    <div className="space-y-4">
      <ShareButton text={share} score={score} maxScore={maxScore} />
      <Countdown />
      {next ? (
        <Link
          href={next.href}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-border px-4 font-semibold hover:border-primary"
        >
          Next: {next.info.title} <ArrowRight size={18} aria-hidden />
        </Link>
      ) : (
        <Link href={region ? "/local" : "/"} className="flex items-center justify-center gap-1 text-sm font-medium text-primary">
          <ArrowLeft size={16} aria-hidden /> {region ? "More local games" : "More games"}
        </Link>
      )}
    </div>
  );
}
