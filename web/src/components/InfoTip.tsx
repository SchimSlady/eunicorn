"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";

/** A small (i) that shows a note on hover, focus or tap (tap again, or tap elsewhere, to close). */
export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  // Hover shows it while the pointer is over it; a tap or click pins it open until tapped again or elsewhere.
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hover || pinned;
  const id = useId();
  const box = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (!box.current?.contains(e.target as Node)) setPinned(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setPinned(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <span ref={box} className="relative inline-flex align-middle" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => setPinned((p) => !p)}
        className="rounded-full text-muted transition hover:text-primary focus-visible:text-primary"
      >
        <Info size={16} aria-hidden />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-1/2 top-full z-30 mt-2 w-60 -translate-x-1/2 rounded-xl border border-border bg-surface p-3 text-left text-sm font-normal leading-snug text-foreground shadow-lg"
        >
          {children}
        </span>
      )}
    </span>
  );
}
