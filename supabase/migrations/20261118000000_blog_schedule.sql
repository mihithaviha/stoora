-- Blogs admin: schedule a story to go live at a future date and time, instead of publishing it right away.
--   * status 'scheduled' holds the story off the site until scheduled_at; after that moment it counts as published
--   * nothing runs a clock here: the public pages already re-check Supabase on every visit (and refresh within a
--     minute either way), so a scheduled story simply starts matching the "visible" rule once its time comes
alter table public.blog_posts add column if not exists scheduled_at timestamptz;

alter table public.blog_posts drop constraint if exists blog_posts_status_check;
alter table public.blog_posts add constraint blog_posts_status_check check (status in ('draft', 'published', 'scheduled', 'removed'));
alter table public.blog_posts drop constraint if exists blog_posts_schedule_check;
alter table public.blog_posts add constraint blog_posts_schedule_check check (status <> 'scheduled' or scheduled_at is not null);

drop policy if exists blog_posts_read on public.blog_posts;
create policy blog_posts_read on public.blog_posts for select to anon, authenticated
  using (status = 'published' or (status = 'scheduled' and scheduled_at <= now()) or public.is_admin());

create or replace function public.hidden_blog_slugs() returns setof text language sql stable security definer set search_path = public as $$
  select slug from public.blog_posts where builtin and (status in ('draft', 'removed') or (status = 'scheduled' and scheduled_at > now()))
$$;
