"use client";

import { useEffect, useRef } from "react";
import {
  Banknote,
  BadgeCheck,
  CalendarDays,
  GraduationCap,
  Grid3x3,
  Handshake,
  MapPin,
  Sparkles,
  Tag,
  TrendingDown,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Company } from "@eunicorn/schema";
import { CompanyLogo } from "./CompanyLogo";

/** What a wrong guess's reason is about; picks the icon in front of it. */
export type MissIcon = "place" | "sector" | "founded" | "status" | "program" | "money" | "rank" | "unicorn" | "investor" | "taken";

const ICON: Record<MissIcon, LucideIcon> = {
  place: MapPin,
  sector: Tag,
  founded: CalendarDays,
  status: BadgeCheck,
  program: GraduationCap,
  money: Banknote,
  rank: TrendingDown,
  unicorn: Sparkles,
  investor: Handshake,
  taken: Grid3x3,
};

/** How long a toast stays (the `toast` animation in globals.css runs exactly as long). */
const SHOW_MS = 2600;

/**
 * Why a guess was wrong, for a moment: a pill that floats just above the search field, over the
 * board, so nothing moves. The logo carries a red ✗ badge, the reason an icon. It goes by itself
 * after ~2.5 s, when the player types, or on a tap. Place it inside a `relative` wrapper around the
 * search row; key it by the guess so a new wrong guess restarts it.
 */
export function MissToast({
  company,
  icon,
  text,
  badge,
  onDone,
}: {
  company: Company;
  icon: MissIcon;
  text: string;
  /** A short tag after the name, e.g. "No. 13". */
  badge?: string;
  onDone: () => void;
}) {
  // The latest onDone, so a re-render of the game doesn't restart the timer.
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => done.current(), SHOW_MS);
    return () => clearTimeout(t);
  }, []);
  const Icon = ICON[icon];

  return (
    // A floating overlay, so it may cast a shadow. taste-skill-ignore
    // Corners concentric with the logo tile: its radius (22% of 34px ≈ 7.5px) plus the 6px padding.
    <button
      type="button"
      onClick={onDone}
      aria-hidden // the page's live region (Announce) reads the same reason out
      tabIndex={-1}
      className="absolute inset-x-0 bottom-full z-20 mb-2 flex animate-toast items-center gap-2.5 rounded-[14px] border border-wrong/50 bg-surface p-1.5 pr-4 text-left shadow-lg shadow-black/40"
    >
      <span className="relative shrink-0">
        <CompanyLogo company={company} size={34} />
        <span className="absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-wrong text-white ring-2 ring-surface">
          <X size={11} strokeWidth={3.5} />
        </span>
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="flex items-baseline gap-1.5">
          <span className="truncate text-sm font-bold">{company.name}</span>
          {badge && <span className="shrink-0 rounded-full bg-wrong/20 px-1.5 text-xs font-bold text-wrong">{badge}</span>}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-[13px] text-muted">
          <Icon size={13} className="shrink-0" />
          <span className="line-clamp-2">{text}</span>
        </span>
      </span>
    </button>
  );
}
