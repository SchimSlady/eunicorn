-- What the company does, in one short neutral sentence, for the company overview after a game
-- (schema: Company.tagline). Written by us from the company's own website; its source is a
-- company_sources row with field 'tagline'.
alter table public.companies
  add column tagline text,
  add constraint company_tagline_length check (tagline is null or char_length(tagline) between 10 and 160);

alter table public.company_sources drop constraint company_sources_field_check;
alter table public.company_sources add constraint company_sources_field_check check (field in (
  'city', 'founded', 'founders', 'sectors', 'status', 'unicorn', 'valuation', 'employees', 'fun_fact', 'logo', 'programs',
  'exit', 'tagline'
));
