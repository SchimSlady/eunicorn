"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, Share2, UserPlus } from "lucide-react";
import { drawShareCard, parseShare } from "@/lib/shareCard";
import { loadStats } from "@/lib/stats";
import type { PlayMode } from "@/lib/top10";
import { Sheet } from "./Sheet";

const SITE = "https://eunicorn.eu";

/**
 * "Share" opens a share menu: the result as a picture (story size, for Instagram and WhatsApp),
 * one-tap WhatsApp, X and LinkedIn, the phone's own share sheet, and an invite without the result.
 * The message is short and emoji-free (WhatsApp Desktop garbles emoji in share links): the result,
 * how it ranks today, and "Can you beat me?" with a link to today's game.
 */
export function ShareButton({ text, score, maxScore, compact = false }: { text: string; score?: number; maxScore?: number; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary font-semibold text-on-primary transition active:scale-[0.98] ${
          compact ? "px-4 text-sm" : "w-full px-4 py-3"
        }`}
      >
        <Share2 size={compact ? 16 : 18} aria-hidden />
        {compact ? "Share" : "Share result"}
      </button>
      {open && <ShareMenu text={text} score={score} maxScore={maxScore} onClose={() => setOpen(false)} />}
    </>
  );
}

function ShareMenu({ text, score, maxScore, onClose }: { text: string; score?: number; maxScore?: number; onClose: () => void }) {
  const pathname = usePathname();
  const mode = pathname.startsWith("/play/") ? (pathname.slice(6) as PlayMode) : null;
  const gameUrl = `${SITE}${mode ? `/play/${mode}` : ""}`;
  const info = parseShare(text);
  // Share of today's other players with a lower score; null until known (or with nobody else yet).
  const [betterThan, setBetterThan] = useState<number | null>(null);
  const message = `EUnicorn ${info.mode}: ${info.summary}${betterThan ? `, better than ${betterThan}% of players` : ""}.\nCan you beat me? ${gameUrl}`;
  const fileName = `eunicorn-${info.mode.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${info.number}.png`;

  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  const [canShareFile, setCanShareFile] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    let url = "";
    const stats = mode && score != null && maxScore ? loadStats(mode).catch(() => null) : Promise.resolve(null);
    stats
      .then((s) => {
        if (!s || s.finishes < 2 || !maxScore) return null;
        const mine = Math.round(((score ?? 0) / maxScore) * 100);
        const below = Object.entries(s.scores).reduce((sum, [pct, n]) => sum + (Number(pct) < mine ? n : 0), 0);
        const pct = Math.round((below / (s.finishes - 1)) * 100);
        return pct > 0 ? pct : null;
      })
      .then((better) => {
        setBetterThan(better);
        return drawShareCard(info, better);
      })
      .then((blob) => {
        url = URL.createObjectURL(blob);
        setImage({ blob, url });
        const file = new File([blob], fileName, { type: "image/png" });
        setCanShareFile(!!navigator.canShare?.({ files: [file] }));
      })
      .catch(() => setImage(null));
    setCanShare(typeof navigator.share === "function");
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
    // Drawn once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function shareImage() {
    if (!image) return;
    const file = new File([image.blob], fileName, { type: "image/png" });
    if (canShareFile) {
      try {
        await navigator.share({ files: [file], text: message });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
      }
    }
    // Desktop: save it, then post it wherever.
    const a = document.createElement("a");
    a.href = image.url;
    a.download = fileName;
    a.click();
  }

  async function nativeShare(payload: ShareData) {
    try {
      await navigator.share(payload);
    } catch {
      // Closed or not allowed: nothing to do.
    }
  }

  const invite = `Daily games about European startups: guess valuations, find the impostor, fill the Unicorn Grid. ${SITE}`;
  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(message)}` },
    { label: "X", href: `https://x.com/intent/post?text=${encodeURIComponent(message)}` },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(gameUrl)}` },
  ];

  return (
    <Sheet title="Share your result" onClose={onClose}>
      <h2 className="text-center font-display text-xl font-bold">Share your result</h2>

      <div className="mx-auto aspect-[9/16] w-40 overflow-hidden rounded-xl border border-border bg-eu-blue">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt={`Result card: ${info.mode}, ${info.summary}`} className="h-full w-full" />
        )}
      </div>

      <button
        type="button"
        onClick={shareImage}
        disabled={!image}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 font-semibold text-on-primary transition active:scale-[0.98] disabled:opacity-60"
      >
        {canShareFile ? <Share2 size={18} aria-hidden /> : <Download size={18} aria-hidden />}
        {canShareFile ? "Share image" : "Save image"}
      </button>

      <div className={`grid gap-2 ${canShare ? "grid-cols-4" : "grid-cols-3"}`}>
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center justify-center rounded-full border border-border px-2 text-sm font-semibold hover:border-primary"
          >
            {l.label}
          </a>
        ))}
        {canShare && (
          <button
            type="button"
            onClick={() => nativeShare({ text: message })}
            className="flex min-h-11 items-center justify-center rounded-full border border-border px-2 text-sm font-semibold hover:border-primary"
          >
            More
          </button>
        )}
      </div>

      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={() =>
            canShare ? nativeShare({ text: invite }) : window.open(`https://wa.me/?text=${encodeURIComponent(invite)}`, "_blank", "noopener")
          }
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-border px-4 font-semibold hover:border-primary"
        >
          <UserPlus size={18} aria-hidden /> Invite friends to play
        </button>
      </div>
    </Sheet>
  );
}
