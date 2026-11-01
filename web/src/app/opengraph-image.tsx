import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * The link preview for WhatsApp, LinkedIn, X, Slack and co.: the square logo (the unicorn in the
 * ring of stars, as in the header and on Instagram) centred on EU blue, so apps that crop the
 * preview to a square still show all of it. Brand only, never a company logo (see CLAUDE.md).
 * Rendered once at build time.
 */
export const alt = "EUnicorn: daily games about the European startup ecosystem";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logo = await readFile(join(process.cwd(), "public/brand/logo-og.png"));
  const src = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#003399" }}>
        <img src={src} width={630} height={630} alt="" />
      </div>
    ),
    size,
  );
}
