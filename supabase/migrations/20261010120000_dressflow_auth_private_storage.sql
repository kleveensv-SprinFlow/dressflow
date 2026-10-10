-- Dressflow schema: additive only. Existing budgeting tables are not modified.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null default '',
  gender text not null default 'female' check (gender in ('female', 'male')),
  avatar_url text,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'premium')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clothes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  main_category text,
  type text not null,
  color text not null default 'Blanc',
  season text not null default 'Été',
  activity text not null default 'Quotidien',
  icon text not null default '👕',
  image_url text,
  last_worn_date timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists clothes_profile_created_idx on public.clothes (profile_id, created_at desc);
create index if not exists profiles_email_idx on public.profiles (email);

alter table public.profiles enable row level security;
alter table public.clothes enable row level security;
revoke all on public.profiles from anon, authenticated;
revoke all on public.clothes from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.clothes to authenticated;

drop policy if exists "Dressflow users can view own profile" on public.profiles;
create policy "Dressflow users can view own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "Dressflow users can update own profile" on public.profiles;
create policy "Dressflow users can update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "Dressflow users can view own clothes" on public.clothes;
create policy "Dressflow users can view own clothes" on public.clothes for select to authenticated using ((select auth.uid()) = profile_id);
drop policy if exists "Dressflow users can insert own clothes" on public.clothes;
create policy "Dressflow users can insert own clothes" on public.clothes for insert to authenticated with check ((select auth.uid()) = profile_id);
drop policy if exists "Dressflow users can update own clothes" on public.clothes;
create policy "Dressflow users can update own clothes" on public.clothes for update to authenticated using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
drop policy if exists "Dressflow users can delete own clothes" on public.clothes;
create policy "Dressflow users can delete own clothes" on public.clothes for delete to authenticated using ((select auth.uid()) = profile_id);

create or replace function public.handle_dressflow_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, gender)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    case when new.raw_user_meta_data ->> 'gender' = 'male' then 'male' else 'female' end
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
revoke all on function public.handle_dressflow_auth_user() from public, anon, authenticated;
drop trigger if exists on_dressflow_auth_user_created on auth.users;
create trigger on_dressflow_auth_user_created after insert or update of email on auth.users for each row execute function public.handle_dressflow_auth_user();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('clothes-images', 'clothes-images', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic','image/heif']),
  ('avatars', 'avatars', false, 5242880, array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Dressflow users read own clothing photos" on storage.objects;
create policy "Dressflow users read own clothing photos" on storage.objects for select to authenticated using (bucket_id = 'clothes-images' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "Dressflow users upload own clothing photos" on storage.objects;
create policy "Dressflow users upload own clothing photos" on storage.objects for insert to authenticated with check (bucket_id = 'clothes-images' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "Dressflow users update own clothing photos" on storage.objects;
create policy "Dressflow users update own clothing photos" on storage.objects for update to authenticated using (bucket_id = 'clothes-images' and (storage.foldername(name))[1] = (select auth.uid()::text)) with check (bucket_id = 'clothes-images' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "Dressflow users delete own clothing photos" on storage.objects;
create policy "Dressflow users delete own clothing photos" on storage.objects for delete to authenticated using (bucket_id = 'clothes-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Dressflow users read own avatar" on storage.objects;
create policy "Dressflow users read own avatar" on storage.objects for select to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "Dressflow users upload own avatar" on storage.objects;
create policy "Dressflow users upload own avatar" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "Dressflow users update own avatar" on storage.objects;
create policy "Dressflow users update own avatar" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text)) with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "Dressflow users delete own avatar" on storage.objects;
create policy "Dressflow users delete own avatar" on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
