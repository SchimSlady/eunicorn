import type { Company, HigherLowerMetric } from "@eunicorn/schema";

/**
 * European formats everywhere: euros, "bn"/"m", day before month, 24-hour clock,
 * thousands grouped with a thin space (SI style, so it never clashes with the decimal point).
 */

/**
 * The dataset still stores most amounts in USD (often the only figure a source gives).
 * Display converts them with this one rate. Approximate: update it, or better, have the
 * data side store EUR natively and drop the conversion.
 */
export const USD_TO_EUR = 0.86;

/** "€64.5bn", "€1.7bn", "€385m" */
export function formatEur(eur: number): string {
  if (eur >= 1e9) return `€${trim(eur / 1e9)}bn`;
  if (eur >= 1e6) return `€${trim(eur / 1e6)}m`;
  return `€${groupThousands(Math.round(eur))}`;
}

export function formatUsdAsEur(usd: number): string {
  return formatEur(usd * USD_TO_EUR);
}

/** "1 200", "12 500" */
export function groupThousands(n: number): string {
  return n.toLocaleString("en-GB").replace(/,/g, " ");
}

/** "31.10.2026" */
export function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

/** One decimal below 100 ("€11.8bn" must not round to "€12bn" next to a real €12bn), none above. */
function trim(n: number): string {
  return n >= 100 ? String(Math.round(n)) : n.toFixed(1).replace(/\.0$/, "");
}

export const METRIC_META: Record<HigherLowerMetric, { question: string; label: string }> = {
  lastValuationUsd: { question: "Which is valued higher?", label: "Valuation" },
  totalRaisedUsd: { question: "Which raised more?", label: "Total raised" },
  founded: { question: "Which was founded later?", label: "Founded" },
  employees: { question: "Which has more employees?", label: "Employees" },
};

export function formatMetric(c: Company, metric: HigherLowerMetric): string {
  const v = c[metric];
  if (v == null) return "–";
  if (metric === "founded") return String(v);
  if (metric === "employees") return groupThousands(v);
  return formatUsdAsEur(v);
}

/** Display name of a sector id ("defense" -> "Defence"). */
const SECTOR_LABEL: Record<string, string> = {
  fintech: "Fintech",
  ai: "AI",
  mobility: "Mobility",
  climate: "Climate",
  health: "Health",
  defense: "Defence",
  consumer: "Consumer",
  saas: "SaaS",
  gaming: "Gaming",
  travel: "Travel",
  crypto: "Crypto",
  "quick-commerce": "Quick commerce",
  space: "Space",
  semiconductors: "Semiconductors",
  biotech: "Biotech",
  robotics: "Robotics",
  quantum: "Quantum",
  cybersecurity: "Cybersecurity",
  edtech: "Edtech",
  proptech: "Proptech",
  telecom: "Telecom",
  hrtech: "HR tech",
  legaltech: "Legal tech",
  foodtech: "Food tech",
  logistics: "Logistics",
  ecommerce: "E-commerce",
  devtools: "Dev tools",
};

export function sectorLabel(s: string): string {
  return SECTOR_LABEL[s] ?? s;
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

/** A country's name as the games say it: "UK" and "Netherlands", never "the UK". */
export function countryName(code: string): string {
  if (code === "GB") return "UK";
  return regionNames.of(code) ?? code;
}
