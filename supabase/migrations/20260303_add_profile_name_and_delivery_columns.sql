alter table public.profiles
  add column if not exists first_name text,
  add column if not exists surname text,
  add column if not exists delivery_address text;

-- Backfill first_name and surname from existing full_name where possible.
update public.profiles
set
  first_name = nullif(split_part(trim(full_name), ' ', 1), ''),
  surname = nullif(regexp_replace(trim(full_name), '^\S+\s*', ''), '')
where full_name is not null
  and (
    first_name is null
    or surname is null
  );

-- Backfill delivery address from legacy website field when available.
update public.profiles
set delivery_address = website
where delivery_address is null
  and website is not null
  and btrim(website) <> '';
