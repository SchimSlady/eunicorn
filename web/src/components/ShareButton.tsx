"use client";

import { useState } from "react";

/** Native share sheet on mobile, clipboard everywhere else. */
export function ShareButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // Cancelled or unsupported: fall through to copying.
      }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={share}
      className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-on-primary transition active:scale-[0.98]"
    >
      {copied ? "Copied ✓" : "Share result"}
    </button>
  );
}
