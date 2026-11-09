# Founder profiles (pilot)

`data/founders/<companyId>.json` holds the professional background of a company's founders, researched from citable sources only.
Names match `founders` in `data/verified/<id>.json`. Nothing here is loaded into Supabase yet.

```json
{ "id": "spotify", "founders": [ { "name": "Daniel Ek", "note": "optional", "stations": [
  { "kind": "employer|education|founded|exit", "org": "as the source writes it", "orgCanonical": "one spelling per organisation",
    "role": "optional", "years": "optional", "source": "https://…", "quote": "verbatim from the source" } ] } ] }
```

## Rules
- Professional and public facts only, stated by the founder or the press. No age, family or private life.
- Sources: company pages, press and interviews, Wikipedia, speaker bios, university news. Never LinkedIn, Crunchbase, Dealroom, PitchBook, Tracxn, Signalbase, CB Insights, Getlatka.
- Every station has a source URL and a verbatim quote. No evidence means empty `stations` plus a `note`. Never guess.
- `orgCanonical` spellings are merged through `aliases.json` (add a line when two spellings are the same organisation).
- The current company is not a station.

## Tools
`npx tsx data/scripts/founder-groups.ts [min]` lists organisations shared by founders of `min`+ different companies (default 3).

## Database
Migration `20261109120000_founder_stations.sql` adds `organisations` (kind: company, university or other, derived from the stations) and `founder_stations` (one row per station with source URL, quote and `weak_source`). Load with `npm run load:founders` (after `load:verified`; safe to re-run, a company's stations are replaced).

## Known weak spots
Wikipedia is the only source for many stations. Some stations share one quote (e.g. several universities from one bio). Founders without any citable source stay empty (about a quarter).
