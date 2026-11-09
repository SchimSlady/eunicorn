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

## Proposal for the database (not applied, for Pablo)
Two tables next to `people`/`company_founders`; the loader would read `data/founders/*.json`:

```sql
create table public.organisations (
  id text primary key,            -- slug of orgCanonical
  name text not null,
  kind text check (kind in ('company','university','other'))
);
create table public.founder_stations (
  person_id text not null references public.people(id) on delete cascade,
  company_id text not null references public.companies(id) on delete cascade,
  kind text not null check (kind in ('employer','education','founded','exit')),
  organisation_id text not null references public.organisations(id),
  role text, years text, source_url text not null, quote text not null,
  primary key (person_id, company_id, kind, organisation_id)
);
alter table public.organisations enable row level security;
alter table public.founder_stations enable row level security;
-- read policies like company_founders: only for verified companies
```

Open questions: do we want `kind` on organisations (needed to tell universities from employers in a game), and should `check-quotes` also cover these files?

## Known weak spots
Wikipedia is the only source for many stations. Some stations share one quote (e.g. several universities from one bio). Founders without any citable source stay empty (about a quarter).
