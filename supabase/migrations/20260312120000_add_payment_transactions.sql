-- Add payment transactions table and link to orders.
-- Supports multi-gateway checkout tracking (Yoco now, Payfast/Ozow later).

create extension if not exists "pgcrypto";

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  order_id bigint not null references public.orders(id) on delete cascade,
  gateway text not null,
  gateway_transaction_id text,
  status text not null default 'created',
  amount integer not null,
  currency text not null default 'ZAR',
  metadata jsonb
);

-- Keep gateway values consistent.
alter table public.payment_transactions
  drop constraint if exists payment_transactions_gateway_check;
alter table public.payment_transactions
  add constraint payment_transactions_gateway_check
  check (gateway in ('yoco', 'payfast', 'ozow'));

-- Keep status values consistent.
alter table public.payment_transactions
  drop constraint if exists payment_transactions_status_check;
alter table public.payment_transactions
  add constraint payment_transactions_status_check
  check (status in ('created', 'pending', 'succeeded', 'failed', 'cancelled'));

create index if not exists idx_payment_transactions_order_gateway
  on public.payment_transactions (order_id, gateway);

create index if not exists idx_payment_transactions_status
  on public.payment_transactions (status);

alter table public.orders
  add column if not exists payment_gateway text,
  add column if not exists payment_transaction_id uuid
    references public.payment_transactions(id) on delete set null;

-- Auto-update updated_at on updates.
create or replace function public.touch_payment_transactions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_touch_payment_transactions_updated_at on public.payment_transactions;
create trigger trg_touch_payment_transactions_updated_at
before update on public.payment_transactions
for each row execute function public.touch_payment_transactions_updated_at();

alter table public.payment_transactions enable row level security;

-- Local-friendly baseline policy (tighten for production).
drop policy if exists "payment_transactions open access" on public.payment_transactions;
create policy "payment_transactions open access"
on public.payment_transactions
for all
to anon, authenticated
using (true)
with check (true);

grant select, insert, update, delete on table public.payment_transactions
to anon, authenticated, service_role;
