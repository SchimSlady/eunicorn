# Data foundation: research and plan

Research as of 2026-10-31. Goal: a curated dataset of EU/UK startups that is accurate enough to build daily puzzles from, at a data cost of **≤ €100/month** (the game is free).

**Decision:** the [Tech.eu Funding Explorer](https://funding.tech.eu/) (CC BY 4.0) is the single backbone for companies, rounds and investors. We add a curation layer on top, because a spot check (§4) showed it is reliable for *whether* a round happened and *how much* was raised, but not for date, lead investor, stage or city.

## 1. How much data do the games need?

| Mode | Needs | Sizing |
|---|---|---|
| Who Raised This? | 1 notable round per day with amount, date, lead, co-investors, city, sector, founders | ~365 well-documented rounds/year |
| Unicorn Grid | Dense **overlapping attributes** (country × sector × investor × founded × unicorn) so every cell has 1+ answers and rare answers exist | 300+ companies, with investors on most of them |
| Higher or Lower | One comparable number per company (valuation, total raised, founded, employees) | 150+ companies with a valuation |
| Impostor | Clean categories (unicorn yes/no, European yes/no, sector, city, status, investor) plus some **non-European** decoys | ~30 well-known non-EU companies |

**Target for launch:** about 300 companies and 600–1,000 rounds. That isn't "all of Europe"; it's the 300 companies people actually recognise. Quality beats coverage: one wrong fact in a daily puzzle hurts more than a missing company.

## 2. Source landscape

### ❌ Not usable (licence or cost)
| Source | Why not |
|---|---|
| PitchBook | Terms forbid displaying or distributing content and building a "competitive product". Data feeds are custom "Direct Data" contracts (reportedly $70k+/year) ([terms](https://pitchbook.com/terms-of-use)) |
| Crunchbase (API) | The free Basic API is gone. Public use needs a separate commercial data licence ([data licensing guide](https://about.crunchbase.com/data-licensing-guide)); terms also ban using the data for AI |
| Crunchbase Pro **CSV export** | Pro allows ~1,000 exported rows/month **for internal analysis only**. Publishing aggregate statistics is allowed; providing the data itself to third parties is not ([export docs](https://support.crunchbase.com/hc/en-us/articles/115010610787-Export-to-CSV), [licence](https://data.crunchbase.com/docs/license-agreement)). A game shows row-level facts, so even a one-off export is out |
| Dealroom | API reportedly €20–50k/year. Partnerships exist ("powered by Dealroom" ecosystem maps) but are out of budget for now |
| Any internal VC subscription (e.g. an employer's PitchBook/Dealroom seat) | Licensed for internal use only; using it for a public game breaches the contract |
| Free datasets on Kaggle / Hugging Face | Mostly CC BY-NC (no commercial use) and of unclear provenance |
| Scraping any of the above | Terms of service, plus the **EU sui generis database right**, which protects substantial extraction even of facts |

### How others do it
- **[Unicornle](https://unicornle.io/)** (daily "guess the startup" from 7 clues, the closest existing game): its pool comes from Wikipedia's unicorn list.
- Football guessing games (Futbol11 etc.) don't publish their sources; the ecosystem around them runs on scraped Transfermarkt data, a legal grey area we avoid.
- Media and report sites that show Dealroom/PitchBook/Crunchbase data do so under paid licences or partnerships.

### ✅ Free, legal, and useful

**Backbone: [Tech.eu Funding Explorer](https://funding.tech.eu/)**
- About 52,500 rounds, 38,900 companies, 31,000 investors and 8,900 exits, 2010 to today, European tech incl. UK (plus Türkiye and Israel). Updated hourly.
- **Licence: CC BY 4.0.** Their wording: *"When you show, republish or redistribute figures from this dataset, cite 'Tech.eu Funding Explorer' and link the page or API URL the figure came from."* CC BY also requires us to indicate that we changed the data.
- Free REST API, no key ([docs](https://funding.tech.eu/api-docs), [OpenAPI](https://funding.tech.eu/api/v1/openapi.json)): 120 req/min, 600/hour, 2,000/day per IP. A `/changes` feed syncs additions and removals (not silent edits). MCP server at `/api/mcp`, whose `find_companies` tool is the only name search.
- Each round has amount (EUR at the ECB rate plus native amount and currency), date, stage, investor names, company (name, website, country, city, sectors, description), a source domain and a confidence tier.
- **Not in the data:** lead investor flag, valuation, founders, founding year (usually `null`).

**Company facts (enrichment)**
- **Wikidata** (SPARQL, CC0): `P571` inception, `P159` HQ, `P112` founders, `P452` industry, `P1128` employees, `P856` website, `P17` country.
- **[Wikipedia: List of unicorn startup companies](https://en.wikipedia.org/wiki/List_of_unicorn_startup_companies)** (CC BY-SA, we reuse facts, not text): valuation and unicorn status.
- **Official registries** for ground truth on founding date, HQ and officers: 🇬🇧 Companies House API (free; `SH01` filings give shares allotted × price, which verifies UK round sizes and implied valuations), 🇫🇷 recherche-entreprises.api.gouv.fr (open, no key), GLEIF LEI API. 🇩🇪 has no free official API.

**Verification sources for rounds**
- The source link Tech.eu stores per round (77% of rounds have one).
- Company press releases and blog posts, then tech press (Sifted, TechCrunch, EU-Startups, FinSMEs, Reuters, local press). We cite them; we never reproduce article text.

**Logos**
- **[Brandfetch Logo API](https://brandfetch.com/developers/logo-api)**: free up to roughly 500K requests/month, no attribution required. Fetch once, check by eye, store in `web/public/logos/<id>.svg|png`, so there is no runtime dependency.

## 3. Pipeline

```
 Tech.eu API          filter                  enrich                   verify                 publish
 ───────────          ──────                  ──────                   ──────                 ───────
 companies, rounds → drop debt, grants,    → Wikidata (founded,     → LLM reads source     → human review → Supabase
 investors (raw,      crowdfunding,          founders, HQ)            link: date, lead,      (verified,      → puzzle generators
 /changes sync)       secondaries, €0,     + Wikipedia unicorn list   stage, city, equity?   sources[])      → validate.ts
                      confidence != high   + Brandfetch logo        + 2nd source / SH01
```

1. **Import** (`import-techeu.ts`): pull companies, rounds and investors into raw tables, unchanged, with the Tech.eu id and page URL on every row. Keep it in sync with `/changes`.
2. **Filter:** drop stages `Debt`, `Grant`, `Crowdfunding`, secondary sales, rounds with no amount, and `confidence` other than `high`. Flag rounds by public companies.
3. **Select** the ~300 companies people recognise (Wikipedia unicorns + hand-picked), plus ~30 non-European decoys for Impostor.
4. **Enrich** company identity from Wikidata and registries, valuation from the Wikipedia unicorn list, logos from Brandfetch.
5. **Verify** (`verify-rounds.ts`): an LLM reads the round's source link and a second source, and returns exact date, lead investor(s), stage, whether it was equity, and a quote backing each field. A person approves → `verified: true`, `sources: [...]`. Only verified records appear in live puzzles.
6. **Compute** totals ourselves from verified equity rounds; never use Tech.eu's `totalEur` (it includes debt and grants).
7. **Generate puzzles:** one generator per mode, respecting the Mon→Sun difficulty curve and avoiding repeats within N days. `validate.ts` checks everything.

**Attribution in the app:** "Funding data: Tech.eu Funding Explorer (CC BY 4.0), curated and corrected by EUnicorn", with a link to the Tech.eu page for each round shown.

## 4. Spot check of Tech.eu (2026-10-31)

Method: 20 rounds drawn at random (12 countries, 2015–2026, small and large) and the full round histories of 8 famous companies, each checked against independent sources (not Tech.eu, PitchBook, Crunchbase or Dealroom). Plus structural stats on ~1,180 rounds.

**Random 20:** 5 fully correct, 10 minor issues, 5 wrong in a way players would notice.

| Field | Result |
|---|---|
| Round really happened | 20/20 ✅ |
| Headline amount and currency | 20/20 ✅ (4 are not plain equity: Aster and Picnic include a loan, Auxmoney is a loan commitment, Skeleton is a grant) |
| Date within ±1 month | ~15/20 ⚠️ HMD (+3 mo), Glovo (+4), Geoblink (+2), Depop (+2); older rounds are worse |
| City | ~13/20 ⚠️ Aster is Rome not Bologna, Talent Ticker Cardiff not London, Leeroy Sundsvall not Stockholm, Blok missing |
| Lead investor | ❌ never flagged; missing entirely for Glovo, HMD, Picnic |
| Stage | ❌ "Other" for known Series C rounds (Glovo, Booksy) |

**Famous companies:** amounts for real primary rounds were right (Celonis, Bolt, Personio, Helsing, N26, Klarna). Problems:
- Non-rounds stored as rounds: secondary sales (Klarna "Snoop Dogg" 2019, Klarna "Seed €5.2M Filip Tysander" 2017, Revolut 2024), a bank credit line (Celonis €604M), a government grant (Skeleton €51M), a loan commitment (Auxmoney), a listed company's deal (Energy Vault).
- Duplicates and mislabels: Personio has a phantom €45M round in May 2022, and its Jan 2020 Series C is listed as an "Oct 2019 Series B".
- Gaps: N26 before 2018, Bolt's 2018 $175M round led by Daimler, Revolut's 2025 secondary at $75B.
- Company totals are inflated by debt and grants (Northvolt: €13.9B).

**Structural stats (~1,180 rounds; ≥ €20M in brackets):** stage "Other" 41% (38%), no investors 13% (12%), amount missing 6% (0%), day-of-month = 01 (likely month-only) 24% (31%), confidence high 73% (77%), broken characters in names or cities ("D√ºsseldorf") 2%.

**Conclusion:** trust Tech.eu for existence, amount, currency, year and "who participated". Verify date, lead, stage, city and equity-vs-debt before anything goes live.

## 5. Schema additions this implies
- `Company.externalIds?: { techeu?: string; wikidata?: string; gbCompanyNumber?: string; frSiren?: string }`, for re-syncing.
- `Company.aliases?: string[]` ("Mistral" / "Mistral AI") for **answer matching** in the guessing games.
- `Round.sourceQuotes?: Record<string, string>`: the sentence backing each field, which speeds up review.
- `Round.kind?: "equity" | "debt" | "grant" | "secondary"`, so filtered-out events stay visible in review.
- An attribution URL per round (the Tech.eu page) for the CC BY credit.

(These change `packages/schema`, so they go through a PR you both review.)

## 6. Legal notes (to check later, as agreed)
- Facts such as "X raised €Y led by Z" aren't copyrightable. We store facts plus source URLs, never article text.
- Tech.eu data is CC BY 4.0: attribute and link per figure, and say that we modified it.
- Avoid substantial extraction from any **single** restricted database (EU database right). Tech.eu grants a licence, so this doesn't apply to it.
- Logos: trademarks used to identify the company (nominative use), with a disclaimer like Futbol11's. Keep a takedown contact.
- Wikipedia-derived facts: CC BY-SA. Add attribution in an "About / Data" page.

## 7. Next steps for the data session
1. Agree with the web side: does the web read Supabase directly, or does Supabase export JSON?
2. Supabase schema: raw Tech.eu tables, curated tables, verification status.
3. `import-techeu.ts` → raw tables; filter rules from §3.
4. Select the ~300 launch companies; enrich from Wikidata + Wikipedia unicorn list; logos for the first 100.
5. `verify-rounds.ts` prototype on 20 rounds; measure against the hand-checked rounds in §4.
6. Review flow, then 100 verified companies → enough for the first 2 weeks of Impostor and Higher or Lower.
