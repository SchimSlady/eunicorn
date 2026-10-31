import type { Company, HigherLowerMetric } from "@eunicorn/schema";

/** "$75B", "$2.1B", "$850M" */
export function formatUsd(n: number): string {
  if (n >= 1e9) return `$${trim(n / 1e9)}B`;
  if (n >= 1e6) return `$${trim(n / 1e6)}M`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function trim(n: number): string {
  return n >= 10 ? String(Math.round(n)) : n.toFixed(1).replace(/\.0$/, "");
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
  if (metric === "employees") return v.toLocaleString("en-US");
  return formatUsd(v);
}
