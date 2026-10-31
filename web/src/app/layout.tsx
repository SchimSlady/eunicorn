import type { Metadata } from "next";
import "./globals.css";
import { SiteFooter } from "@/components/SiteFooter";

// Space Grotesk (Florian Karsten, Prague) for headings, Inter (Rasmus Andersson, Sweden) for text.
// Both are self-hosted from public/fonts (see the @font-face rules in globals.css): no request to
// Google, and no font download at build time, which made Vercel builds fail intermittently.

export const metadata: Metadata = {
  title: "EUnicorn",
  description: "Daily games about the European startup ecosystem. Go build in Europe.",
};

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
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
