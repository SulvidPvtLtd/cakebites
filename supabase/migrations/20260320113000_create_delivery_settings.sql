create table if not exists public.delivery_settings (
  id integer primary key default 1 check (id = 1),
  collection_address text,
  delivery_rate numeric not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.delivery_settings (id, collection_address, delivery_rate)
values (1, null, 0)
on conflict (id) do nothing;

create or replace function public.touch_delivery_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_delivery_settings_updated_at on public.delivery_settings;
create trigger trg_touch_delivery_settings_updated_at
before update on public.delivery_settings
for each row execute function public.touch_delivery_settings_updated_at();

alter table public.delivery_settings enable row level security;

drop policy if exists "Authenticated users can read delivery settings." on public.delivery_settings;
create policy "Authenticated users can read delivery settings."
on public.delivery_settings
for select
to authenticated
using (true);

drop policy if exists "Admins can insert delivery settings." on public.delivery_settings;
create policy "Admins can insert delivery settings."
on public.delivery_settings
for insert
to authenticated
with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can update delivery settings." on public.delivery_settings;
create policy "Admins can update delivery settings."
on public.delivery_settings
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
