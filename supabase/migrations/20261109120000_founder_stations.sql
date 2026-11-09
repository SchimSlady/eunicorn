-- Professional background of founders (for games like "which founders came from the same place").
-- One row per station: an employer, a university, a company the founder started earlier, or an exit.
-- Every row carries its source URL and the supporting sentence, like company_sources.
--   employer:  worked there (role in `role`)
--   education: studied or researched there
--   founded:   started this company before the current one
--   exit:      sold this company (buyer in `role` when stated)
-- Rows are tied to (person, company) because a founder can have several companies.
create table public.organisations (
  id public.slug primary key,
  name text not null,
  kind text not null check (kind in ('company', 'university', 'other'))
);

create table public.founder_stations (
  id bigint generated always as identity primary key,
  person_id public.slug not null references public.people on delete cascade,
  company_id public.slug not null references public.companies on delete cascade,
  kind text not null check (kind in ('employer', 'education', 'founded', 'exit')),
  organisation_id public.slug not null references public.organisations on delete cascade,
  org_as_stated text not null,
  role text,
  years text,
  source_url public.source_url not null,
  quote text not null,
  weak_source boolean not null default false,
  unique (person_id, company_id, kind, organisation_id)
);
create index founder_stations_org on public.founder_stations (organisation_id);
create index founder_stations_company on public.founder_stations (company_id);

alter table public.organisations enable row level security;
alter table public.founder_stations enable row level security;
create policy "read" on public.organisations for select to anon, authenticated using (true);
create policy "read verified" on public.founder_stations for select to anon, authenticated
  using (exists (select 1 from public.companies c where c.id = company_id and c.verified));
