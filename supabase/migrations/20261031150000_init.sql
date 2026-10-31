-- EUnicorn schema v1.
--
-- Two layers:
--   staging.*  Raw Tech.eu Funding Explorer imports. Not exposed through the API.
--   public.*   Curated data. The web reads it with the anon key; RLS only shows verified rows
--              and approved puzzles up to today (Europe/Berlin).
-- All writes go through the service role (import and review scripts), so there are no write policies.
-- Enums mirror packages/schema/src/index.ts. Scope: European companies only (see public.countries).

create schema if not exists staging;

-- ---------- types ----------

create type public.sector as enum (
  'fintech', 'ai', 'mobility', 'climate', 'health', 'defense',
  'consumer', 'saas', 'gaming', 'travel', 'crypto', 'quick-commerce'
);
create type public.company_status as enum ('private', 'public', 'acquired', 'defunct');
-- Equity rounds only. Tech.eu also lists debt, grants and secondary sales; the import drops them.
-- Its "Growth/Late" and "Series D+" labels are mapped to a series letter, never stored as-is.
create type public.round_stage as enum (
  'pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'series-d',
  'series-e', 'series-f+'
);
create type public.game_mode as enum ('who-raised-this', 'unicorn-grid', 'higher-lower', 'impostor');
create type public.puzzle_status as enum ('draft', 'approved');

