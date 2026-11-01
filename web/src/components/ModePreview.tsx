"use client";

import type { PlayMode } from "@/lib/top10";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Lock, VenetianMask } from "lucide-react";

import { Flag } from "./Flag";

/** Illustrations are drawn on a fixed canvas and scaled to whatever width the card has. */
const CANVAS_W = 240;
const CANVAS_H = 180;

/**
 * Small illustration of how each mode plays, for the home cards and intro screens.
 * Decorative only: hidden from screen readers, the card text says what the mode is.
 */
export function ModePreview({ mode }: { mode: PlayMode }) {
  const Preview = PREVIEWS[mode];
  return (
    <PreviewFrame>
      <Preview />
    </PreviewFrame>
  );
}

/** The blue card canvas the previews are drawn on, scaled to the card's width. */
export function PreviewFrame({ children }: { children: React.ReactNode }) {
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
        {children}
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

/** Also shown greyed out among the coming-soon games while Top 10 has its slot. */
export function WhoRaisedThisPreview() {
  // A mini deal board: the round on top, clue tiles below (two open, the next one glowing).
  const tiles: Array<{ label: string; value?: string; next?: boolean }> = [
    { label: "Announced", value: "Dec 2023" },
    { label: "HQ", value: "Paris" },
    { label: "Sector", next: true },
    { label: "Investors" },
  ];
  return (
    <div className="w-full max-w-[216px] space-y-1.5">
      <div className="rounded-lg bg-white/10 px-2.5 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-semibold uppercase tracking-widest text-white/60">Funding round</span>
          <span className="rounded-full bg-white/15 px-1.5 text-[8px] font-bold uppercase">Series A</span>
        </div>
        <div className="mt-0.5 flex items-end justify-between">
          <span className="font-display text-2xl font-bold leading-none text-eu-yellow">€385m</span>
          <span className="flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-white/40 text-xs font-bold text-white/60">
            ?
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {tiles.map(({ label, value, next }) => (
          <div
            key={label}
            className={`flex h-[30px] flex-col items-center justify-center rounded-md border ${
              value ? "border-white/20 bg-white/10" : next ? "border-eu-yellow/80" : "border-white/15"
            }`}
          >
            <span className={`text-[7px] font-semibold uppercase tracking-widest ${value ? "text-eu-yellow" : "text-white/50"}`}>{label}</span>
            {value ? (
              <span className="text-[10px] font-bold leading-tight">{value}</span>
            ) : (
              <Lock size={9} className={next ? "text-eu-yellow" : "text-white/40"} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-1 pt-0.5">
        {["bg-wrong", "", "", "", ""].map((c, i) => (
          <span key={i} className={`h-1.5 w-5 rounded-full ${c || "border border-eu-yellow/70"}`} />
        ))}
      </div>
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
      <div className="flex items-center gap-2 rounded-lg bg-white/10 p-2">
        <Tile logo="n26.svg" size={30} />
        <span className="flex-1">
          <span className="block text-[10px] text-white/70">Previous</span>
          <span className="font-semibold">N26</span>
        </span>
        <span className="font-display text-sm font-bold">€7.8bn</span>
      </div>
      <p className="py-0.5 text-center text-[10px] font-semibold text-white/60">then</p>
      <div className="flex items-center gap-2 rounded-lg border-2 border-white/80 bg-white/10 p-2">
        <Tile logo="personio.svg" size={30} />
        <span className="flex-1">
          <span className="block text-[10px] text-white/70">Next</span>
          <span className="font-semibold">Personio</span>
        </span>
        <span className="font-display text-sm font-bold text-eu-yellow">?</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <span className="flex items-center justify-center gap-1 rounded-full bg-eu-yellow py-1 text-[11px] font-bold text-eu-blue">
          <ChevronUp size={14} /> Higher
        </span>
        <span className="flex items-center justify-center gap-1 rounded-full bg-eu-yellow py-1 text-[11px] font-bold text-eu-blue">
          <ChevronDown size={14} /> Lower
        </span>
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

function Top10Preview() {
  // Ranks with some found (logo + name) and some still open; Europe by valuation in our data.
  const rows: Array<{ n: number; logo?: string; name?: string }> = [
    { n: 1, logo: "revolut.svg", name: "Revolut" },
    { n: 2 },
    { n: 3, logo: "mistral-ai.svg", name: "Mistral AI" },
    { n: 4 },
    { n: 5 },
  ];
  return (
    <div className="w-full max-w-[200px] text-[11px]">
      <p className="mb-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-eu-yellow">Most valuable in Europe</p>
      <div className="space-y-1">
        {rows.map(({ n, logo, name }) => (
          <div key={n} className={`flex h-6 items-center gap-2 rounded-md px-1.5 ${name ? "bg-white/15" : "border border-dashed border-white/30"}`}>
            <span className="w-3 text-right font-display font-bold text-eu-yellow">{n}</span>
            {logo && <Tile logo={logo} size={18} />}
            <span className="font-semibold">{name ?? ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PREVIEWS: Record<PlayMode, () => React.JSX.Element> = {
  "top-10": Top10Preview,
  "who-raised-this": WhoRaisedThisPreview,
  "unicorn-grid": UnicornGridPreview,
  "higher-lower": HigherLowerPreview,
  impostor: ImpostorPreview,
};
