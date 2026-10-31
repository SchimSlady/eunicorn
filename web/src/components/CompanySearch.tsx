"use client";

import { useId, useState } from "react";
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
  showLogos = true,
  autoFocus = false,
}: {
  companies: Company[];
  exclude: Set<string>;
  onPick: (c: Company) => void;
  placeholder?: string;
  /** Hard mode hides logos so the suggestion list doesn't give the answer away. */
  showLogos?: boolean;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(true);
  const listId = useId();
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
        }}
        onFocus={(e) => {
          // On phones the keyboard covers the lower half: keep the input and its list in view.
          if (matchMedia("(pointer: coarse)").matches) setTimeout(() => e.target.scrollIntoView({ block: "center", behavior: "smooth" }), 250);
        }}
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
          className="absolute inset-x-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-2xl border border-border bg-surface shadow-lg"
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
              {showLogos && <CompanyLogo company={c} size={28} />}
              <span className="font-medium">{c.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
