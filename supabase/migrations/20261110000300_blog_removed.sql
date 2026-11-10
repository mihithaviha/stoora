-- "Delete all" in the drafts list: a built-in story the team deleted for good. Its text lives in the code, so a row with status 'removed'
-- keeps it off the site for ever and out of the admin list. (A story written in the admin is simply deleted.)
alter table public.blog_posts drop constraint if exists blog_posts_status_check;
alter table public.blog_posts add constraint blog_posts_status_check check (status in ('draft', 'published', 'removed'));

create or replace function public.hidden_blog_slugs() returns setof text language sql stable security definer set search_path = public as $$
  select slug from public.blog_posts where builtin and status in ('draft', 'removed')
$$;
