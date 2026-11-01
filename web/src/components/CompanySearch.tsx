"use client";

import { useId, useRef, useState } from "react";
import type { Company } from "@eunicorn/schema";
import { searchCompanies } from "@/lib/data";
import { CompanyLogo } from "./CompanyLogo";

/**
 * Autocomplete input: the player can only submit a company that exists in the dataset.
 * An ARIA combobox (APG pattern): arrow keys move through the list, Enter picks, Escape closes,
 * and screen readers hear the active option.
 */
export function CompanySearch({
  companies,
  exclude,
  onPick,
  placeholder = "Type a company…",
  autoFocus = false,
}: {
  companies: Company[];
  exclude: Set<string>;
  onPick: (c: Company) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(true);
  // The list opens towards the side with more room (upwards when the phone keyboard is up)
  // and is never taller than that room, so nothing has to scroll to see it.
  const [up, setUp] = useState(false);
  const [maxH, setMaxH] = useState(240);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  function measure() {
    const el = inputRef.current;
    if (!el) return;
    const visible = window.visualViewport?.height ?? window.innerHeight;
    const rect = el.getBoundingClientRect();
    const header = 64; // the sticky site header covers the top of the page
    const above = rect.top - header;
    const below = visible - rect.bottom;
    const openUp = below < 240 && above >= below;
    setUp(openUp);
    setMaxH(Math.max(120, Math.min(240, (openUp ? above : below) - 8)));
  }
  const results = searchCompanies(
    companies.filter((c) => !exclude.has(c.id)),
    query,
  );
  const expanded = open && results.length > 0;
  const optionId = (i: number) => `${listId}-${i}`;

  function pick(c: Company) {
    onPick(c);
    setQuery("");
    setActive(0);
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded ? optionId(active) : undefined}
        aria-label="Company"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
          measure();
        }}
        // The keyboard takes a moment to open; measure once it has. No forced scrolling, so the
        // game above the input stays where it is.
        onFocus={() => setTimeout(measure, 350)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
          else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
          else if (e.key === "Enter" && expanded && results[active]) pick(results[active]);
          else if (e.key === "Escape") setOpen(false);
          else return;
          e.preventDefault();
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-primary"
      />
      {expanded && (
        // A floating menu, so it may cast a shadow. taste-skill-ignore
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching companies"
          style={{ maxHeight: maxH }}
          className={`absolute inset-x-0 z-30 overflow-y-auto rounded-2xl border border-border bg-surface shadow-lg ${up ? "bottom-full mb-1" : "top-full mt-1"}`}
        >
          {results.map((c, i) => (
            <li
              key={c.id}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              // Keep focus in the input, so the keyboard stays open on phones.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(c)}
              className={`flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2 ${i === active ? "bg-primary/10" : ""}`}
            >
              <CompanyLogo company={c} size={28} />
              <span className="font-medium">{c.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
