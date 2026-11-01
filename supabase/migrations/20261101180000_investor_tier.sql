-- Investor tier = how well known an investor is, so games only use investors players can know.
-- 1 = top 10 global VCs, 2 = ~50 famous (incl. German), 3 = next ~200, 4 = everyone else (default).
-- Set from data/investors/tiers.json by data/scripts/investors.ts.
alter table public.investors
  add column tier smallint not null default 4 check (tier between 1 and 4);

create index investors_tier_idx on public.investors (tier);
