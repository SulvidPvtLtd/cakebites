drop extension if exists "pg_net";

drop policy "order_items open access" on "public"."order_items";

drop policy "orders open access" on "public"."orders";

drop policy "products open access" on "public"."products";

drop policy "profiles open access" on "public"."profiles";

alter table "public"."order_items" drop constraint "order_items_order_id_fkey";

alter table "public"."order_items" drop constraint "order_items_product_id_fkey";

alter table "public"."orders" drop constraint "orders_user_id_fkey";

alter table "public"."order_items" alter column "quantity" set default '1'::real;

alter table "public"."order_items" alter column "quantity" set data type real using "quantity"::real;

alter table "public"."orders" alter column "delivery_option" set default 'Yes'::text;

alter table "public"."orders" alter column "total" set default '0'::double precision;

alter table "public"."orders" alter column "total" set data type double precision using "total"::double precision;

alter table "public"."orders" alter column "user_id" set default gen_random_uuid();

alter table "public"."products" alter column "price" drop default;

alter table "public"."products" alter column "price" set data type real using "price"::real;

alter table "public"."profiles" alter column "mobile_number" set default 'NULL'::text;

alter table "public"."profiles" alter column "updated_at" drop default;

CREATE INDEX idx_products_active_instock ON public.products USING btree (is_active, in_stock);

CREATE UNIQUE INDEX profiles_username_key ON public.profiles USING btree (username);

alter table "public"."profiles" add constraint "group_check" CHECK ((lower("group") = ANY (ARRAY['admin'::text, 'user'::text]))) not valid;

alter table "public"."profiles" validate constraint "group_check";

alter table "public"."profiles" add constraint "profiles_username_key" UNIQUE using index "profiles_username_key";

alter table "public"."profiles" add constraint "username_length" CHECK ((char_length(username) >= 3)) not valid;

alter table "public"."profiles" validate constraint "username_length";

alter table "public"."order_items" add constraint "order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE not valid;

alter table "public"."order_items" validate constraint "order_items_order_id_fkey";

alter table "public"."order_items" add constraint "order_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE not valid;

alter table "public"."order_items" validate constraint "order_items_product_id_fkey";

alter table "public"."orders" add constraint "orders_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON UPDATE CASCADE not valid;

alter table "public"."orders" validate constraint "orders_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and lower(p."group") = 'admin'
  );
$function$
;


  create policy "Allow authenticated users All operations"
  on "public"."order_items"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "order_items_delete_owner_or_admin_ci"
  on "public"."order_items"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND ((o.user_id = auth.uid()) OR public.is_admin(auth.uid()))))));



  create policy "order_items_insert_owner_or_admin_ci"
  on "public"."order_items"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND ((o.user_id = auth.uid()) OR public.is_admin(auth.uid()))))));



  create policy "order_items_select_owner_or_admin_ci"
  on "public"."order_items"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND ((o.user_id = auth.uid()) OR public.is_admin(auth.uid()))))));



  create policy "order_items_update_owner_or_admin_ci"
  on "public"."order_items"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND ((o.user_id = auth.uid()) OR public.is_admin(auth.uid()))))))
with check ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND ((o.user_id = auth.uid()) OR public.is_admin(auth.uid()))))));



  create policy "All authenticated users All operations"
  on "public"."orders"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "orders_delete_owner_or_admin_ci"
  on "public"."orders"
  as permissive
  for delete
  to authenticated
using (((user_id = auth.uid()) OR public.is_admin(auth.uid())));



  create policy "orders_insert_owner_or_admin_ci"
  on "public"."orders"
  as permissive
  for insert
  to authenticated
with check (((user_id = auth.uid()) OR public.is_admin(auth.uid())));



  create policy "orders_select_owner_or_admin_ci"
  on "public"."orders"
  as permissive
  for select
  to authenticated
using (((user_id = auth.uid()) OR public.is_admin(auth.uid())));



  create policy "orders_update_owner_or_admin_ci"
  on "public"."orders"
  as permissive
  for update
  to authenticated
using (((user_id = auth.uid()) OR public.is_admin(auth.uid())))
with check (((user_id = auth.uid()) OR public.is_admin(auth.uid())));



  create policy "products_admin_delete"
  on "public"."products"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (lower(p."group") = 'admin'::text)))));



  create policy "products_admin_update"
  on "public"."products"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (lower(p."group") = 'admin'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (lower(p."group") = 'admin'::text)))));



  create policy "products_admin_write"
  on "public"."products"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (lower(p."group") = 'admin'::text)))));



  create policy "products_select_active_for_users"
  on "public"."products"
  as permissive
  for select
  to authenticated
using (((is_active = true) OR (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (lower(p."group") = 'admin'::text))))));



  create policy "Public profiles are viewable by everyone."
  on "public"."profiles"
  as permissive
  for select
  to public
using (true);



  create policy "Users can insert their own profile."
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((( SELECT auth.uid() AS uid) = id));



  create policy "Users can update own profile."
  on "public"."profiles"
  as permissive
  for update
  to public
using ((( SELECT auth.uid() AS uid) = id));



  create policy "Anyone can upload an avatar."
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'avatars'::text));



  create policy "Authenticated can delete product images"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'product-images'::text));



  create policy "Authenticated can update product images"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'product-images'::text))
with check ((bucket_id = 'product-images'::text));



  create policy "Authenticated can upload product images"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'product-images'::text));



  create policy "Avatar images are publicly accessible."
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



  create policy "Product images are publicly readable"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'product-images'::text));



