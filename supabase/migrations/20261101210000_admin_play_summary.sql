-- Admin statistics over a date range for the password-protected /admin page (web side).
-- Aggregates only; public.plays keeps no select policy. Both functions are callable with the
-- secret key (service_role) only, never with the publishable key.
-- plpgsql instead of sql so the range check can raise an exception.

create function public.admin_play_summary(p_from date, p_to date)
returns table (
  played_on date,
  mode text,
  difficulty text,
  starts bigint,          -- event = 'start'
  finishes bigint,        -- event = 'finish'
  solved bigint,          -- finish and won
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
    select p.played_on, p.mode, p.difficulty,
           count(*) filter (where p.event = 'start'),
           count(*) filter (where p.event = 'finish'),
           count(*) filter (where p.event = 'finish' and p.won),
           round(avg(p.score_pct) filter (where p.event = 'finish'), 1)
    from public.plays p
    where p.played_on between p_from and p_to
    group by p.played_on, p.mode, p.difficulty
    order by p.played_on, p.mode, p.difficulty;
end;
$$;

create function public.admin_play_hours(p_from date, p_to date)
returns table (
  hour smallint,          -- hour of day in Europe/Berlin
  mode text,
  starts bigint
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
    select extract(hour from p.created_at at time zone 'Europe/Berlin')::smallint as h, p.mode, count(*)
    from public.plays p
    where p.played_on between p_from and p_to and p.event = 'start'
    group by h, p.mode
    order by h, p.mode;
end;
$$;

revoke all on function public.admin_play_summary(date, date) from public, anon, authenticated;
revoke all on function public.admin_play_hours(date, date) from public, anon, authenticated;
grant execute on function public.admin_play_summary(date, date) to service_role;
grant execute on function public.admin_play_hours(date, date) to service_role;
