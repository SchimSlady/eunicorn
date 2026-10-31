import type { Metadata } from "next";

/**
 * Link preview fields every page shares. A page's own openGraph replaces the layout's
 * completely (image included), so pages spread these in.
 */
export const OG_SHARED = {
  type: "website",
  siteName: "EUnicorn",
  locale: "en_GB",
  images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "EUnicorn: daily games about the European startup ecosystem" }],
} satisfies Metadata["openGraph"];

/** Title, description, canonical URL and link preview for one page. */
export function pageMetadata(title: string, description: string, path: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...OG_SHARED, title, description, url: path },
    twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
  };
}
