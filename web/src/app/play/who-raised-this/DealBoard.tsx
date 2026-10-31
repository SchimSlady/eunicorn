import { Banknote, CalendarDays, Handshake, Image as ImageIcon, Lock, MapPin, Tag, Target, Users, type LucideIcon } from "lucide-react";
import type { Company, Round, WhoRaisedThisPuzzle } from "@eunicorn/schema";
import { CompanyLogo } from "@/components/CompanyLogo";

type Clue = WhoRaisedThisPuzzle["clues"][number];

const STAGE_LABEL: Record<string, string> = {
  "pre-seed": "Pre-seed",
  seed: "Seed",
  "series-a": "Series A",
  "series-b": "Series B",
  "series-c": "Series C",
  "series-d": "Series D",
  "series-e": "Series E",
  "series-f+": "Series F+",
  growth: "Growth",
  secondary: "Secondary",
  ipo: "IPO",
};

/** Category label + the value without its lead-in ("Backed by X" → Investors: X). */
const ICONS: Record<Clue["kind"], LucideIcon> = {
  amount: Banknote,
  year: CalendarDays,
  sector: Tag,
  city: MapPin,
  "lead-investor": Target,
  investors: Handshake,
  founders: Users,
  "logo-blurred": ImageIcon,
};

function view(clue: Clue): { label: string; value: string; wide: boolean } {
  const t = clue.text;
  switch (clue.kind) {
    case "year": {
      const founded = t.match(/^Founded in (\d{4})/);
      return founded ? { label: "Founded", value: founded[1], wide: false } : { label: "Announced", value: t, wide: false };
    }
    case "sector":
      return { label: "Sector", value: t, wide: false };
    case "city":
      return { label: "HQ", value: t, wide: false };
    case "lead-investor":
      return { label: "Lead", value: t.replace(/^Led by /, ""), wide: true };
    case "investors":
      return t.startsWith("Also:")
        ? { label: "More investors", value: t.replace(/^Also:\s*/, ""), wide: true }
        : { label: "Investors", value: t.replace(/^Backed by /, ""), wide: true };
    case "founders":
      return { label: "Founders", value: t.replace(/^Founded by /, ""), wide: true };
    case "logo-blurred":
      return { label: "Logo", value: "", wide: false };
    default:
      return { label: "Raised", value: t, wide: false };
  }
}

/**
 * The round as a deal card on top (amount, stage, and a mystery slot for the company),
 * then one tile per clue: locked tiles show their category, the next one to unlock glows,
 * and revealed tiles flip open. The first clue (the amount) lives in the deal card.
 */
export function DealBoard({
  clues,
  cluesShown,
  done,
  answer,
  round,
}: {
  clues: Clue[];
  cluesShown: number;
  done: boolean;
  answer: Company;
  round?: Round;
}) {
  const [first, ...rest] = clues;
  const amount = first?.text.match(/€\s?[\d.,]+\s?(?:bn|m|k)?/)?.[0] ?? first?.text;
  const stage = round ? STAGE_LABEL[round.stage] : first?.text.match(/Series [A-F]\+?|Seed|Pre-seed/i)?.[0];

  return (
    <div className="space-y-3">
      <section className="relative overflow-hidden rounded-2xl bg-eu-blue p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Funding round</p>
          {stage && (
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide">{stage}</span>
          )}
        </div>
        <p className="mt-2 font-display text-5xl font-bold leading-none text-eu-yellow sm:text-6xl">{amount}</p>
        <div className="mt-5 flex items-center gap-3">
          {done ? (
            <span className="flex animate-pop items-center gap-3">
              <CompanyLogo company={answer} size={44} />
              <span className="font-display text-xl font-bold">{answer.name}</span>
            </span>
          ) : (
            <>
              <span className="flex h-11 w-11 items-center justify-center rounded-[22%] border-2 border-dashed border-white/40 font-display text-xl font-bold text-white/60">
                ?
              </span>
              <span className="font-medium text-white/80">Who raised this?</span>
            </>
          )}
        </div>
      </section>

      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rest.map((clue, j) => {
          const i = j + 1; // index in the full clue list
          const shown = i < cluesShown;
          const next = !done && i === cluesShown;
          const { label, value, wide } = view(clue);
          const Icon = ICONS[clue.kind];
          return (
            <li
              key={i}
              className={`flex min-h-24 flex-col justify-center rounded-2xl border-2 p-3 text-center ${wide ? "col-span-2 sm:col-span-3" : ""} ${
                shown
                  ? "animate-flip-in border-border bg-surface"
                  : next
                    ? "border-primary/70 bg-surface/40"
                    : "border-border/60 bg-surface/30"
              }`}
            >
              <span
                className={`flex items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-widest ${shown ? "text-primary" : "text-muted"}`}
              >
                <Icon size={12} aria-hidden /> {label}
              </span>
              {shown ? (
                clue.kind === "logo-blurred" ? (
                  <span className="mt-1 flex justify-center">
                    <CompanyLogo company={answer} size={48} blurred={!done} />
                  </span>
                ) : (
                  <span className="mt-1 font-display text-lg font-bold leading-snug">{value}</span>
                )
              ) : (
                <Lock size={16} className={`mx-auto mt-1.5 ${next ? "text-primary" : "text-muted/60"}`} aria-label="Locked" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** One pill per allowed guess: green = right, red = wrong, outlined = still open. */
export function GuessPills({ guesses, answerId, max }: { guesses: string[]; answerId: string; max: number }) {
  return (
    <div className="flex justify-center gap-2" aria-label={`${guesses.length} of ${max} guesses used`}>
      {Array.from({ length: max }, (_, i) => {
        const g = guesses[i];
        const cls = g === undefined ? "border-2 border-primary/60" : g === answerId ? "bg-correct" : "bg-wrong";
        return <span key={i} className={`h-3 w-8 rounded-full ${cls}`} />;
      })}
    </div>
  );
}
