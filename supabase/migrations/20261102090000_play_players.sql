-- Daily anonymous player id for the play counter (Pablo, 2026-11-02, "option A").
-- The web server sends the visitor's IP address and browser string; the database turns them into
-- a short hash with a random salt for that puzzle day and stores only the hash. Salts are deleted
-- after the day, so a hash can't be traced back to an IP address and the same person gets a new
-- id every day (no tracking across days). Nothing is stored on the visitor's device.

alter table public.plays add column player text check (player ~ '^[0-9a-f]{16}$');

create table public.play_salts (
  day date primary key,
  salt bytea not null
);
alter table public.play_salts enable row level security;
-- No policies: only the security definer functions below can read or write salts.

-- Records one play: the same checks as the insert policy on plays, plus the daily player hash.
create function public.record_play(
  p_played_on date, p_mode text, p_difficulty text, p_event text,
  p_bucket smallint default null, p_score_pct smallint default null, p_won boolean default null,
  p_ip text default null, p_ua text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s bytea;
  h text;
begin
  -- Same window as the "insert plays" policy, which security definer bypasses.
  if p_played_on not between current_date - 1 and current_date + 1 then
    raise exception 'played_on out of range' using errcode = '42501';
  end if;
  -- Forget yesterday's-but-one salts: from then on their hashes can't be recomputed.
  delete from public.play_salts where day < current_date - 1;
  if nullif(btrim(p_ip), '') is not null then
    insert into public.play_salts (day, salt) values (p_played_on, extensions.gen_random_bytes(32))
      on conflict (day) do nothing;
    select salt into s from public.play_salts where day = p_played_on;
    h := substr(encode(extensions.digest(s || convert_to(p_ip || '|' || coalesce(p_ua, ''), 'UTF8'), 'sha256'), 'hex'), 1, 16);
  end if;
  insert into public.plays (played_on, mode, difficulty, event, bucket, score_pct, won, player)
  values (p_played_on, p_mode, p_difficulty, p_event, p_bucket, p_score_pct, p_won, h);
end;
$$;

revoke all on function public.record_play(date, text, text, text, smallint, smallint, boolean, text, text) from public;
grant execute on function public.record_play(date, text, text, text, smallint, smallint, boolean, text, text) to anon, authenticated;

-- Admin: one row per puzzle day and anonymous player (secret key only).
create function public.admin_play_players(p_from date, p_to date)
returns table (
  played_on date,
  player text,
  starts bigint,
  finishes bigint,
  solved bigint,
  modes text[],           -- games started, most played first
  avg_score_pct numeric   -- average score_pct over finishes, 1 decimal
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'p_from must be on or before p_to';
  end if;
  if p_to - p_from > 366 then
    raise exception 'range is limited to 366 days';
  end if;
  return query
    select p.played_on, p.player,
           count(*) filter (where p.event = 'start'),
           count(*) filter (where p.event = 'finish'),
           count(*) filter (where p.event = 'finish' and p.won),
           (select array_agg(m.mode order by m.n desc, m.mode)
              from (select q.mode, count(*) n from public.plays q
                    where q.played_on = p.played_on and q.player = p.player and q.event = 'start'
                    group by q.mode) m),
           round(avg(p.score_pct) filter (where p.event = 'finish'), 1)
    from public.plays p
    where p.played_on between p_from and p_to and p.player is not null
    group by p.played_on, p.player
    order by p.played_on desc, count(*) filter (where p.event = 'start') desc, p.player;
end;
$$;

revoke all on function public.admin_play_players(date, date) from public, anon, authenticated;
grant execute on function public.admin_play_players(date, date) to service_role;
