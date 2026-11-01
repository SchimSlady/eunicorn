/** Supabase answers at most this many rows per request (max_rows in its API settings). */
export const PAGE_SIZE = 1000;

/**
 * Reads a whole table, page by page. Without this a table with more than 1,000 rows silently
 * arrives cut off. The caller's query must have a stable `order=`, or pages could overlap.
 * null as soon as one page fails, so a half-read table is never used.
 */
export async function fetchAll<T>(page: (offset: number, limit: number) => Promise<T[] | null>): Promise<T[] | null> {
  const all: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const rows = await page(offset, PAGE_SIZE);
    if (!rows) return null;
    all.push(...rows);
    if (rows.length < PAGE_SIZE) return all;
  }
}
