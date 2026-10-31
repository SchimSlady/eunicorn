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

## Layout
- `packages/schema`: shared TypeScript types (Company, Round, Puzzle, Hint…)
- `data`: curated dataset, daily puzzles, scripts
- `web`: Next.js app
