/**
 * The result as a picture to share (Instagram story size, 1080 × 1920), drawn in the browser from
 * the share text, so every game gets one without extra wiring. No company logos: they may only
 * appear inside the games, never in anything shared.
 */

export interface ShareInfo {
  number: string;
  mode: string;
  difficulty: string;
  /** Rows of squares: "right" | "wrong" | "empty". */
  rows: Array<Array<"right" | "wrong" | "empty">>;
  summary: string;
}

const SQUARE: Record<string, "right" | "wrong" | "empty"> = { "🟩": "right", "🟥": "wrong", "⬜": "empty" }; // taste-skill-ignore

/** Reads the text built by shareText() in lib/scoring.ts (same format, kept in step there). */
export function parseShare(text: string): ShareInfo {
  const lines = text.split("\n");
  const head = lines[0].match(/#(\d+)\s+\S+\s+(.*)$/u);
  const body = lines.slice(1, -2);
  const rows: ShareInfo["rows"] = [];
  let summary = "";
  for (const line of body) {
    const chars = Array.from(line);
    const squares = chars.filter((c) => SQUARE[c]).map((c) => SQUARE[c]);
    const rest = chars.filter((c) => !SQUARE[c]).join("").trim();
    if (squares.length) rows.push(squares);
    if (rest) summary = rest;
  }
  return { number: head?.[1] ?? "", mode: head?.[2] ?? "EUnicorn", difficulty: lines.at(-2) ?? "", rows, summary };
}

const W = 1080;
const H = 1920;
const COLORS = { bg: "#003399", ink: "#ffffff", soft: "rgba(255,255,255,0.72)", yellow: "#ffcc00", right: "#7cc35a", wrong: "#f0566a", empty: "rgba(255,255,255,0.18)" };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.4 : r;
    ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
  }
  ctx.closePath();
  ctx.fill();
}

/** Long linear results wrap into even rows of at most 8 (Top 10: 5 + 5, Higher or Lower: 8 + 7). */
function layoutRows(rows: ShareInfo["rows"]): ShareInfo["rows"] {
  if (rows.length !== 1 || rows[0].length <= 8) return rows;
  const count = Math.ceil(rows[0].length / 8);
  const per = Math.ceil(rows[0].length / count);
  const out: ShareInfo["rows"] = [];
  for (let i = 0; i < rows[0].length; i += per) out.push(rows[0].slice(i, i + per));
  return out;
}

/** betterThan: share of today's other players with a lower score, when known. */
export async function drawShareCard(info: ShareInfo, betterThan?: number | null): Promise<Blob> {
  await Promise.all([document.fonts.load('700 80px "Space Grotesk"'), document.fonts.load('500 40px "Inter"')]).catch(() => {});
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // The ring of twelve stars, faint, behind the result.
  ctx.fillStyle = "rgba(255,204,0,0.16)";
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    star(ctx, W / 2 + 360 * Math.sin(a), 1000 - 360 * Math.cos(a), 30);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Brand at the top (kept clear of the story UI).
  const logo = await loadImage("/brand/unicorn.png").catch(() => null);
  ctx.font = '700 64px "Space Grotesk", sans-serif';
  const word = "EUnicorn";
  const wordW = ctx.measureText(word).width;
  const logoW = logo ? 84 : 0;
  const x0 = W / 2 - (wordW + logoW + 18) / 2;
  if (logo) ctx.drawImage(logo, x0, 232, logoW, (logoW * logo.height) / logo.width);
  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.yellow;
  ctx.fillText("EU", x0 + logoW + 18, 300);
  ctx.fillStyle = COLORS.ink;
  ctx.fillText("nicorn", x0 + logoW + 18 + ctx.measureText("EU").width, 300);
  ctx.textAlign = "center";

  ctx.fillStyle = COLORS.ink;
  ctx.font = '700 92px "Space Grotesk", sans-serif';
  ctx.fillText(info.mode, W / 2, 500);
  ctx.fillStyle = COLORS.soft;
  ctx.font = '500 44px "Inter", sans-serif';
  ctx.fillText([info.number && `#${info.number}`, info.difficulty].filter(Boolean).join(" · "), W / 2, 570);

  // The squares, centred around the middle of the ring.
  const rows = layoutRows(info.rows);
  const longest = Math.max(1, ...rows.map((r) => r.length));
  const size = Math.min(110, Math.floor(760 / longest) - 14);
  const gap = Math.round(size * 0.16);
  const blockH = rows.length * size + (rows.length - 1) * gap;
  let y = 1000 - blockH / 2;
  for (const row of rows) {
    const rowW = row.length * size + (row.length - 1) * gap;
    let x = W / 2 - rowW / 2;
    for (const s of row) {
      ctx.fillStyle = COLORS[s];
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, size * 0.18);
      ctx.fill();
      x += size + gap;
    }
    y += size + gap;
  }

  ctx.fillStyle = COLORS.yellow;
  ctx.font = '700 76px "Space Grotesk", sans-serif';
  ctx.fillText(info.summary, W / 2, 1500);
  if (betterThan) {
    ctx.fillStyle = COLORS.ink;
    ctx.font = '500 48px "Inter", sans-serif';
    ctx.fillText(`Better than ${betterThan}% of players`, W / 2, 1572);
  }

  ctx.fillStyle = COLORS.ink;
  ctx.font = '700 60px "Space Grotesk", sans-serif';
  ctx.fillText("Can you beat me?", W / 2, 1680);
  ctx.fillStyle = COLORS.soft;
  ctx.font = '500 48px "Inter", sans-serif';
  ctx.fillText("Play free at eunicorn.eu", W / 2, 1752);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/png"));
}
