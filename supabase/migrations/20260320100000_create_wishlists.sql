create table if not exists public.wishlists (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint wishlists_user_product_key unique (user_id, product_id)
);

create index if not exists wishlists_user_id_idx on public.wishlists(user_id);
create index if not exists wishlists_product_id_idx on public.wishlists(product_id);

alter table public.wishlists enable row level security;

drop policy if exists "Users can view own wishlist items." on public.wishlists;
create policy "Users can view own wishlist items."
on public.wishlists
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own wishlist items." on public.wishlists;
create policy "Users can insert own wishlist items."
on public.wishlists
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own wishlist items." on public.wishlists;
create policy "Users can delete own wishlist items."
on public.wishlists
for delete
to authenticated
using (auth.uid() = user_id);
