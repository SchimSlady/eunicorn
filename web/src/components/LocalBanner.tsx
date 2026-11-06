import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { REGIONS, REGION_IDS } from "@/lib/regions";

/**
 * Under the daily games on the home page: the way into the Local tab. A bonus next to the daily
 * games, not a second version of them, so a banner rather than a toggle at the top.
 */
export function LocalBanner() {
  return (
    <Link
      href="/local"
      className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-primary sm:p-5"
    >
      <span className="flex shrink-0 -space-x-2" aria-hidden>
        {REGION_IDS.map((r) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={r} src={REGIONS[r].flag} alt="" width={36} height={36} className="rounded-full ring-2 ring-surface" />
        ))}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-bold leading-tight">Play your local scene</span>
        <span className="block text-sm text-muted">Startups from Munich, Berlin or Germany only</span>
      </span>
      <ArrowRight size={20} className="shrink-0 text-primary" aria-hidden />
    </Link>
  );
}
