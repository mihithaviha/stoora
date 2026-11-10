-- Fix: finishing the shop setup failed with  new row violates row-level security policy for table "shops".
-- The app inserts the shop and reads it straight back (insert ... returning). While that one statement runs, the new row is not yet visible to
-- is_shop_member(), so the "read" rule refused it. The owner can now always read their own shop directly, by comparing owner_id.
drop policy if exists shops_read on public.shops;
create policy shops_read on public.shops for select to authenticated
  using (owner_id = auth.uid() or public.is_shop_member(id) or public.is_admin());
