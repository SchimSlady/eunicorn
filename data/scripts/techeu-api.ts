// Rate-limited client for the Tech.eu Funding Explorer API (CC BY 4.0, no key).
// Tech.eu allows 120 requests/minute, 600/hour and 2,000/day per IP. We stay under the hourly limit.
const API = "https://funding.tech.eu/api/v1";
const MIN_INTERVAL_MS = 6_500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let lastRequest = 0;

export async function techeuGet<T = any>(path: string, params: Record<string, string | undefined> = {}): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => e[1] != null));
  for (let attempt = 1; ; attempt++) {
    await sleep(Math.max(0, lastRequest + MIN_INTERVAL_MS - Date.now()));
    lastRequest = Date.now();
    try {
      const res = await fetch(`${API}${path}${qs.size ? `?${qs}` : ""}`);
      if (res.status === 429) {
        const wait = Number(res.headers.get("retry-after") ?? 60);
        console.log(`  rate limited, waiting ${wait}s`);
        await sleep(wait * 1000);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as T;
    } catch (e) {
      if (attempt >= 5) throw e;
      console.log(`  ${(e as Error).message}, retry ${attempt}/4`);
      await sleep(attempt * 10_000);
    }
  }
}
