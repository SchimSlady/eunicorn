import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { pageMetadata } from "@/lib/seo";

// Space Grotesk (Florian Karsten, Prague) for headings, Inter (Rasmus Andersson, Sweden) for text.
// Both are self-hosted from public/fonts (see the @font-face rules in globals.css): no request to
// Google, and no font download at build time, which made Vercel builds fail intermittently.

const DESCRIPTION = "Daily games about the European startup ecosystem. Go build in Europe.";

export const metadata: Metadata = {
  metadataBase: new URL("https://eunicorn.eu"),
  // Shared links unfurl as a card; the image is app/opengraph-image.tsx.
  ...pageMetadata("EUnicorn", DESCRIPTION, "/"),
};

export const viewport: Viewport = { themeColor: "#202227" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/space-grotesk-latin-wght-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body className="flex min-h-dvh flex-col antialiased">
        <SiteHeader />
        {/* At least a full screen below the header (3.5rem): the footer only shows when you scroll,
            never right under a short page such as a game that's still loading. */}
        <div className="min-h-[calc(100dvh-3.5rem)] flex-1">{children}</div>
        <SiteFooter />
        {/* Cookieless visitor counts (Vercel Web Analytics); see the privacy policy. */}
        <Analytics />
      </body>
    </html>
  );
}
