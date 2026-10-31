"use client";

import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { DAILY_LOCK } from "@/lib/daily";
import { ShareButton } from "./ShareButton";
import { Countdown } from "./Countdown";

/** Share + countdown (or "Play again" while the daily lock is off) + back link, under every finished game. */
export function GameFooter({ share }: { share: string }) {
  return (
    <div className="space-y-4">
      <ShareButton text={share} />
      {DAILY_LOCK ? (
        <Countdown />
      ) : (
        // With the lock off nothing is restored on load, so a reload starts the game fresh.
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary px-4 py-3 font-semibold text-primary transition active:scale-[0.98]"
        >
          <RotateCcw size={18} aria-hidden /> Play again
        </button>
      )}
      <Link href="/" className="flex items-center justify-center gap-1 text-sm font-medium text-primary">
        <ArrowLeft size={16} aria-hidden /> More games
      </Link>
    </div>
  );
}
