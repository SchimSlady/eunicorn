# Data foundation: research and plan

Research as of 2026-10-31. Goal: a curated dataset of EU/UK startups that is accurate enough to build daily puzzles from, without licensing a commercial database.

## 1. How much data do the games need?

| Mode | Needs | Sizing |
|---|---|---|
| Who Raised This? | 1 notable round per day with amount, date, lead, co-investors, city, sector, founders | ~365 well-documented rounds/year |
| Unicorn Grid | Dense **overlapping attributes** (country × sector × investor × founded × unicorn) so every cell has 1+ answers and rare answers exist | 300+ companies, with investors on most of them |
| Higher or Lower | One comparable number per company (valuation, total raised, founded, employees) | 150+ companies with a valuation |
| Impostor | Clean categories (unicorn yes/no, European yes/no, sector, city, status, investor) plus some **non-European** decoys | ~30 well-known non-EU companies |

**Target for launch:** about 300 companies and 600–1,000 rounds. That isn't "all of Europe"; it's the 300 companies people actually recognise. Quality beats coverage: one wrong fact in a daily puzzle hurts more than a missing company.

## 2. Source landscape

### ❌ Not usable
| Source | Why not |
|---|---|
| PitchBook | No public API; enterprise licence; terms forbid scraping and republishing |
| Crunchbase | The free API was dropped in 2025 (Basic now ~$49/month, Pro ~$99/month); republishing is restricted. The old free *Open Data Map* covered only basic org fields and required attribution ([Crunchbase ODM docs](https://data.crunchbase.com/docs/open-data-map-api-v40), [dev.to on the 2025 change](https://dev.to/agenthustler/crunchbase-api-in-2026-free-tier-gone-what-startup-data-hunters-do-now-1177)) |
| Scraping any of the above | Terms of service, plus the **EU sui generis database right**, which protects substantial extraction even of facts |

### ✅ Free, legal, and useful

**Company list (seed)**
- **[Wikipedia: List of unicorn startup companies](https://en.wikipedia.org/wiki/List_of_unicorn_startup_companies)**: names, valuation, country, sector. Licence CC BY-SA; we reuse facts, not text. The best starting list.
- Public unicorn trackers to cross-check the list, but **not to copy wholesale**: [CB Insights European unicorns](https://www.cbinsights.com/research/european-unicorns-valuation), Crunchbase's European unicorn board, Failory. Europe has roughly 217–250 unicorns depending on the definition, with the UK at about 73.
- Atomico *State of European Tech* (yearly) for headline numbers and fun facts.

**Company facts**
- **Wikidata** (SPARQL, CC0, no restrictions). Useful properties: `P571` inception, `P159` HQ, `P112` founders, `P452` industry, `P1128` employees, `P856` website, `P17` country. There is **no reliable funding property**, so Wikidata is for identity facts, not rounds.
- **Official registries** for ground truth on founding date, legal HQ and officers:
  - 🇬🇧 **Companies House API**: free with an API key, generous rate limit. **The highlight:** `SH01` filings (allotment of shares) list the number of shares allotted **and the price per share**. Shares × price = the **amount raised**, and price × total shares = the **implied post-money valuation**. That turns press-release numbers for UK companies into verifiable official records. Watch for the lag between allotment and filing date, and for `RP04SH01` corrections.
  - 🇫🇷 **recherche-entreprises.api.gouv.fr**: official, open, no key. Pappers has a free tier for filings.
  - 🇩🇪 **No official free API.** OffeneRegister.de is a 2019 dump that is stale since 2018. Use only for founding date and seat, or rely on press and Wikidata.
  - Everywhere: **GLEIF LEI API** (free) for legal names and addresses of larger companies.

**Funding rounds** (the hard part: no clean open source exists)
- **Primary:** company press releases and blog posts ("We raised €X Series B led by Y").
- **Secondary:** tech press. Sifted, Tech.eu, EU-Startups (has a weekly funding round-up), TechCrunch, Handelsblatt/Gründerszene, Maddyness (FR), Breakit (Nordics). Use them to **find and cross-check** rounds and cite them as sources. Don't reproduce their articles.
- **Investor portfolio pages** (Index, Atomico, Balderton, Creandum, Lakestar, HV…): public lists of which companies each fund backs. Ideal for the Grid's "backed by X" criterion.
- **Companies House SH01** to verify UK rounds (see above).

**Logos**
- **[Brandfetch Logo API](https://brandfetch.com/developers/logo-api)**: free up to roughly 500K requests a month, **no attribution required**, needs a client ID. ← recommended
- [Logo.dev](https://www.logo.dev/pricing): similar free tier, but commercial use requires a visible link back unless you pay (~$280+/year).
- Clearbit's logo API is gone. Wikimedia Commons only hosts logos that are free or below the threshold of originality, so coverage is patchy.
- **Recommendation:** fetch each logo once with Brandfetch, check it by eye, and store it in the repo (`web/public/logos/<id>.svg|png`). Then the game has no runtime dependency on a third party and logos never break mid-puzzle.

### 🤝 Worth asking (later)
- **Dealroom Ecosystem Partnership Program**: free database access for ecosystem stakeholders. API otherwise custom-priced (third-party estimates: €20–50K/year). A European, "build in Europe" mission is a good fit for a pitch, ideally once there are real players. ([program](https://content.dealroom.co/ecosystem-partner-program))

## 3. Pipeline

```
 seed list            enrich identity           find rounds              verify                 publish
 ───────────          ───────────────           ───────────              ──────                 ───────
 Wikipedia unicorns → Wikidata (SPARQL)      → press releases + news → LLM extracts JSON  → human review → dataset.json
 + hand-picked       + registries (CH, FR)     (search per company)    + cross-check 2 srcs   (verified,      → puzzle generators
   rising stars      + Brandfetch logo                                + CH SH01 for UK        sources[])      → validate.ts
```

1. **Seed list** (`data/scripts/seed-list.ts`): pull European rows from the Wikipedia unicorn list, add ~50 hand-picked well-known non-unicorns and recent stars, then de-duplicate by domain.
2. **Enrich identity** (`enrich-wikidata.ts`, `enrich-registry.ts`): Wikidata by name/website → founded, HQ, founders, industry, employees. Companies House for UK companies (company number, incorporation date, SH01 list).
3. **Find rounds** (`find-rounds.ts`): for each company, search "<company> raises", "<company> Series", and collect candidate article and press-release URLs.
4. **Extract** (`extract-rounds.ts`): an LLM (Claude via the API, a small fast model is enough) reads each source and returns strict JSON matching the `Round` schema: stage, date, amount plus currency, lead and other investors, valuation if stated, and the **quote that supports each field**. Store the raw output in `data/staging/` (not in `dataset.json`).
5. **Reconcile:** merge candidates for the same round from different sources. Require **two independent sources**, or one official one (company press release or SH01). Conflicts go to review.
6. **Review** (small local admin page or a CSV): a person approves → `verified: true`, `sources: [...]`. Only verified records can appear in live puzzles.
7. **Logos** (`fetch-logos.ts`): Brandfetch once → `web/public/logos/` → check by eye.
8. **Generate puzzles:** one generator per mode that picks from verified data, respects the Mon→Sun difficulty curve, avoids repeating a company within N days, and writes `data/puzzles/<date>/<mode>.json`. `validate.ts` checks everything.

**Effort estimate:** about 300 companies × ~3 rounds × ~2 sources means roughly 2,000 LLM extractions, a few euros in API cost. The real cost is review time. At ~1 minute per round, the first 1,000 rounds take ~15–20 hours. Splitting review between the two of you, a few evenings gets you to launch.

## 4. Schema additions this implies
- `Company.registryIds?: { gbCompanyNumber?: string; frSiren?: string; wikidata?: string }`, for re-running enrichment.
- `Company.aliases?: string[]` ("Mistral" / "Mistral AI") for **answer matching** in the guessing games.
- `Round.sourceQuotes?: Record<string, string>`: the sentence backing each field, which speeds up review.
- `Investor.portfolioUrl?` for the portfolio-page scraper.

(These change `packages/schema`, so they go through a PR you both review.)

## 5. Legal notes (to check later, as agreed)
- Facts such as "X raised €Y led by Z" aren't copyrightable. We store facts plus source URLs, never article text.
- Avoid substantial extraction from any **single** database (EU database right). Many sources plus our own curation = our own database.
- Logos: trademarks used to identify the company (nominative use), with a disclaimer like Futbol11's. Keep a takedown contact.
- Wikipedia-derived lists: CC BY-SA. Add attribution in an "About / Data" page.

## 6. First steps for the data session
1. `seed-list.ts` → ~300 candidate companies in `data/staging/companies.json`
2. `enrich-wikidata.ts` → founded, HQ, founders, industry
3. `fetch-logos.ts` with Brandfetch for the first 100
4. `extract-rounds.ts` prototype on 10 companies, then measure accuracy against hand-checked rounds
5. Review flow, then 100 verified companies → enough for the first 2 weeks of Impostor and Higher or Lower
