# EUnicorn: Plan

Daily games about the **European + UK startup ecosystem**, inspired by Futbol11 (lots of small daily games built on one shared dataset).
Message: **Go build in Europe.**

## Audience
The whole startup ecosystem (founders, VCs, operators) **and students**.
Difficulty rises over the week: Monday uses very well-known companies (Revolut, Spotify, Mistral), Sunday is for insiders.
Each company has a `difficulty` from 1 to 5 that drives this curve.

## Core loop
- Each mode can be played **once per day**. Puzzles reset at **00:00 CET** (`Europe/Berlin`).
- **No accounts** (like GeoRankle). Results, streaks and stats are stored on the device in `localStorage`.
- **Hints instead of giving up.** Unlike Futbol11, where you can only quit when you're stuck, every puzzle ships hints. Each hint costs points; the share card shows hints used as 💡.
- After each game: a share card (emoji grid, "EUnicorn #12") plus a **"Built in Europe" card** (fun fact, city, careers link).
- Logos and names are shown. Legal check later.

## MVP modes
| Mode | Gameplay | Hints |
|---|---|---|
| **Who Raised This?** | Clues about one funding round appear one at a time (amount → year → sector → city → lead → investors → founders → blurred logo). Guess the company; fewer clues = more points. | Word count, first letter, a cryptic clue |
| **Unicorn Grid** | 3×3: each cell needs a company that matches its row and column (e.g. 🇩🇪 × AI). Rare answers score more. | Per cell: a description, then the first letter |
| **Higher or Lower** | 5–10 fixed pairs per day (same for everyone): which is valued higher, or raised more? | A fact about one company in a pair |
| **Impostor** | 5 logos and a prompt ("All European unicorns…"). Find the odd one out. Categories rotate: unicorn, European, industry, city, investor, exited. | Remove a wrong option, then a hint about the impostor |

Later: Connections, Mafia Link (Skype/Rocket/Revolut alumni), Top 10, Pin the HQ, a GeoRankle-style ranking mode.

## Data
Our own curated dataset, **no scraping of PitchBook, Crunchbase or Dealroom**: their terms forbid it, and the EU database right protects their databases.
Target: 300–500 EU/UK companies plus their notable rounds.

Sources: UK Companies House API (free), Wikidata (CC0), press releases and news (Sifted, EU-Startups, TechCrunch), extracted with an LLM pipeline, **then reviewed by a person** (`verified: true` plus `sources`).
Logos are stored in `web/public/logos/<id>.svg|png`, keyed by `company.domain`.

## Architecture
```
packages/schema   TypeScript types: the contract between data and web
data/seed         dataset.json (companies, rounds, investors, people)
data/puzzles      <date>/<mode>.json, pre-generated and checked by a person
data/scripts      validate.ts (npm run validate), later: ingest + generate
web               Next.js 15 + Tailwind, PWA, deployed on Vercel
```
Puzzles are static JSON. `web` copies `/data` into `public/data` on dev and build.

## Split
- **Data owner:** `/data` + `packages/schema`. Ingestion, curation, logos, puzzle generators, a schedule of ~60 days ahead.
- **Web owner:** `/web`. Game UIs for the 4 modes, hints UX, daily lock, share and end cards, PWA, Vercel deploy.
- Schema changes go through a PR that both of you review.

## Milestones
1. **Week 1:** the web owner builds all 4 modes against fixture puzzles; the data owner gets to 100 verified companies with logos and builds the generator for Impostor + Higher or Lower.
2. **Week 2:** generators for Grid + Who Raised This, a 30-day schedule, share cards, deploy to a preview URL.
3. **Week 3:** soft launch with friends, students and the startup community; tune difficulty.

## Open
- Domain (eunicorn.com / .eu / .app?)
- Branding and logo
- Legal check: logos, trademark "EUnicorn"
