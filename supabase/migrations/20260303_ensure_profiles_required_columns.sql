-- Ensure profiles table exists for environments where starter SQL was not fully applied.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade
);

-- Ensure all profile columns used by the app exist.
alter table public.profiles
  add column if not exists email text,
  add column if not exists mobile_number text,
  add column if not exists "group" text not null default 'user',
  add column if not exists full_name text,
  add column if not exists username text,
  add column if not exists avatar_url text,
  add column if not exists website text,
  add column if not exists updated_at timestamptz default now(),
  add column if not exists first_name text,
  add column if not exists surname text,
  add column if not exists delivery_address text;

-- Backfill newer columns from older legacy fields when values are missing.
update public.profiles
set
  first_name = coalesce(first_name, nullif(split_part(trim(full_name), ' ', 1), '')),
  surname = coalesce(surname, nullif(regexp_replace(trim(full_name), '^\S+\s*', ''), '')),
  delivery_address = coalesce(delivery_address, nullif(website, ''))
where first_name is null
   or surname is null
   or delivery_address is null;

-- Keep updated_at fresh on row updates.
create or replace function public.touch_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_profiles_updated_at on public.profiles;

create trigger trg_touch_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_profiles_updated_at();

-- Refresh PostgREST schema cache so newly added columns are queryable immediately.
notify pgrst, 'reload schema';
