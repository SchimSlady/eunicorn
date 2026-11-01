-- Sectors for companies that had to be filed under a near miss: learning platforms (edtech),
-- home buying and building (proptech) and mobile operators (telecom).
alter type public.sector add value if not exists 'edtech';
alter type public.sector add value if not exists 'proptech';
alter type public.sector add value if not exists 'telecom';
