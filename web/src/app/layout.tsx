import type { Metadata, Viewport } from "next";
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
      <body className="antialiased">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
