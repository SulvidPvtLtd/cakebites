insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public;
