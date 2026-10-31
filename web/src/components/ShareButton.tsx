"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

/** Copies text where the async clipboard API is missing (insecure pages, some in-app browsers). */
function legacyCopy(text: string): boolean {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

/**
 * Native share sheet on mobile, clipboard everywhere else. Shares often start in Instagram or
 * LinkedIn's in-app browsers, where the clipboard API can fail: then an old-style copy, and if
 * that fails too, the text itself to copy by hand.
 */
/**
 * compact: a small pill for the result bar. It has no room for the copy-by-hand box, so when
 * copying fails it calls onCannotCopy (the bar opens the results sheet, whose button has the box).
 */
export function ShareButton({ text, compact = false, onCannotCopy }: { text: string; compact?: boolean; onCannotCopy?: () => void }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");

  async function share() {
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ text });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return; // the player closed the sheet
      }
    }
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = legacyCopy(text);
    }
    if (!ok && compact) {
      onCannotCopy?.();
      return;
    }
    setState(ok ? "copied" : "manual");
    if (ok) setTimeout(() => setState("idle"), 2000);
  }

  return (
    <div className={compact ? "contents" : "space-y-2"}>
      <button
        type="button"
        onClick={share}
        className={`flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary font-semibold text-on-primary transition active:scale-[0.98] ${
          compact ? "px-4 text-sm" : "w-full px-4 py-3"
        }`}
      >
        {state === "copied" ? <Check size={compact ? 16 : 18} aria-hidden /> : <Share2 size={compact ? 16 : 18} aria-hidden />}
        {state === "copied" ? "Copied" : compact ? "Share" : "Share result"}
      </button>
      <p className="sr-only" aria-live="polite">
        {state === "copied" ? "Result copied" : ""}
      </p>
      {state === "manual" && !compact && (
        <div className="space-y-1">
          <p className="text-center text-sm text-muted">Couldn&apos;t copy here. Select the text and copy it:</p>
          <textarea
            readOnly
            value={text}
            rows={Math.min(8, text.split("\n").length + 1)}
            onFocus={(e) => e.target.select()}
            className="w-full rounded-xl border border-border bg-surface p-3 font-mono text-sm"
          />
        </div>
      )}
    </div>
  );
}
