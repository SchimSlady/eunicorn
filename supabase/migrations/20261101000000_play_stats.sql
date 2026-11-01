-- Anonymous play counter for the web app: one row when a game starts and one when it ends.
-- No IP, no device id, no cookie: only the day, the mode, the level and the result.
-- Rows can be written but never read back; the app (and the dashboard) only see aggregates
-- through public.play_stats().

create table public.plays (
  id bigint generated always as identity primary key,
  played_on date not null,                -- the puzzle day (Europe/Berlin), set by the server
  mode text not null check (mode in ('who-raised-this', 'unicorn-grid', 'higher-lower', 'impostor')),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  event text not null check (event in ('start', 'finish')),
  -- finish only: the result as the bar it falls into (guess number, rounds right, squares filled;
  -- 0 = missed), the score as a share of the maximum, and whether the puzzle was solved
  bucket smallint check (bucket between 0 and 20),
  score_pct smallint check (score_pct between 0 and 100),
  won boolean,
  created_at timestamptz not null default now()
);

create index plays_day_mode on public.plays (played_on, mode);

alter table public.plays enable row level security;

-- Insert only, and only for (roughly) today, so nobody can backfill old days.
create policy "insert plays" on public.plays for insert to anon, authenticated
  with check (played_on between current_date - 1 and current_date + 1);
-- No select policy: individual rows stay private.

-- Aggregates for one day and mode: counts, the result distribution and the score histogram.
create function public.play_stats(p_day date, p_mode text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'starts', count(*) filter (where event = 'start'),
    'finishes', count(*) filter (where event = 'finish'),
    'solved', count(*) filter (where event = 'finish' and won),
    'buckets', coalesce((
      select json_object_agg(bucket, n) from (
        select bucket, count(*) as n from plays
        where played_on = p_day and mode = p_mode and event = 'finish' and bucket is not null
        group by bucket
      ) b), '{}'::json),
    'scores', coalesce((
      select json_object_agg(score_pct, n) from (
        select score_pct, count(*) as n from plays
        where played_on = p_day and mode = p_mode and event = 'finish' and score_pct is not null
        group by score_pct
      ) s), '{}'::json)
  )
  from plays
  where played_on = p_day and mode = p_mode;
$$;

revoke all on function public.play_stats(date, text) from public;
grant execute on function public.play_stats(date, text) to anon, authenticated;

-- Daily overview for the dashboard (SQL editor):
--   select played_on, mode,
--          count(*) filter (where event = 'start')  as started,
--          count(*) filter (where event = 'finish') as finished,
--          count(*) filter (where event = 'finish' and won) as solved
--   from public.plays group by 1, 2 order by 1 desc, 2;
