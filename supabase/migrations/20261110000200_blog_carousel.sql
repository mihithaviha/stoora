-- Blogs carousel: the team chooses exactly 6 stories (and, if they like, a different picture for each) for the moving ring at the top of /blogs.
-- One row, key 'carousel', holds the list: [{ "slug": "...", "photo": "..." }, ...] in the order they appear. Anyone can read it; only admins write it.
create table public.blog_settings (
  key        text primary key check (key in ('carousel')),
  value      jsonb not null default '[]' check (jsonb_typeof(value) = 'array' and jsonb_array_length(value) <= 12 and pg_column_size(value) <= 20000),
  updated_at timestamptz not null default now()
);
alter table public.blog_settings enable row level security;
create policy blog_settings_read   on public.blog_settings for select to anon, authenticated using (true);
create policy blog_settings_insert on public.blog_settings for insert to authenticated with check (public.is_admin());
create policy blog_settings_update on public.blog_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy blog_settings_delete on public.blog_settings for delete to authenticated using (public.is_admin());
