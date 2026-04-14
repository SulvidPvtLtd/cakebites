alter table public.orders
add column if not exists hidden_from_customer boolean not null default false;
