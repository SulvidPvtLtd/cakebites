-- Remove inventory management system objects.

-- Detach delivery settings from inventory locations.
alter table if exists public.delivery_settings
  drop column if exists fulfillment_location_id;

-- Remove inventory-related RPCs/functions if they exist.
drop function if exists public.cancel_order_and_restock(bigint);
drop function if exists public.cancel_order_and_restock(integer);
drop function if exists public.generate_inventory_alerts(bigint);
drop function if exists public.generate_inventory_alerts(integer);
drop function if exists public.acknowledge_inventory_alert(bigint, text);
drop function if exists public.acknowledge_inventory_alert(integer, text);
drop function if exists public.adjust_inventory(bigint, bigint, integer, integer, text);
drop function if exists public.adjust_inventory(integer, integer, integer, integer, text);
drop function if exists public.reserve_inventory_for_order(bigint, bigint);
drop function if exists public.reserve_inventory_for_order(integer, integer);
drop function if exists public.restock_inventory_for_order(bigint);
drop function if exists public.restock_inventory_for_order(integer);
drop function if exists public.touch_inventory_locations_updated_at();
drop function if exists public.touch_inventory_levels_updated_at();
drop function if exists public.touch_reorder_rules_updated_at();

-- Drop inventory tables.
drop table if exists public.inventory_alerts cascade;
drop table if exists public.reorder_rules cascade;
drop table if exists public.inventory_transactions cascade;
drop table if exists public.inventory_levels cascade;
drop table if exists public.inventory_locations cascade;

-- Remove inventory-specific product metadata fields.
alter table if exists public.products
  drop column if exists sku,
  drop column if exists barcode,
  drop column if exists track_inventory;
