-- The web app's Top 10 mode (web-only for now, not in the game_mode enum) records plays too.
-- 20261101000000_play_stats.sql was applied before 'top-10' was added to its check.
alter table public.plays drop constraint plays_mode_check;
alter table public.plays add constraint plays_mode_check
  check (mode in ('who-raised-this', 'unicorn-grid', 'higher-lower', 'impostor', 'top-10'));
