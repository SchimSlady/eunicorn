-- Generated puzzles, frozen per day. Top 10, the Local games and any day without an approved puzzle are
-- generated from the verified data on request. Data loaded during the day (new companies, rounds) used
-- to change that day's puzzle mid-day, so players who started earlier had a different board than their
-- saved progress. Now the first request of a day stores the generated puzzle here and every later
-- request gets exactly that one; new data takes effect from the next day.
--
-- Written only by the web server with the secret key (no insert policy for anon); read by anyone, like
-- the puzzles the API already serves. region is '' for the daily games.
create table public.daily_puzzles (
  date date not null,
  mode text not null,
  region text not null default '',
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (date, mode, region)
);

alter table public.daily_puzzles enable row level security;
-- Up to today (Europe/Berlin) only, like approved puzzles.
create policy "read up to today" on public.daily_puzzles for select to anon, authenticated
  using (date <= (now() at time zone 'Europe/Berlin')::date);
