import type { MetadataRoute } from "next";

/** robots.txt: everything public may be indexed, except the admin page and the API. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: "https://eunicorn.eu/sitemap.xml",
    host: "https://eunicorn.eu",
  };
}
