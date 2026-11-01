-- "saas" was a catch-all. These sectors (taken from Tech.eu's own verticals) say what the software is for.
alter type public.sector add value if not exists 'hrtech';
alter type public.sector add value if not exists 'legaltech';
alter type public.sector add value if not exists 'foodtech';
alter type public.sector add value if not exists 'logistics';
alter type public.sector add value if not exists 'ecommerce';
alter type public.sector add value if not exists 'devtools';