create domain public.slug as text check (value ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
create domain public.source_url as text check (value ~ '^https?://');

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------- reference ----------

-- EU 27 + UK, EEA (NO, IS, LI) and CH. Extend here, not with a check constraint.
create table public.countries (
  code char(2) primary key check (code ~ '^[A-Z]{2}$'),
  name text not null,
  techeu_name text unique -- Tech.eu uses names ("UK", "Germany"), not ISO codes
);
insert into public.countries (code, name, techeu_name) values
  ('AT', 'Austria', 'Austria'), ('BE', 'Belgium', 'Belgium'), ('BG', 'Bulgaria', 'Bulgaria'),
  ('HR', 'Croatia', 'Croatia'), ('CY', 'Cyprus', 'Cyprus'), ('CZ', 'Czechia', 'Czech Republic'),
  ('DK', 'Denmark', 'Denmark'), ('EE', 'Estonia', 'Estonia'), ('FI', 'Finland', 'Finland'),
  ('FR', 'France', 'France'), ('DE', 'Germany', 'Germany'), ('GR', 'Greece', 'Greece'),
  ('HU', 'Hungary', 'Hungary'), ('IE', 'Ireland', 'Ireland'), ('IT', 'Italy', 'Italy'),
  ('LV', 'Latvia', 'Latvia'), ('LT', 'Lithuania', 'Lithuania'), ('LU', 'Luxembourg', 'Luxembourg'),
  ('MT', 'Malta', 'Malta'), ('NL', 'Netherlands', 'Netherlands'), ('PL', 'Poland', 'Poland'),
  ('PT', 'Portugal', 'Portugal'), ('RO', 'Romania', 'Romania'), ('SK', 'Slovakia', 'Slovakia'),
  ('SI', 'Slovenia', 'Slovenia'), ('ES', 'Spain', 'Spain'), ('SE', 'Sweden', 'Sweden'),
  ('GB', 'United Kingdom', 'UK'), ('NO', 'Norway', 'Norway'), ('IS', 'Iceland', 'Iceland'),
  ('LI', 'Liechtenstein', 'Liechtenstein'), ('CH', 'Switzerland', 'Switzerland');

create table public.people (
  id public.slug primary key,
  name text not null,
  wikidata_id text unique
);

create table public.investors (
  id public.slug primary key,
  name text not null,
  domain text,
  techeu_name text unique -- exact name in Tech.eu investor lists, for matching on re-import
);

-- ---------- companies ----------

create table public.companies (
  id public.slug primary key,
  name text not null,
  aliases text[] not null default '{}', -- extra accepted answers, e.g. {"Mistral"}
  domain text not null unique,
  logo text, -- path under web/public/logos, e.g. /logos/revolut.svg
  country char(2) not null references public.countries,
  city text,
  founded smallint check (founded between 1900 and 2100),
  sectors public.sector[] not null default '{}',
  status public.company_status not null default 'private',
  unicorn boolean not null default false, -- ever valued at >= $1B
  last_valuation_usd bigint check (last_valuation_usd > 0),
  employees integer check (employees > 0),
  careers_url text,
  fun_fact text,
  difficulty smallint not null default 3 check (difficulty between 1 and 5),
  techeu_id uuid unique,
  wikidata_id text unique,
  verified boolean not null default false,
  verified_at timestamptz,
  verified_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint verified_company_is_complete check (
    not verified or (city is not null and founded is not null and cardinality(sectors) > 0)
  )
);
create trigger companies_touch before update on public.companies
  for each row execute function public.touch_updated_at();

create table public.company_founders (
  company_id public.slug not null references public.companies on delete cascade,
  person_id public.slug not null references public.people on delete cascade,
  primary key (company_id, person_id)
);

-- One row per fact we checked: which field, where it is stated, and the supporting sentence.
create table public.company_sources (
  id bigint generated always as identity primary key,
  company_id public.slug not null references public.companies on delete cascade,
  field text not null check (field in (
    'city', 'founded', 'founders', 'sectors', 'status', 'unicorn', 'valuation', 'employees', 'fun_fact'
  )),
  url public.source_url not null,
  quote text,
  unique (company_id, field, url)
);

-- ---------- rounds ----------

create table public.rounds (
  id public.slug primary key, -- "<company-id>-<stage>-<year>"
  company_id public.slug not null references public.companies on delete cascade,
  stage public.round_stage,
  -- Month of the announcement, stored as its first day (2023-12-01 = December 2023). No exact days.
  announced_month date check (extract(day from announced_month) = 1),
  amount_usd bigint check (amount_usd > 0),
  amount_original numeric(18, 2) check (amount_original > 0), -- as announced
  currency char(3) check (currency ~ '^[A-Z]{3}$'),
  post_money_valuation_usd bigint check (post_money_valuation_usd > 0),
  techeu_id uuid unique,
  attribution_url text, -- Tech.eu deal page, required by CC BY when we show the figure
  verified boolean not null default false,
  verified_at timestamptz,
  verified_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint verified_round_is_complete check (
    not verified or (stage is not null and announced_month is not null and amount_usd is not null)
  )
);
create index rounds_company_idx on public.rounds (company_id);
create trigger rounds_touch before update on public.rounds
  for each row execute function public.touch_updated_at();

create table public.round_investors (
  round_id public.slug not null references public.rounds on delete cascade,
  investor_id public.slug not null references public.investors on delete cascade,
  primary key (round_id, investor_id)
);
create index round_investors_investor_idx on public.round_investors (investor_id);

create table public.round_sources (
  id bigint generated always as identity primary key,
  round_id public.slug not null references public.rounds on delete cascade,
  field text not null check (field in ('amount', 'month', 'stage', 'investors', 'valuation')),
  url public.source_url not null,
  quote text,
  unique (round_id, field, url)
);

-- A round can only be verified once amount and month are each backed by a source.
create function public.check_round_sources() returns trigger language plpgsql as $$
declare missing text[];
begin
  if new.verified and not coalesce(old.verified, false) then
    select array_agg(f) into missing
    from unnest(array['amount', 'month']) f
    where not exists (select 1 from public.round_sources s where s.round_id = new.id and s.field = f);
    if missing is not null then
      raise exception 'round % cannot be verified: no source for %', new.id, array_to_string(missing, ', ');
    end if;
    new.verified_at := coalesce(new.verified_at, now());
  end if;
  return new;
end $$;
create trigger rounds_require_sources before insert or update of verified on public.rounds
  for each row execute function public.check_round_sources();

-- Totals are computed from verified rounds (Tech.eu's totals include debt and grants).
create view public.company_totals with (security_invoker = true) as
select company_id,
       sum(amount_usd) as total_raised_usd,
       count(*) as rounds_count,
       max(announced_month) as last_round_month
from public.rounds
where verified
group by company_id;

-- ---------- puzzles ----------

create table public.puzzles (
  id bigint generated always as identity primary key,
  date date not null,
  mode public.game_mode not null,
  number integer not null check (number > 0), -- "EUnicorn #12"
  payload jsonb not null, -- the Puzzle object from packages/schema
  status public.puzzle_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (date, mode),
  check (payload ->> 'mode' = mode::text and payload ->> 'date' = date::text)
);
create trigger puzzles_touch before update on public.puzzles
  for each row execute function public.touch_updated_at();

-- ---------- staging (raw Tech.eu, service role only) ----------

create table staging.techeu_companies (
  id uuid primary key,
  name text not null,
  country text,
  payload jsonb not null, -- /api/v1/companies/{id}, unchanged
  fetched_at timestamptz not null default now()
);

create table staging.techeu_rounds (
  id uuid primary key,
  company_id uuid not null,
  date date,
  stage text,
  amount_eur numeric,
  confidence text,
  payload jsonb not null, -- one item of /api/v1/rounds, unchanged
  fetched_at timestamptz not null default now()
);
create index techeu_rounds_company_idx on staging.techeu_rounds (company_id);

create table staging.sync_state (
  key text primary key, -- e.g. 'techeu.rounds.changes_cursor'
  value text not null,
  updated_at timestamptz not null default now()
);

revoke all on schema staging from public;

-- ---------- row level security (web = anon, read-only) ----------

alter table public.countries enable row level security;
alter table public.people enable row level security;
alter table public.investors enable row level security;
alter table public.companies enable row level security;
alter table public.company_founders enable row level security;
alter table public.company_sources enable row level security;
alter table public.rounds enable row level security;
alter table public.round_investors enable row level security;
alter table public.round_sources enable row level security;
alter table public.puzzles enable row level security;

create policy "read" on public.countries for select to anon, authenticated using (true);
create policy "read" on public.people for select to anon, authenticated using (true);
create policy "read" on public.investors for select to anon, authenticated using (true);
create policy "read verified" on public.companies for select to anon, authenticated using (verified);
create policy "read verified" on public.company_founders for select to anon, authenticated
  using (exists (select 1 from public.companies c where c.id = company_id and c.verified));
create policy "read verified" on public.company_sources for select to anon, authenticated
  using (exists (select 1 from public.companies c where c.id = company_id and c.verified));
create policy "read verified" on public.rounds for select to anon, authenticated
  using (verified and exists (select 1 from public.companies c where c.id = company_id and c.verified));
create policy "read verified" on public.round_investors for select to anon, authenticated
  using (exists (select 1 from public.rounds r where r.id = round_id and r.verified));
create policy "read verified" on public.round_sources for select to anon, authenticated
  using (exists (select 1 from public.rounds r where r.id = round_id and r.verified));
-- Day boundary: midnight Europe/Berlin (see web/src/lib/daily.ts). Future puzzles stay hidden.
create policy "read released" on public.puzzles for select to anon, authenticated
  using (status = 'approved' and date <= (now() at time zone 'Europe/Berlin')::date);
