-- Feed photos are visible to signed-in community members, like posts.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', false, 2097152, array['image/jpeg'])
on conflict (id) do nothing;

create policy "community reads post images"
  on storage.objects for select to authenticated
  using (bucket_id = 'post-images');

create policy "users upload own post images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users delete own post images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

alter table public.posts add column image_path text;
alter table public.posts alter column content drop not null;
alter table public.posts drop constraint posts_content_check;
alter table public.posts add constraint posts_content_check check (
  (content is null or length(btrim(content)) between 1 and 1000)
  and (content is not null or image_path is not null)
);
alter table public.posts add constraint posts_image_path_check check (
  image_path is null
  or image_path ~ ('^' || user_id::text || '/[0-9a-f-]{36}\.jpg$')
);
create unique index posts_image_path_key on public.posts (image_path)
  where image_path is not null;

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (length(btrim(content)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index post_comments_post_created_idx
  on public.post_comments (post_id, created_at);
alter table public.post_comments enable row level security;

create policy "comments readable by authenticated users"
  on public.post_comments for select to authenticated using (true);
create policy "users create own comments"
  on public.post_comments for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "users delete own comments"
  on public.post_comments for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, delete on public.post_comments to authenticated;
