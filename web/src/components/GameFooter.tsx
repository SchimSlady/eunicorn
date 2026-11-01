"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ShareButton } from "./ShareButton";
import { Countdown } from "./Countdown";

/** Share + countdown to the next puzzle + back link, under every finished game. */
export function GameFooter({ share }: { share: string }) {
  return (
    <div className="space-y-4">
      <ShareButton text={share} />
      <Countdown />
      <Link href="/" className="flex items-center justify-center gap-1 text-sm font-medium text-primary">
        <ArrowLeft size={16} aria-hidden /> More games
      </Link>
    </div>
  );
}
