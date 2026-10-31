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

The once-a-day lock is **off** while we test ("Test mode" in the header): games can be replayed and every new game gets a different generated puzzle. Turn it on for launch with `NEXT_PUBLIC_DAILY_LOCK=true` (Vercel); then a finished game stays finished, the streak counts and the puzzle is the same for everyone all day.

## Layout
- `packages/schema`: shared TypeScript types (Company, Round, Puzzle, Hint…)
- `data`: curated dataset, daily puzzles, scripts ([research and pipeline plan](data/RESEARCH.md))
- `web`: Next.js app
