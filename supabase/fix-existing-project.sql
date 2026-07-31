-- DhiExpress repair patch for an existing Supabase project.
-- Run this once in Supabase Dashboard > SQL Editor.

-- Allow a signed-in user to create their own profile if the auth trigger was missing.
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
for insert to authenticated
with check (id = auth.uid());

-- Add fields used by the admin pages.
alter table public.complaints add column if not exists resolved_by uuid references public.profiles(id);
alter table public.complaints add column if not exists resolved_at timestamptz;
alter table public.payments add column if not exists verified_by uuid references public.profiles(id);
alter table public.payments add column if not exists verified_at timestamptz;

-- Permit the seller status used by the admin interface.
alter table public.profiles drop constraint if exists profiles_seller_status_check;
alter table public.profiles add constraint profiles_seller_status_check
check (seller_status in ('not_applied','pending','approved','rejected','suspended'));

-- Profile-image upload and management policies.
drop policy if exists "user uploads profile images" on storage.objects;
create policy "user uploads profile images" on storage.objects
for insert to authenticated
with check (bucket_id='profile-images' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "owner manages profile images" on storage.objects;
create policy "owner manages profile images" on storage.objects
for update to authenticated
using (bucket_id='profile-images' and owner_id=auth.uid()::text);

drop policy if exists "owner deletes profile images" on storage.objects;
create policy "owner deletes profile images" on storage.objects
for delete to authenticated
using (bucket_id='profile-images' and owner_id=auth.uid()::text);

-- Indexes used by seller orders, notifications, and messages.
create index if not exists orders_seller_ids_idx on public.orders using gin(seller_ids);
create index if not exists notifications_user_created_idx on public.notifications(user_id,created_at desc);
create index if not exists conversations_participant_ids_idx on public.conversations using gin(participant_ids);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id,created_at);

-- Refresh the profile trigger in case the earlier setup was incomplete.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,display_name,email,photo_url,email_verified)
 values(
   new.id,
   coalesce(new.raw_user_meta_data->>'display_name',new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1),'DhiExpress User'),
   new.email,
   coalesce(new.raw_user_meta_data->>'avatar_url',''),
   new.email_confirmed_at is not null
 )
 on conflict(id) do update set
   email=excluded.email,
   email_verified=excluded.email_verified,
   updated_at=now();
 return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email_confirmed_at on auth.users
for each row execute function public.handle_new_user();
