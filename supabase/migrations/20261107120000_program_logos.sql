-- Official program logo (Y Combinator, CDTM ...) for program-themed games on the Local tab:
-- '/logos/programs/<id>.svg|png' under web/public, set by data/scripts/load-verified.ts when the file exists.
alter table public.programs add column logo text;
