-- One-time cleanup: normalize legacy/variant order statuses to canonical values.
-- Canonical set used by the app:
-- New, Cooking, Delivering, Delivered, Cancelled

update public.orders
set status = case
  when lower(btrim(status)) = 'new' then 'New'
  when lower(btrim(status)) = 'cooking' then 'Cooking'
  when lower(btrim(status)) = 'delivering' then 'Delivering'
  when lower(btrim(status)) = 'delivered' then 'Delivered'
  when lower(btrim(status)) in ('cancelled', 'canceled') then 'Cancelled'
  else status
end
where status is not null
  and (
    status <> case
      when lower(btrim(status)) = 'new' then 'New'
      when lower(btrim(status)) = 'cooking' then 'Cooking'
      when lower(btrim(status)) = 'delivering' then 'Delivering'
      when lower(btrim(status)) = 'delivered' then 'Delivered'
      when lower(btrim(status)) in ('cancelled', 'canceled') then 'Cancelled'
      else status
    end
  );
