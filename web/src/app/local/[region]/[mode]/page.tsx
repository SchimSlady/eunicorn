import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HigherLowerGame } from "@/app/play/higher-lower/HigherLowerGame";
import { ImpostorGame } from "@/app/play/impostor/ImpostorGame";
import { Top10Game } from "@/app/play/top-10/Top10Game";
import { MODE_INFO } from "@/lib/modes";
import { REGIONS, REGION_IDS, isLocalGame, isRegion, localModes, localPath } from "@/lib/regions";
import { pageMetadata } from "@/lib/seo";
import type { PlayMode } from "@/lib/top10";

type Params = { region: string; mode: string };

/** Every local game is known at build time: each region's games (lib/regions.ts). */
export function generateStaticParams(): Params[] {
  return REGION_IDS.flatMap((region) => localModes(region).map((mode) => ({ region, mode })));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { region, mode } = await params;
  if (!isRegion(region) || !isLocalGame(region, mode)) return {};
  const title = `${MODE_INFO[mode as PlayMode].title} · ${REGIONS[region].label} · EUnicorn`;
  return pageMetadata(title, `${MODE_INFO[mode as PlayMode].description} Only ${REGIONS[region].who()}.`, localPath(region, mode as PlayMode));
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { region, mode } = await params;
  if (!isRegion(region) || !isLocalGame(region, mode)) notFound();
  // Same widths as the daily pages of these games.
  if (mode === "impostor")
    return (
      <main className="mx-auto max-w-md px-4 py-8">
        <ImpostorGame region={region} />
      </main>
    );
  return mode === "top-10" ? (
    <main className="mx-auto max-w-md px-4 py-3">
      <Top10Game region={region} />
    </main>
  ) : (
    <main className="mx-auto max-w-md px-4 py-8 md:max-w-3xl">
      <HigherLowerGame region={region} />
    </main>
  );
}
