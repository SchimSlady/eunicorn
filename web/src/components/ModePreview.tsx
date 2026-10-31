"use client";

import { useEffect, useRef, useState } from "react";
import { Banknote, CalendarDays, ChevronDown, ChevronUp, Lock, MapPin, VenetianMask } from "lucide-react";
import type { GameMode } from "@eunicorn/schema";
import { Flag } from "./Flag";

/** Illustrations are drawn on a fixed canvas and scaled to whatever width the card has. */
const CANVAS_W = 240;
const CANVAS_H = 180;

/**
 * Small illustration of how each mode plays, for the home cards and intro screens.
 * Decorative only: hidden from screen readers, the card text says what the mode is.
 */
export function ModePreview({ mode }: { mode: GameMode }) {
  const Preview = PREVIEWS[mode];
  const ref = useRef<HTMLDivElement>(null);
  // null until measured, so the unscaled canvas never flashes on first paint.
  const [scale, setScale] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / CANVAS_W));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden className="relative aspect-[4/3] overflow-hidden bg-eu-blue text-white">
      <div
        className="absolute left-0 top-0 flex origin-top-left items-center justify-center p-3"
        style={{ width: CANVAS_W, height: CANVAS_H, transform: `scale(${scale ?? 1})`, opacity: scale === null ? 0 : 1 }}
      >
        <Preview />
      </div>
    </div>
  );
}

/** A company logo on the usual white tile (logos are shown unchanged, see About & data). */
function Tile({ logo, size = 28, className = "" }: { logo: string; size?: number; className?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-[22%] bg-white ${className}`}
      style={{ width: size, height: size, padding: Math.round(size * 0.12) }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/logos/${logo}`} alt="" className="h-full w-full object-contain" />
    </span>
  );
}

function WhoRaisedThisPreview() {
  const clues = [
    { Icon: Banknote, text: "Raised €385m" },
    { Icon: CalendarDays, text: "December 2023" },
    { Icon: MapPin, text: "Paris" },
  ];
  return (
    <div className="w-full max-w-[220px] space-y-1 text-[12px]">
      {clues.map(({ Icon, text }) => (
        <div key={text} className="flex items-center gap-2 rounded-md bg-white/10 px-2 py-1.5">
          <Icon size={13} className="text-eu-yellow" />
          <span className="font-medium">{text}</span>
        </div>
      ))}
      <div className="flex items-center gap-2 rounded-md border border-dashed border-white/25 px-2 py-1.5 text-white/50">
        <Lock size={12} /> Next clue
      </div>
      <div className="mt-2 rounded-md bg-white px-2 py-1.5 font-medium text-eu-blue/60">Mistr…</div>
    </div>
  );
}

function UnicornGridPreview() {
  const cols = ["DE", "GB", "FR"];
  const rows = ["Fintech", "AI", "2015+"];
  const filled: Record<string, string> = {
    "0-0": "n26.svg",
    "0-1": "revolut.svg",
    "1-0": "deepl.svg",
    "1-2": "mistral-ai.svg",
    "2-1": "elevenlabs.svg",
  };
  return (
    <div className="grid grid-cols-4 gap-1 text-[11px]">
      <span className="flex h-7 w-12 items-center justify-center font-display font-bold text-eu-yellow">EU</span>
      {cols.map((c) => (
        <span key={c} className="flex h-7 w-12 items-center justify-center rounded-md bg-white/10">
          <Flag country={c} size={18} />
        </span>
      ))}
      {rows.map((r, ri) => (
        <div key={r} className="contents">
          <span className="flex h-10 w-12 items-center justify-center rounded-md bg-white/10 text-center font-semibold">{r}</span>
          {cols.map((_, ci) => {
            const logo = filled[`${ri}-${ci}`];
            return (
              <span key={ci} className="flex h-10 w-12 items-center justify-center rounded-md border border-white/15">
                {logo && <Tile logo={logo} size={34} />}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function HigherLowerPreview() {
  return (
    <div className="w-full max-w-[220px] text-[12px]">
      <div className="flex items-center gap-2 rounded-lg border-2 border-white/80 bg-white/10 p-2">
        <Tile logo="n26.svg" size={32} />
        <span className="flex-1">
          <span className="block text-[11px] text-white/70">Your pick</span>
          <span className="font-semibold">N26</span>
        </span>
        <span className="font-display text-sm font-bold">€7.7bn</span>
      </div>
      <div className="flex items-center justify-center gap-3 py-1.5 text-eu-yellow">
        <ChevronUp size={18} />
        <span className="text-[11px] font-semibold text-white/70">vs</span>
        <ChevronDown size={18} />
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-white/10 p-2">
        <Tile logo="personio.svg" size={32} />
        <span className="flex-1">
          <span className="block text-[11px] text-white/70">Challenger</span>
          <span className="font-semibold">Personio</span>
        </span>
        <span className="font-display text-sm font-bold text-eu-yellow">?</span>
      </div>
    </div>
  );
}

function ImpostorPreview() {
  // Five tiles on a circle around the category; one is the impostor.
  const logos = ["revolut.svg", "klarna.svg", "spotify.svg", "n26.svg", "monzo.svg"];
  return (
    <div className="relative h-36 w-36">
      <span className="absolute inset-0 m-auto flex h-14 w-20 items-center justify-center rounded-lg bg-white/10 px-1 text-center text-[11px] font-semibold leading-tight">
        European fintechs
      </span>
      {logos.map((logo, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / logos.length;
        const impostor = i === 2;
        return (
          <span
            key={i}
            className="absolute"
            style={{ left: `calc(50% + ${Math.cos(a) * 60}px - 17px)`, top: `calc(50% + ${Math.sin(a) * 60}px - 17px)` }}
          >
            <Tile logo={logo} size={34} className={impostor ? "ring-2 ring-eu-yellow" : ""} />
            {impostor && (
              <VenetianMask size={14} className="absolute -right-2 -top-2 rounded-full bg-eu-yellow p-0.5 text-eu-blue" />
            )}
          </span>
        );
      })}
    </div>
  );
}

const PREVIEWS: Record<GameMode, () => React.JSX.Element> = {
  "who-raised-this": WhoRaisedThisPreview,
  "unicorn-grid": UnicornGridPreview,
  "higher-lower": HigherLowerPreview,
  impostor: ImpostorPreview,
};
