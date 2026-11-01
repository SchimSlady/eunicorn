-- Optional daily leaderboard for the web app. On the result screen a player can add themselves to
-- that day's board under a name they choose, for the game and level they played. Nothing is stored
-- unless they do. Entries are deleted after 30 days (see the trigger below).
--
-- `device` is a random id the browser makes up and keeps. It only lets one device hold one entry
-- per game and day, and it is never readable: there is no select policy, the app reads the board
-- through public.leaderboard_board() only.

create table public.leaderboard (
  id bigint generated always as identity primary key,
  played_on date not null,                -- the puzzle day (Europe/Berlin), set by the server
  mode text not null check (mode in ('who-raised-this', 'unicorn-grid', 'higher-lower', 'impostor', 'top-10')),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  name text not null check (char_length(name) between 2 and 16 and name = btrim(name) and name ~ '^[[:alnum:] ._-]+$'),
  device uuid not null,
  score_pct smallint not null check (score_pct between 0 and 100),
  hints smallint not null default 0 check (hints between 0 and 30),
  created_at timestamptz not null default now(),
  unique (played_on, mode, device)
);

create index leaderboard_board_idx on public.leaderboard (played_on, mode, difficulty, score_pct desc);

alter table public.leaderboard enable row level security;

-- Insert only, and only for (roughly) today, so nobody can backfill old days.
create policy "insert leaderboard" on public.leaderboard for insert to anon, authenticated
  with check (played_on between current_date - 1 and current_date + 1);
-- No select, update or delete policy: rows are only read through leaderboard_board().

-- Entries older than 30 days are deleted whenever a new one is added, so no scheduler is needed.
create function public.purge_old_leaderboard() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.leaderboard where played_on < current_date - 30;
  return null;
end;
$$;

create trigger leaderboard_purge after insert on public.leaderboard
  for each statement execute function public.purge_old_leaderboard();

-- The top of one day's board for a game and level, plus the caller's own entry (found by device
-- id, which is never returned). Equal scores share a rank; fewer hints rank higher.
create function public.leaderboard_board(p_day date, p_mode text, p_difficulty text, p_device uuid, p_limit int default 10)
returns json
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select name, score_pct, hints, device,
           rank() over (order by score_pct desc, hints asc) as rank
    from public.leaderboard
    where played_on = p_day and mode = p_mode and difficulty = p_difficulty
  )
  select json_build_object(
    'total', (select count(*) from ranked),
    'top', coalesce((
      select json_agg(json_build_object('rank', rank, 'name', name, 'scorePct', score_pct, 'hints', hints) order by rank, name)
      from (select * from ranked order by rank, name limit least(greatest(p_limit, 1), 50)) t
    ), '[]'::json),
    'you', (
      select json_build_object('rank', rank, 'name', name, 'scorePct', score_pct, 'hints', hints)
      from ranked where device = p_device
    )
  );
$$;

revoke all on function public.leaderboard_board(date, text, text, uuid, int) from public;
grant execute on function public.leaderboard_board(date, text, text, uuid, int) to anon, authenticated;
