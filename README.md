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

The once-a-day lock is **on** by default: a finished game stays finished, a reload resumes it, and the streak counts. To replay while testing, set `NEXT_PUBLIC_DAILY_LOCK=false` in `web/.env.local` (or in a Vercel Preview environment).

## Layout
- `packages/schema`: shared TypeScript types (Company, Round, Puzzle, Hint…)
- `data`: curated dataset, daily puzzles, scripts ([research and pipeline plan](data/RESEARCH.md))
- `web`: Next.js app
