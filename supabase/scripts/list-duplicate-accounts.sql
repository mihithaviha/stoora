-- READ ONLY. Lists people who may have two Stoora accounts, for example one made with Google and another made with a phone number.
-- It changes nothing. Run it in the Supabase SQL editor, then join the accounts by hand after checking with the person.
-- (There is no merge button on purpose: two accounts are only joined when a person has proved both, never because details look alike.)

-- 1. An account with a shop, and a second phone-only account with no shop whose number matches the shop's WhatsApp or phone number.
with phone_only as (
  select u.id, u.phone, u.created_at
  from auth.users u
  where u.phone is not null and u.email is null
    and not exists (select 1 from public.shops s where s.owner_id = u.id)
), shop_owners as (
  select s.owner_id, s.name as shop, s.handle, u.email,
         right(regexp_replace(coalesce(s.whatsapp_number, s.phone, ''), '\D', '', 'g'), 10) as shop_number
  from public.shops s join auth.users u on u.id = s.owner_id
)
select p.id as empty_phone_account, p.phone, p.created_at as phone_account_created,
       o.owner_id as shop_account, o.email as shop_account_email, o.shop, o.handle
from phone_only p
join shop_owners o on o.shop_number <> '' and o.shop_number = right(regexp_replace(p.phone, '\D', '', 'g'), 10)
order by p.created_at desc;

-- 2. How many empty phone-only accounts exist at all (most are people who stopped before naming a shop).
select count(*) as empty_phone_only_accounts
from auth.users u
where u.phone is not null and u.email is null
  and not exists (select 1 from public.shops s where s.owner_id = u.id);
