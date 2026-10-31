import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * The link preview for WhatsApp, LinkedIn, X, Slack and co. Brand only: our mascot and name,
 * never a company logo (see the logo rules in CLAUDE.md). Rendered once at build time.
 */
export const alt = "EUnicorn: daily games about the European startup ecosystem";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const unicorn = await readFile(join(process.cwd(), "public/brand/unicorn.png"));
  const src = `data:image/png;base64,${unicorn.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "#003399",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 32 }}>
          <img src={src} width={162} height={144} alt="" />
          <div style={{ display: "flex", fontSize: 140, fontWeight: 800, lineHeight: 1, letterSpacing: -4 }}>
            <span style={{ color: "#ffcc00" }}>EU</span>
            <span>nicorn</span>
          </div>
        </div>
        <div style={{ marginTop: 48, fontSize: 48, fontWeight: 600, lineHeight: 1.2 }}>
          Daily games about the European startup ecosystem
        </div>
        <div style={{ marginTop: 20, fontSize: 36, color: "#ffcc00", fontWeight: 700 }}>Go build in Europe.</div>
      </div>
    ),
    size,
  );
}
