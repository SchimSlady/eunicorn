import type { Company, Dataset } from "@eunicorn/schema";

let datasetPromise: Promise<Dataset> | null = null;

/** The curated dataset, synced from /data into public/data. Fetched once per page load. */
export function loadDataset(): Promise<Dataset> {
  datasetPromise ??= fetch("/data/dataset.json").then((r) => r.json() as Promise<Dataset>);
  return datasetPromise;
}

export function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((i) => [i.id, i]));
}

/** Lowercase, strip accents and punctuation, so "Qonto" matches "qonto" and "Dąbkowski" matches "dabkowski". */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Companies whose name matches the query: prefix matches first, then substring matches. */
export function searchCompanies(companies: Company[], query: string, limit = 6): Company[] {
  const q = normalize(query);
  if (!q) return [];
  const prefix: Company[] = [];
  const contains: Company[] = [];
  for (const c of companies) {
    const name = normalize(c.name);
    if (name.startsWith(q)) prefix.push(c);
    else if (name.includes(q)) contains.push(c);
  }
  return [...prefix, ...contains].slice(0, limit);
}
