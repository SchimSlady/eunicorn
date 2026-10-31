-- Logos need a source line like every other fact: the page the official logo was taken from.
alter table public.company_sources drop constraint company_sources_field_check;
alter table public.company_sources add constraint company_sources_field_check check (field in (
  'city', 'founded', 'founders', 'sectors', 'status', 'unicorn', 'valuation', 'employees', 'fun_fact', 'logo'
));
