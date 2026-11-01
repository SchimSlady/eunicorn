"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getTodayResult } from "@/lib/daily";
import { LIVE_MODES, type ModeInfo } from "@/lib/modes";
import { ShareButton } from "./ShareButton";
import { Countdown } from "./Countdown";

/**
 * Share + countdown to the next puzzle, then straight on to the next live game not played today
 * (in home-page order after this one); "More games" once every game is done.
 */
export function GameFooter({ share, score, maxScore }: { share: string; score?: number; maxScore?: number }) {
  const pathname = usePathname();
  // Read after mount: what's been played lives in this browser's storage.
  const [next, setNext] = useState<ModeInfo | null>(null);

  useEffect(() => {
    const at = LIVE_MODES.findIndex((m) => pathname === `/play/${m.mode}`);
    const after = [...LIVE_MODES.slice(at + 1), ...LIVE_MODES.slice(0, Math.max(0, at))];
    setNext(after.find((m) => !getTodayResult(m.mode)) ?? null);
  }, [pathname]);

  return (
    <div className="space-y-4">
      <ShareButton text={share} score={score} maxScore={maxScore} />
      <Countdown />
      {next ? (
        <Link
          href={`/play/${next.mode}`}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-border px-4 font-semibold hover:border-primary"
        >
          Next: {next.title} <ArrowRight size={18} aria-hidden />
        </Link>
      ) : (
        <Link href="/" className="flex items-center justify-center gap-1 text-sm font-medium text-primary">
          <ArrowLeft size={16} aria-hidden /> More games
        </Link>
      )}
    </div>
  );
}
