"use client";

import { useState } from "react";

/**
 * Giving up ends today's game, so it takes two taps: the first asks, the second reveals.
 * `inline`: a button of its own width in a wrapping row; the question takes the full row.
 * A real secondary button, not a link-looking caption next to the input.
 */
export function RevealButton({ label, onConfirm, inline = false }: { label: string; onConfirm: () => void; inline?: boolean }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className={`min-h-11 rounded-full border border-border px-4 text-sm font-medium text-muted hover:border-primary ${inline ? "" : "w-full"}`}
      >
        {label}
      </button>
    );
  }
  return (
    <div className={`space-y-2 rounded-2xl border border-border p-3 text-center ${inline ? "w-full basis-full" : ""}`} role="alertdialog" aria-label="Give up today's puzzle?">
      <p className="text-sm font-semibold">Give up today&apos;s puzzle? You can&apos;t play it again.</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          autoFocus
          onClick={() => setAsking(false)}
          className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold"
        >
          Keep playing
        </button>
        <button type="button" onClick={onConfirm} className="min-h-11 rounded-full bg-wrong px-4 text-sm font-semibold text-white">
          Yes, {label.toLowerCase()}
        </button>
      </div>
    </div>
  );
}
