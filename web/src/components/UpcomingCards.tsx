"use client";

import { GripVertical, Lock, MapPin } from "lucide-react";
import { Flag } from "./Flag";
import { PreviewFrame, WhoRaisedThisPreview } from "./ModePreview";

/**
 * Games that are planned but not playable yet: the same cards as the live modes, greyed out
 * with a "Coming soon" badge, and not links. Only games our data (companies, rounds, investors,
 * founders) can actually support.
 */
const UPCOMING = [
  { id: "guess-the-vc", title: "Guess the VC", Preview: GuessTheVcPreview },
  { id: "connections", title: "Connections", Preview: ConnectionsPreview },
  { id: "who-raised-this", title: "Who Raised This?", Preview: WhoRaisedThisPreview },
  { id: "pin-the-hq", title: "Pin the HQ", Preview: PinTheHqPreview },
  { id: "rank-it", title: "Rank It", Preview: RankItPreview },
];

export function UpcomingCards() {
  return (
    <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {UPCOMING.map(({ id, title, Preview }) => (
        <li key={id} className="h-full overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="relative">
            <div className="opacity-50 grayscale">
              <PreviewFrame>
                <Preview />
              </PreviewFrame>
            </div>
            <span className="absolute right-2 top-2">
              <span className="flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold">
                <Lock size={12} aria-hidden /> Coming soon
              </span>
            </span>
          </div>
          <div className="p-4">
            <p className="font-display text-lg font-bold leading-tight text-muted">{title}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Logo({ file, size = 28 }: { file: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[22%] bg-white"
      style={{ width: size, height: size, padding: Math.round(size * 0.12) }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/logos/${file}`} alt="" className="h-full w-full object-contain" />
    </span>
  );
}

function GuessTheVcPreview() {
  // A real portfolio from the verified dataset (all four backed by Accel); the investor stays hidden.
  // The game will draw from tier 1-2 investors that back at least four companies with logos.
  const portfolio = ["spotify.svg", "celonis.png", "personio.svg", "doctolib.svg"];
  return (
    <div className="flex w-full max-w-[220px] flex-col items-center gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-eu-yellow">Who backed all four?</p>
      <div className="grid grid-cols-4 gap-1.5">
        {portfolio.map((f) => (
          <Logo key={f} file={f} size={36} />
        ))}
      </div>
      <span className="flex h-9 w-28 items-center justify-center rounded-full border-2 border-dashed border-white/40 font-display text-lg font-bold text-white/80">
        ?
      </span>
    </div>
  );
}

function ConnectionsPreview() {
  // All from the verified dataset; the solved group is real (Munich).
  const words = ["DeepL", "Qonto", "Mollie", "Alan", "Oura", "Glovo", "Picnic", "Brevo", "ICEYE", "N26", "Bitpanda", "Legora"];
  return (
    <div className="w-full max-w-[220px] space-y-1 text-[10px] font-semibold">
      <div className="rounded-md bg-eu-yellow px-2 py-1.5 text-center text-eu-blue">
        <span className="block text-[9px] uppercase tracking-wide">Based in Munich</span>
        Celonis · Personio · Helsing · Flix
      </div>
      <div className="grid grid-cols-4 gap-1">
        {words.map((w) => (
          <span key={w} className="truncate rounded-md bg-white/15 px-1 py-2 text-center">
            {w}
          </span>
        ))}
      </div>
    </div>
  );
}

function PinTheHqPreview() {
  // A dotted map; the pin marks the guess.
  const dots: Array<[number, number]> = [];
  for (let y = 0; y < 9; y++) for (let x = 0; x < 13; x++) if ((x * 7 + y * 5) % 9 > 2 && !(x > 9 && y > 5) && !(x < 2 && y < 3)) dots.push([x, y]);
  return (
    <div className="flex w-full max-w-[220px] flex-col items-center gap-1.5">
      <div className="flex items-center gap-2 rounded-md bg-white/15 px-2 py-1 text-[11px] font-semibold">
        <Logo file="mistral-ai.svg" size={20} /> Where is the HQ?
      </div>
      <div className="relative h-[104px] w-[176px]">
        {dots.map(([x, y]) => (
          <span key={`${x}-${y}`} className="absolute h-1.5 w-1.5 rounded-full bg-white/35" style={{ left: x * 13 + 4, top: y * 11 + 4 }} />
        ))}
        <MapPin size={26} className="absolute fill-eu-yellow text-eu-blue" style={{ left: 52, top: 50 }} />
      </div>
    </div>
  );
}

function RankItPreview() {
  // Countries to drag into order; the first two are already placed.
  const rows: Array<{ code: string; name: string; placed: boolean }> = [
    { code: "GB", name: "UK", placed: true },
    { code: "DE", name: "Germany", placed: true },
    { code: "FR", name: "France", placed: false },
    { code: "SE", name: "Sweden", placed: false },
  ];
  return (
    <div className="w-full max-w-[200px] text-[11px]">
      <p className="mb-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-eu-yellow">Most unicorns</p>
      <div className="space-y-1">
        {rows.map(({ code, name, placed }, i) => (
          <div
            key={code}
            className={`flex h-7 items-center gap-2 rounded-md px-1.5 ${placed ? "bg-white/15" : "border border-dashed border-white/30"}`}
          >
            <span className="w-3 text-right font-display font-bold text-eu-yellow">{i + 1}</span>
            <Flag country={code} size={16} />
            <span className="flex-1 font-semibold">{name}</span>
            <GripVertical size={14} className="text-white/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
