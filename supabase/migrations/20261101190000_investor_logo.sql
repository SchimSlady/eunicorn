-- Path under /web/public, e.g. /logos/investors/sequoia-capital.svg. Set by data/scripts/investors.ts
-- when the file exists (tier 1–2 investors for now). Same trademark rules as company logos.
alter table public.investors add column logo text;
