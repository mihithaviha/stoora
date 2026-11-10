-- Blogs admin: stories the Stoora team writes and edits in /admin/blogs.
--   * the built-in stories live in src/lib/journal/articles.ts; a row here with the same slug and builtin = true is an EDIT of one of them
--     (status 'draft' hides that story); any other row is a new story
--   * anyone can read PUBLISHED stories; only admins (profiles.role = 'admin') can read drafts, write, change or delete
--   * cover and body images are uploaded to the public "blog-images" bucket by admins

create table public.blog_posts (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 90),
  title      text not null check (length(btrim(title)) between 5 and 160),
  excerpt    text not null default '' check (length(excerpt) <= 400),
  summary    text not null default '' check (length(summary) <= 800),
  topic      text not null default 'guides' check (length(topic) <= 40),
  photo      text not null default '' check (length(photo) <= 600),
  published  date not null default current_date,
  minutes    int  not null default 3 check (minutes between 1 and 120),
  body       jsonb not null default '[]' check (jsonb_typeof(body) = 'array' and pg_column_size(body) <= 200000),
  faq        jsonb not null default '[]' check (jsonb_typeof(faq) = 'array' and jsonb_array_length(faq) <= 20),
  carousel   int,
  pick       text check (pick is null or length(pick) <= 300),
  status     text not null default 'draft' check (status in ('draft', 'published')),
  builtin    boolean not null default false,
  author_id  uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index blog_posts_status_idx on public.blog_posts (status, published desc);

create or replace function public.blog_posts_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger blog_posts_touch before update on public.blog_posts for each row execute function public.blog_posts_touch();

alter table public.blog_posts enable row level security;
create policy blog_posts_read   on public.blog_posts for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy blog_posts_insert on public.blog_posts for insert to authenticated with check (public.is_admin());
create policy blog_posts_update on public.blog_posts for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy blog_posts_delete on public.blog_posts for delete to authenticated using (public.is_admin());

-- Storage: story pictures. Public to read; only admins write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-images', 'blog-images', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "blog images: anyone can look" on storage.objects for select using (bucket_id = 'blog-images');
create policy "blog images: admins upload"   on storage.objects for insert to authenticated with check (bucket_id = 'blog-images' and public.is_admin());
create policy "blog images: admins replace"  on storage.objects for update to authenticated using (bucket_id = 'blog-images' and public.is_admin());
create policy "blog images: admins delete"   on storage.objects for delete to authenticated using (bucket_id = 'blog-images' and public.is_admin());

-- The public pages need to know which built-in stories an admin switched off, without being able to read drafts.
create or replace function public.hidden_blog_slugs() returns setof text language sql stable security definer set search_path = public as $$
  select slug from public.blog_posts where builtin and status = 'draft'
$$;
grant execute on function public.hidden_blog_slugs() to anon, authenticated;
