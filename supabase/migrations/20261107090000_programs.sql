-- Programs a company went through: accelerators (Y Combinator, Antler), fellowships (EWOR) and
-- university programs (CDTM, meaning the company was founded by alumni). For games ("the most valuable
-- YC startups", a "CDTM startup" grid heading) and the end card ("Went through Y Combinator").
-- The list of programs lives in data/programs.json; data/scripts/load-verified.ts upserts it, so a new
-- program needs no migration. Every company_programs row needs a company_sources line (field 'programs').

create type public.program_kind as enum ('accelerator', 'fellowship', 'university');

create table public.programs (
  id public.slug primary key,      -- 'y-combinator', 'ewor', 'cdtm', 'antler'
  name text not null,              -- 'Y Combinator'
  kind public.program_kind not null,
  url text                         -- the program's own site
);

create table public.company_programs (
  company_id public.slug not null references public.companies on delete cascade,
  program_id public.slug not null references public.programs on delete cascade,
  batch text,                      -- as the program names it ('W21', '2023'); null when unknown
  primary key (company_id, program_id)
);
create index company_programs_program_idx on public.company_programs (program_id);

alter table public.company_sources drop constraint company_sources_field_check;
alter table public.company_sources add constraint company_sources_field_check check (field in (
  'city', 'founded', 'founders', 'sectors', 'status', 'unicorn', 'valuation', 'employees', 'fun_fact', 'logo', 'programs'
));

alter table public.programs enable row level security;
alter table public.company_programs enable row level security;
create policy "read" on public.programs for select to anon, authenticated using (true);
create policy "read verified" on public.company_programs for select to anon, authenticated
  using (exists (select 1 from public.companies c where c.id = company_id and c.verified));
