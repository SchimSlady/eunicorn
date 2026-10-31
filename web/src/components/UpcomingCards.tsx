"use client";

import { Lock, MapPin } from "lucide-react";
import { PreviewFrame } from "./ModePreview";

/**
 * Games that are planned but not playable yet: the same cards as the live modes, greyed out
 * with a "Coming soon" badge, and not links.
 */
const UPCOMING = [
  { id: "connections", title: "Connections", tagline: "Four groups of four", Preview: ConnectionsPreview },
  { id: "mafia-link", title: "Mafia Link", tagline: "Who worked where first", Preview: MafiaLinkPreview },
  { id: "top-10", title: "Top 10", tagline: "Name the ten biggest", Preview: Top10Preview },
  { id: "pin-the-hq", title: "Pin the HQ", tagline: "Find it on the map", Preview: PinTheHqPreview },
];

export function UpcomingCards() {
  return (
    <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
  const words = ["Klarna", "DeepL", "Qonto", "Monzo", "Celonis", "Alan", "Picnic", "Glovo", "Mollie", "Flix", "Brevo", "Helsing"];
  return (
    <div className="w-full max-w-[220px] space-y-1 text-[10px] font-semibold">
      <div className="rounded-md bg-eu-yellow px-2 py-1.5 text-center text-eu-blue">
        <span className="block text-[9px] uppercase tracking-wide">Founded in Berlin</span>
        N26 · Trade Republic · Flink · Raisin
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

function MafiaLinkPreview() {
  // Alumni around the company they all left, linked to it.
  const people = ["NS", "VY", "AK", "MP", "LT"];
  return (
    <div className="relative h-36 w-44">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 176 144">
        {people.map((_, i) => {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / people.length;
          return <line key={i} x1="88" y1="72" x2={88 + Math.cos(a) * 60} y2={72 + Math.sin(a) * 56} stroke="white" strokeOpacity=".35" strokeWidth="1.5" />;
        })}
      </svg>
      <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5">
        <Logo file="revolut.svg" size={36} />
        <span className="rounded bg-eu-blue px-1 text-[9px] font-semibold text-eu-yellow">alumni</span>
      </span>
      {people.map((p, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / people.length;
        return (
          <span
            key={p}
            className="absolute flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/70 bg-white/15 text-[10px] font-bold"
            style={{ left: `calc(50% + ${Math.cos(a) * 60}px - 14px)`, top: `calc(50% + ${Math.sin(a) * 56}px - 14px)` }}
          >
            {p}
          </span>
        );
      })}
    </div>
  );
}

function Top10Preview() {
  const rows: Array<{ n: number; logo?: string; name?: string }> = [
    { n: 1, logo: "revolut.svg", name: "Revolut" },
    { n: 2, logo: "klarna.svg", name: "Klarna" },
    { n: 3 },
    { n: 4, logo: "n26.svg", name: "N26" },
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
