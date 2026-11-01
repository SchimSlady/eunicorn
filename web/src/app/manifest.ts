import type { MetadataRoute } from "next";

/** Installable as an app (add to home screen); the PWA from PLAN.md starts here. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EUnicorn",
    short_name: "EUnicorn",
    description: "Daily games about the European startup ecosystem.",
    start_url: "/",
    display: "standalone",
    background_color: "#202227",
    theme_color: "#202227",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
