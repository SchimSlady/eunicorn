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

function Tile({ letter, className = "" }: { letter: string; className?: string }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[22%] bg-white font-display text-xs font-bold text-eu-blue ${className}`}
    >
      {letter}
    </span>
  );
}

function WhoRaisedThisPreview() {
  const clues = [
    { Icon: Banknote, text: "Raised €385M" },
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
  const filled: Record<string, string> = { "0-0": "N", "0-1": "R", "1-0": "D", "1-2": "M", "2-1": "E" };
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
            const letter = filled[`${ri}-${ci}`];
            return (
              <span key={ci} className="flex h-10 w-12 items-center justify-center rounded-md border border-white/15">
                {letter && <Tile letter={letter} />}
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
        <Tile letter="N" />
        <span className="flex-1">
          <span className="block text-[11px] text-white/70">Your pick</span>
          <span className="font-semibold">N26</span>
        </span>
        <span className="font-display text-sm font-bold">$9B</span>
      </div>
      <div className="flex items-center justify-center gap-3 py-1.5 text-eu-yellow">
        <ChevronUp size={18} />
        <span className="text-[11px] font-semibold text-white/70">vs</span>
        <ChevronDown size={18} />
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-white/10 p-2">
        <Tile letter="P" />
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
  const letters = ["R", "K", "C", "B", "C"];
  return (
    <div className="relative h-36 w-36">
      <span className="absolute inset-0 m-auto flex h-14 w-20 items-center justify-center rounded-lg bg-white/10 px-1 text-center text-[11px] font-semibold leading-tight">
        European unicorns
      </span>
      {letters.map((l, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / letters.length;
        const impostor = i === 2;
        return (
          <span
            key={i}
            className="absolute"
            style={{ left: `calc(50% + ${Math.cos(a) * 58}px - 14px)`, top: `calc(50% + ${Math.sin(a) * 58}px - 14px)` }}
          >
            <Tile letter={l} className={impostor ? "ring-2 ring-eu-yellow" : ""} />
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
