import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HigherLowerGame } from "@/app/play/higher-lower/HigherLowerGame";
import { Top10Game } from "@/app/play/top-10/Top10Game";
import { MODE_INFO } from "@/lib/modes";
import { LOCAL_MODES, REGIONS, REGION_IDS, isRegion, localPath } from "@/lib/regions";
import { pageMetadata } from "@/lib/seo";
import type { PlayMode } from "@/lib/top10";

type Params = { region: string; mode: string };

/** Every local game is known at build time: three regions × two games. */
export function generateStaticParams(): Params[] {
  return REGION_IDS.flatMap((region) => LOCAL_MODES.map((mode) => ({ region, mode })));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { region, mode } = await params;
  if (!isRegion(region) || !LOCAL_MODES.includes(mode as PlayMode)) return {};
  const title = `${MODE_INFO[mode as PlayMode].title} · ${REGIONS[region].label} · EUnicorn`;
  return pageMetadata(title, `${MODE_INFO[mode as PlayMode].description} Only ${REGIONS[region].who()}.`, localPath(region, mode as PlayMode));
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { region, mode } = await params;
  if (!isRegion(region) || !LOCAL_MODES.includes(mode as PlayMode)) notFound();
  // Same widths as the daily pages of these games.
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
