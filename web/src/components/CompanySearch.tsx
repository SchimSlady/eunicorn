"use client";

import { useState } from "react";
import type { Company } from "@eunicorn/schema";
import { searchCompanies } from "@/lib/data";
import { CompanyLogo } from "./CompanyLogo";

/** Autocomplete input: the player can only submit a company that exists in the dataset. */
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
  const results = searchCompanies(
    companies.filter((c) => !exclude.has(c.id)),
    query,
  );

  function pick(c: Company) {
    onPick(c);
    setQuery("");
    setActive(0);
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
          else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
          else if (e.key === "Enter" && results[active]) pick(results[active]);
          else return;
          e.preventDefault();
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-primary"
      />
      {results.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          {results.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(c)}
                className={`flex w-full items-center gap-3 px-4 py-2 text-left ${i === active ? "bg-primary/10" : ""}`}
              >
                {showLogos && <CompanyLogo company={c} size={28} />}
                <span className="font-medium">{c.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
