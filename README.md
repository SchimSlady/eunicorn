# 🦄 EUnicorn

Daily games about the European startup ecosystem. One try per day. Go build in Europe.

See [PLAN.md](PLAN.md) for the product plan and [CLAUDE.md](CLAUDE.md) for who owns what.

## Setup
```bash
npm install
npm run dev        # http://localhost:3000
npm run validate   # check dataset + puzzles
npm run build
```
Requires Node 22.6+.

The once-a-day lock is **off** by default so you can replay while testing. Turn it on with `NEXT_PUBLIC_DAILY_LOCK=true` in `web/.env.local` (and in Vercel for launch).

## Layout
- `packages/schema`: shared TypeScript types (Company, Round, Puzzle, Hint…)
- `data`: curated dataset, daily puzzles, scripts ([research and pipeline plan](data/RESEARCH.md))
- `web`: Next.js app
