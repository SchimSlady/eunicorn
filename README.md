<p align="center">
  <img src="web/public/brand/unicorn.png" alt="" width="96" />
</p>

<h1 align="center">EUnicorn</h1>

<p align="center">
  <strong>Daily games about the European startup ecosystem.</strong><br />
  One try per day. Go build in Europe.
</p>

<p align="center">
  <a href="https://eunicorn.eu"><strong>Play at eunicorn.eu →</strong></a>
</p>

---

## The games

| Game | How it works |
|---|---|
| **Top 10** | Name the ten biggest startups in a list (Europe, a country, a sector or a city) by valuation or money raised. A wrong name costs a life. |
| **Unicorn Grid** | Fill a 3×3 grid: each square needs a startup that fits its row and its column. Lesser-known answers score more. |
| **Higher or Lower** | See one company's valuation or total raised; is the next one higher or lower? One wrong call ends the run. |
| **Impostor** | Five to eight startups share something. Find the one that doesn't belong (on Medium and Hard you find the pattern yourself). |

Coming soon: Who Raised This?, Connections, Pin the HQ and Rank It. Have an idea? Send it from the home page.

Every game runs from a €0 to a €1bn valuation: a perfect game makes you a unicorn. Each mode has Easy, Medium and Hard, hints that cost valuation, a share text, a streak and today's results of all players.

## How it's built

- **Web:** [Next.js](https://nextjs.org) (App Router) and Tailwind CSS on Vercel. No accounts, no cookies, no tracking: progress and streaks stay in the browser.
- **Data:** a curated dataset of European startups and their funding rounds in [Supabase](https://supabase.com). Every fact has a source and is checked before it goes live; puzzles are generated each day from the verified data.
- **Play counter:** anonymous (day, game, level, result; no IP or ID) for today's statistics on the result screen.

```
packages/schema   shared TypeScript types (Company, Round, Puzzle, …)
data              verified company files, scripts to import, check and load them
supabase          database schema and migrations (row-level security: read-only for the public)
web               the Next.js app
```

## Data sources

Funding data comes from the [Tech.eu Funding Explorer](https://tech.eu) (CC BY 4.0), checked against company announcements and press. No data is scraped from PitchBook, Crunchbase or Dealroom. Company names and logos belong to their owners and are used only to identify companies in the games; removal requests go to the contact address below.

Spotted a wrong fact? Write to us and we'll fix it.

## Run it locally

Requires Node 22.6+.

```bash
npm install
npm run dev        # http://localhost:3000
npm run validate   # check the dataset and puzzles
npm run build
```

Without Supabase credentials the app falls back to the sample data in `data/`. With them, set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `web/.env.local`.

The once-a-day lock is off while we test ("Test mode" in the header): games can be replayed and each game gets a new puzzle. Set `NEXT_PUBLIC_DAILY_LOCK=true` to turn it on.

## Working on it

Two people, two areas: data (`data`, `supabase`, `packages/schema`, logos) and web (`web`). See [CLAUDE.md](CLAUDE.md) for ownership and conventions and [PLAN.md](PLAN.md) for the product plan. Work on a branch (`data/<topic>` or `web/<topic>`) and open a pull request.

## Security

Please report security issues privately to **eunicorn.guesser@gmail.com** rather than in a public issue.

## Contact

eunicorn.guesser@gmail.com · Instagram [@play.eunicorn](https://www.instagram.com/play.eunicorn/)
