alter table public.delivery_settings
  add column if not exists fulfillment_location_id bigint
    references public.inventory_locations(id) on delete set null;

create index if not exists idx_delivery_settings_fulfillment_location
  on public.delivery_settings (fulfillment_location_id);
