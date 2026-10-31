"use client";

import { GripVertical, Lightbulb, Lock, Mail, MapPin } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/legal";
import { Flag } from "./Flag";
import { PreviewFrame } from "./ModePreview";

/**
 * Games that are planned but not playable yet: the same cards as the live modes, greyed out
 * with a "Coming soon" badge, and not links. Only games our data (companies, rounds, investors,
 * founders) can actually support. Last card: send us your own idea.
 */
const UPCOMING = [
  { id: "connections", title: "Connections", tagline: "Four groups of four", Preview: ConnectionsPreview },
  { id: "top-10", title: "Top 10", tagline: "Name the ten biggest", Preview: Top10Preview },
  { id: "pin-the-hq", title: "Pin the HQ", tagline: "Find it on the map", Preview: PinTheHqPreview },
  { id: "rank-it", title: "Rank It", tagline: "Put them in order", Preview: RankItPreview },
];

export function UpcomingCards() {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {UPCOMING.map(({ id, title, tagline, Preview }) => (
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
            <p className="mt-1 text-sm text-muted">{tagline}</p>
          </div>
        </li>
      ))}
      <li>
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Game idea for EUnicorn")}`}
          className="flex h-full flex-col overflow-hidden rounded-2xl border-2 border-dashed border-border transition hover:-translate-y-0.5 hover:border-primary"
        >
          <span className="flex aspect-[4/3] flex-col items-center justify-center gap-2 text-primary">
            <Lightbulb size={36} aria-hidden />
            <span className="text-sm font-semibold text-foreground">Your game here?</span>
          </span>
          <span className="p-4">
            <span className="block font-display text-lg font-bold leading-tight">Submit your idea</span>
            <span className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <Mail size={14} aria-hidden /> Pitch us a game
            </span>
          </span>
        </a>
      </li>
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

function Top10Preview() {
  const rows: Array<{ n: number; logo?: string; name?: string }> = [
    // Order as in the verified dataset (last valuation): Trade Republic, N26, Alan, Mollie, Qonto.
    { n: 1, logo: "trade-republic.svg", name: "Trade Republic" },
    { n: 2, logo: "n26.svg", name: "N26" },
    { n: 3 },
    { n: 4, logo: "mollie.png", name: "Mollie" },
    { n: 5 },
  ];
  return (
    <div className="w-full max-w-[200px] text-[11px]">
      <p className="mb-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-eu-yellow">Most valuable fintechs</p>
      <div className="space-y-1">
        {rows.map(({ n, logo, name }) => (
          <div
            key={n}
            className={`flex h-6 items-center gap-2 rounded-md px-1.5 ${name ? "bg-white/15" : "border border-dashed border-white/30"}`}
          >
            <span className="w-3 text-right font-display font-bold text-eu-yellow">{n}</span>
            {logo && <Logo file={logo} size={18} />}
            <span className="font-semibold">{name ?? ""}</span>
          </div>
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
