import type { Metadata } from "next";
import { HomeTabs } from "@/components/HomeTabs";
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
      <HomeTabs active="local" />
      <h1 className="mt-6 text-2xl font-bold leading-tight sm:text-[32px]">Play your local scene</h1>
      <p className="mt-2 max-w-xl text-muted">
        Only startups from one place. A new game for each region every day, on top of the daily games: it doesn&apos;t count towards
        your streak.
      </p>
      <div className="mt-6">
        <LocalCards />
      </div>
    </main>
  );
}
