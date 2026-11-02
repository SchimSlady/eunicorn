/**
 * The result as a picture to share (Instagram story size, 1080 × 1920), drawn in the browser from
 * the share text, so every game gets one without extra wiring. No company logos: they may only
 * appear inside the games, never in anything shared.
 *
 * Minimal on purpose (Pablo, 2026-11-02): the score inside the ring of stars, how many of today's
 * players it beats, and "Can you beat me?". No squares per guess, no game title or level line.
 */

export interface ShareInfo {
  number: string;
  mode: string;
  difficulty: string;
  /** The result line without squares: "7 of 10 found", "Solved in 2 tries", "7 of 9 squares · 2 hints". */
  summary: string;
}

const SQUARES = new Set(["🟩", "🟥", "⬜"]); // taste-skill-ignore

/** Reads the text built by shareText() in lib/scoring.ts (same format, kept in step there). */
export function parseShare(text: string): ShareInfo {
  const lines = text.split("\n");
  const head = lines[0].match(/#(\d+)\s+\S+\s+(.*)$/u);
  let summary = "";
  for (const line of lines.slice(1, -2)) {
    const rest = Array.from(line)
      .filter((c) => !SQUARES.has(c))
      .join("")
      .trim();
    if (rest) summary = rest;
  }
  return { number: head?.[1] ?? "", mode: head?.[2] ?? "EUnicorn", difficulty: lines.at(-2) ?? "", summary };
}

/** What the result line counts, as shown under the big number. */
const CAPTIONS: Record<string, string> = { found: "startups found", squares: "squares filled", right: "right calls" };

/**
 * The big number and its caption: "7/10" + "startups found", "2" + "tries to spot the impostor".
 * A result that isn't a count ("Missed it") is shown as words.
 */
export function scoreOf(summary: string): { big: string; caption: string } {
  const result = summary.split(" · ")[0];
  const count = result.match(/^(\d+) of (\d+) (\w+)/);
  if (count) return { big: `${count[1]}/${count[2]}`, caption: CAPTIONS[count[3]] ?? count[3] };
  const tries = result.match(/in (\d+) tr(?:y|ies)/);
  if (tries) return { big: tries[1], caption: tries[1] === "1" ? "try to spot the impostor" : "tries to spot the impostor" };
  const guess = result.match(/on guess (\d+)/);
  if (guess) return { big: guess[1], caption: guess[1] === "1" ? "guess" : "guesses" };
  return { big: result, caption: "" };
}

const W = 1080;
const H = 1920;
const CENTER = 960; // middle of the ring and of the score
const COLORS = { bg: "#003399", ink: "#ffffff", soft: "rgba(255,255,255,0.72)", yellow: "#ffcc00" };

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

/** The largest size up to `size` at which the text fits `maxWidth`. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, size: number, maxWidth: number, weight = 700) {
  for (let px = size; px >= 36; px -= 4) {
    ctx.font = `${weight} ${px}px "Space Grotesk", sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) return px;
  }
  return 36;
}

/** betterThan: share of today's other players with a lower score, when known and above 0. */
export async function drawShareCard(info: ShareInfo, betterThan?: number | null): Promise<Blob> {
  await Promise.all([document.fonts.load('700 80px "Space Grotesk"'), document.fonts.load('500 40px "Inter"')]).catch(() => {});
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // The ring of twelve stars around the score.
  ctx.fillStyle = COLORS.yellow;
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    star(ctx, W / 2 + 420 * Math.sin(a), CENTER - 420 * Math.cos(a), 24);
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

  // The score, big, inside the ring; its caption under it.
  const { big, caption } = scoreOf(info.summary);
  ctx.fillStyle = COLORS.ink;
  const px = fitFont(ctx, big, 240, 560);
  const capH = px * 0.7;
  const blockH = capH + (caption ? 120 : 0);
  ctx.fillText(big, W / 2, CENTER - blockH / 2 + capH);
  if (caption) {
    ctx.fillStyle = COLORS.soft;
    ctx.font = '500 48px "Inter", sans-serif';
    ctx.fillText(caption, W / 2, CENTER + blockH / 2);
  }

  if (betterThan) {
    ctx.fillStyle = COLORS.yellow;
    fitFont(ctx, `Better than ${betterThan}% of players`, 72, 960);
    ctx.fillText(`Better than ${betterThan}% of players`, W / 2, 1520);
  }

  ctx.fillStyle = COLORS.ink;
  ctx.font = '700 60px "Space Grotesk", sans-serif';
  ctx.fillText("Can you beat me?", W / 2, 1680);
  ctx.fillStyle = COLORS.soft;
  ctx.font = '500 48px "Inter", sans-serif';
  ctx.fillText("Play free at eunicorn.eu", W / 2, 1752);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/png"));
}
