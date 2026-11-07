-- How a company's startup story ended (for games like "all acquired except one", "Top 10 IPOs",
-- "most valuable startups that went bust"). One exit per company: the event that set its status.
--   acquisition: bought (majority stake or full takeover); exit_acquirer names the buyer
--   ipo:         listed on a stock exchange (direct listings and SPAC mergers count)
--   insolvency:  insolvency or bankruptcy filing
--   shutdown:    wound down without an insolvency filing
-- exit_month is the announcement month, stored as the 1st (like round dates).
create type public.exit_kind as enum ('acquisition', 'ipo', 'insolvency', 'shutdown');

alter table public.companies
  add column exit_kind public.exit_kind,
  add column exit_month date,
  add column exit_acquirer text,
  add constraint company_exit_complete check ((exit_kind is null) = (exit_month is null)),
  add constraint company_exit_acquirer check (exit_acquirer is null or exit_kind = 'acquisition');

alter table public.company_sources drop constraint company_sources_field_check;
alter table public.company_sources add constraint company_sources_field_check check (field in (
  'city', 'founded', 'founders', 'sectors', 'status', 'unicorn', 'valuation', 'employees', 'fun_fact', 'logo', 'programs',
  'exit'
));
