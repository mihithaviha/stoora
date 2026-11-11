-- Fix: publishing the storefront (adding a logo, changing the design) failed with  "permission denied for table shops".
-- The shops table only lets a seller update the columns that were listed one by one in the first migration. The storefront design column
-- was added later and never listed, so the update was refused. Row level security still limits it to the shop's owner.
grant update (storefront) on public.shops to authenticated;
