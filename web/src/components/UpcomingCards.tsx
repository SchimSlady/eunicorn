"use client";

import { useState } from "react";
import { Check, GripVertical, Lightbulb, Lock, MapPin, Send } from "lucide-react";
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
      <li>
        <IdeaCard />
      </li>
    </ul>
  );
}

/** "Submit your idea": a text field in the card, sent by our server (/api/idea) as an email to us. */
function IdeaCard() {
  const [idea, setIdea] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot, hidden from people
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const res = await fetch("/api/idea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea, email, website }),
    }).catch(() => null);
    if (res?.ok) {
      setState("sent");
      return;
    }
    const msg = ((await res?.json().catch(() => null)) as { error?: string } | null)?.error;
    setError(msg ?? "Couldn't send it.");
    setState("error");
  }

  if (state === "sent") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-correct p-6 text-center">
        <Check size={32} className="text-correct" aria-hidden />
        <p className="font-display text-lg font-bold">Thanks!</p>
        <p className="text-sm text-muted">We read every idea.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex h-full flex-col rounded-2xl border-2 border-dashed border-border p-4">
      <p className="flex items-center gap-1.5 font-display text-lg font-bold leading-tight">
        <Lightbulb size={18} className="text-primary" aria-hidden /> Submit your idea
      </p>
      <label className="sr-only" htmlFor="idea">
        Your game idea
      </label>
      <textarea
        id="idea"
        required
        minLength={10}
        maxLength={2000}
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        placeholder="Which game should we build next?"
        className="mt-3 min-h-24 flex-1 resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
      />
      <label className="sr-only" htmlFor="idea-email">
        Your email (optional)
      </label>
      <input
        id="idea-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email (optional, for a reply)"
        className="mt-2 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <input
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        name="website"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      {state === "error" && (
        <p className="mt-2 text-xs text-wrong">
          {error} You can also write to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      )}
      <button
        type="submit"
        disabled={state === "sending" || idea.trim().length < 10}
        className="mt-3 flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition disabled:opacity-40"
      >
        <Send size={16} aria-hidden /> {state === "sending" ? "Sending…" : "Send idea"}
      </button>
    </form>
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
