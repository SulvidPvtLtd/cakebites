alter table public.products
add column if not exists size_prices jsonb not null default
'{"S": 0, "M": 0, "L": 0, "XL": 0}'::jsonb;

update public.products
set size_prices = jsonb_build_object(
  'S', price,
  'M', price,
  'L', price,
  'XL', price
)
where size_prices is null
   or jsonb_typeof(size_prices) <> 'object';

