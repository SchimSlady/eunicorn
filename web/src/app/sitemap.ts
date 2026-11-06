import type { MetadataRoute } from "next";
import { LIVE_MODES } from "@/lib/modes";
import { LOCAL_MODES, REGION_IDS, localPath } from "@/lib/regions";

const SITE = "https://eunicorn.eu";

/**
 * sitemap.xml: the home page, the live games (new puzzle every day), the Local tab and its games, and the info pages. Parked games
 * (Who Raised This?), /admin and the API are left out.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE, lastModified: now, changeFrequency: "daily", priority: 1 },
    ...LIVE_MODES.map((m) => ({ url: `${SITE}/play/${m.mode}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    { url: `${SITE}/local`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    ...REGION_IDS.flatMap((r) =>
      LOCAL_MODES.map((m) => ({ url: `${SITE}${localPath(r, m)}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.5 })),
    ),
    { url: `${SITE}/about`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE}/privacy`, changeFrequency: "monthly", priority: 0.2 },
  ];
}
