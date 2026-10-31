-- Launch shortlist: European companies with equity funding, ranked by how well known they are.
-- Filled by data/scripts/select-candidates.ts. Review it in the Supabase table editor by setting
-- `include`; a later script copies included rows into public.companies (unverified).

create table staging.launch_candidates (
  techeu_id uuid primary key,
  name text not null,
  country char(2) not null references public.countries,
  city text,
  website text,
  sectors text[] not null default '{}',
  equity_eur numeric not null, -- sum of Tech.eu rounds we classify as equity
  equity_rounds integer not null,
  last_round_month date,
  wikidata_id text,
  -- Number of Wikipedia language editions with an article: our proxy for fame.
  -- null = not looked up yet, 0 = no Wikidata item found.
  wikipedia_languages integer,
  suggested_difficulty smallint check (suggested_difficulty between 1 and 5),
  include boolean, -- your decision; null = undecided
  note text,
  updated_at timestamptz not null default now()
);

create view staging.launch_ranking as
select row_number() over (order by wikipedia_languages desc nulls last, equity_eur desc) as rank, *
from staging.launch_candidates;
