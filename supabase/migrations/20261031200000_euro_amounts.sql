-- All money in euros. Tech.eu converts each round at the ECB rate on its date; the announced
-- amount and currency stay in amount_original / currency. The tables are still empty.
alter table public.companies rename column last_valuation_usd to last_valuation_eur;
alter table public.rounds rename column amount_usd to amount_eur;
alter table public.rounds rename column post_money_valuation_usd to post_money_valuation_eur;

drop view public.company_totals;
create view public.company_totals with (security_invoker = true) as
select company_id,
       sum(amount_eur) as total_raised_eur,
       count(*) as rounds_count,
       max(announced_month) as last_round_month
from public.rounds
where verified
group by company_id;
grant select on public.company_totals to anon, authenticated;

alter type public.sector add value 'space';

-- Founding year from Wikidata, to leave out companies founded before 1995 (corporates, not startups).
alter table staging.launch_candidates add column founded smallint;
create or replace view staging.launch_ranking as
select row_number() over (order by wikipedia_languages desc nulls last, equity_eur desc) as rank, *
from staging.launch_candidates
where include is not false and (founded is null or founded >= 1995);
