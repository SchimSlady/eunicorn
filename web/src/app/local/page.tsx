import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { InfoTip } from "@/components/InfoTip";
import { LocalCards } from "@/components/LocalCards";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "Local games · EUnicorn",
  "Top 10 and Higher or Lower with startups from Munich, Berlin or Germany only.",
  "/local",
);

export default function LocalPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-primary">
        <ArrowLeft size={16} aria-hidden /> Daily games
      </Link>
      <h1 className="mt-4 text-2xl font-bold leading-tight sm:text-[32px]">Play with local startups only</h1>
      <p className="mt-2 flex items-center gap-1.5 text-muted">
        Munich, Berlin or Germany
        <InfoTip label="About local games">
          A new game for each region every day, on top of the daily games. It doesn&apos;t count towards your streak.
        </InfoTip>
      </p>
      <div className="mt-6">
        <LocalCards />
      </div>
    </main>
  );
}
