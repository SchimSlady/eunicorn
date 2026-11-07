"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Company, Dataset } from "@eunicorn/schema";
import { CompanyLogo } from "./CompanyLogo";
import { Flag } from "./Flag";
import { Sheet } from "./Sheet";
import { formatUsdAsEur, sectorLabel } from "@/lib/format";
import { overviewOf, roundMonth, stageLabel } from "@/lib/overview";

/**
 * Company overview (Pablo, 2026-11-07): once a game is over, tapping any company on the board opens
 * a short profile: where and when it was founded, what it does, founders, best-known backers and the
 * money in one row. Only after the game, so it can't give answers away. No link to the company's site.
 *
 * Each game wraps its board in <OverviewProvider data>, and wraps companies in <CompanyTap>, which
 * becomes a button only when `active` (the game is done) and a provider is there.
 */

const Ctx = createContext<((c: Company) => void) | null>(null);

export function OverviewProvider({ data, children }: { data: Dataset | null; children: React.ReactNode }) {
  const [company, setCompany] = useState<Company | null>(null);
  const close = useCallback(() => setCompany(null), []);
  return (
    <Ctx.Provider value={data ? setCompany : null}>
      {children}
      {company && data && <OverviewSheet company={company} data={data} onClose={close} />}
    </Ctx.Provider>
  );
}

/** Makes its children open the overview once the game is over; until then it renders them as they are. */
export function CompanyTap({
  company,
  active,
  className = "",
  children,
}: {
  company: Company;
  active: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const open = useContext(Ctx);
  // Not tappable (yet): same layout, no button.
  if (!active || !open) return className ? <span className={className}>{children}</span> : <>{children}</>;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        open(company);
      }}
      aria-label={`About ${company.name}`}
      className={`cursor-pointer text-left transition active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  );
}

const STATUS_BADGE: Partial<Record<Company["status"], string>> = { acquired: "Acquired", public: "Public", defunct: "Closed" };

function OverviewSheet({ company, data, onClose }: { company: Company; data: Dataset; onClose: () => void }) {
  const o = useMemo(() => overviewOf(company, data), [company, data]);
  const badges = [company.unicorn ? "Unicorn" : null, STATUS_BADGE[company.status] ?? null].filter((b): b is string => !!b);
  const money = [
    o.totalRaisedUsd ? { label: "Raised", value: formatUsdAsEur(o.totalRaisedUsd) } : null,
    o.latestRound
      ? { label: "Latest round", value: `${stageLabel(o.latestRound.stage)} · ${formatUsdAsEur(o.latestRound.amountUsd)} · ${roundMonth(o.latestRound.date)}` }
      : null,
    company.lastValuationUsd ? { label: "Valuation", value: formatUsdAsEur(company.lastValuationUsd) } : null,
  ].filter((m): m is { label: string; value: string } => !!m);

  return (
    <Sheet title={company.name} onClose={onClose}>
      <div className="flex items-center gap-3 pr-10">
        <CompanyLogo company={company} size={56} />
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-bold leading-tight">{company.name}</h2>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <Flag country={company.country} size={14} /> {company.city}
            {company.founded ? ` · founded ${company.founded}` : ""}
          </p>
        </div>
      </div>

      {company.tagline && <p className="text-base leading-snug">{company.tagline}</p>}

      {(badges.length > 0 || company.sectors.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {badges.map((b) => (
            <span key={b} className="rounded-full bg-eu-yellow px-2.5 py-0.5 text-xs font-semibold text-eu-blue">
              {b}
            </span>
          ))}
          {company.sectors.map((s) => (
            <span key={s} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">
              {sectorLabel(s)}
            </span>
          ))}
        </div>
      )}

      <dl className="space-y-3 text-sm">
        {o.founders.length > 0 && (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-muted">{o.founders.length === 1 ? "Founder" : "Founders"}</dt>
            <dd className="mt-0.5">{o.founders.join(", ")}</dd>
          </div>
        )}
        {o.investors.length > 0 && (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-muted">Backed by</dt>
            <dd className="mt-0.5">{o.investors.map((i) => i.name).join(", ")}</dd>
          </div>
        )}
      </dl>

      {money.length > 0 && (
        <div className="divide-y divide-border rounded-2xl border border-border bg-surface px-3 text-sm">
          {money.map((m) => (
            <div key={m.label} className="flex items-baseline justify-between gap-3 py-2">
              <span className="text-muted">{m.label}</span>
              <span className="text-right font-semibold tabular-nums">{m.value}</span>
            </div>
          ))}
        </div>
      )}

      {company.funFact && (
        <p className="rounded-2xl bg-eu-blue p-4 text-sm text-white">
          <span className="font-semibold text-eu-yellow">Fun fact · </span>
          {company.funFact}
        </p>
      )}
    </Sheet>
  );
}
