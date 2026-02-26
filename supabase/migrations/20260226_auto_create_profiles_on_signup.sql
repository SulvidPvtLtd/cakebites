-- Ensure default profile group is lowercase user
alter table public.profiles
alter column "group" set default 'user';

-- Normalize any legacy user values
update public.profiles
set "group" = 'user'
where "group" is null
   or btrim("group") = ''
   or lower("group") = 'user';

-- Create profile automatically for every new auth user
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, mobile_number, "group")
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'mobile_number', ''),
    'user'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    mobile_number = coalesce(excluded.mobile_number, public.profiles.mobile_number),
    "group" = coalesce(public.profiles."group", 'user');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();
