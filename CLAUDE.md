# EUnicorn: agent instructions

Read `PLAN.md` first. Two people work in parallel, each with their own Claude session.

## Ownership (do not edit outside your area)
- **Data session:** `/data/**`, `/supabase/**`, `packages/schema/**`, `web/public/logos/**`
- **Web session:** `/web/**` (except `web/public/logos`)
- `packages/schema/src/index.ts` is the contract between the two areas. Change it only on its own branch/PR, and tell the other person.

## Workflow
- Never commit to `main` directly. Branch as `data/<topic>` or `web/<topic>`, open a PR, the other person merges.
- Before committing data: `npm run validate` must pass.
- Before committing web: `npm run build` must pass.
- Puzzle files: `data/puzzles/<YYYY-MM-DD>/<mode>.json`, where mode ∈ `who-raised-this | unicorn-grid | higher-lower | impostor`.
- Facts need `sources` and `verified: true` before they go into a live puzzle. Seed data is `verified: false`.
- No scraping PitchBook, Crunchbase or Dealroom.

## Conventions
- IDs are kebab-case slugs (`mistral-ai`, `index-ventures`, `nik-storonsky`).
- Money is stored in EUR (`amount_eur`, converted at the ECB rate of the round date); the announced amount and currency go in `amount_original` / `currency`.
- Round dates are months only (`announced_month`, stored as the 1st). Equity rounds only, no lead investors.
- Day boundary: midnight `Europe/Berlin` (see `web/src/lib/daily.ts`).
- **Company logos** (trademark rules): the official logo, unmodified (no recolouring, cropping into shapes or animation beyond the tile), stored in `web/public/logos/<id>.svg|png` with its source in the dataset. Only inside the games to identify a company: never in EUnicorn branding, the share text, OG images or ads. Removal requests to the contact email are honoured promptly.
- Every puzzle has `hints` (`{ text, cost }`), revealed in order. Unicorn Grid also has `cellHints` per cell.
