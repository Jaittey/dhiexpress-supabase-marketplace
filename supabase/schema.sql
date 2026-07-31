-- DhiExpress Supabase backend
-- Run this entire file in Supabase Dashboard > SQL Editor > New query.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default 'DhiExpress User', email text, photo_url text, phone text,
 island text, atoll text, address text, role text not null default 'user' check(role in ('user','seller','admin')),
 seller_status text not null default 'not_applied' check(seller_status in ('not_applied','pending','approved','rejected')),
 plan_id text, status text not null default 'active' check(status in ('active','suspended','blocked')),
 email_verified boolean not null default false, business_name text, description text, location text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='active');
$$;

create or replace function public.protect_profile_privileges() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.seller_status := old.seller_status;
    new.status := old.status;
    new.plan_id := old.plan_id;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists protect_profile_privileges_trigger on public.profiles;
create trigger protect_profile_privileges_trigger before update on public.profiles for each row execute function public.protect_profile_privileges();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,display_name,email,photo_url,email_verified)
 values(new.id,coalesce(new.raw_user_meta_data->>'display_name',new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)),new.email,coalesce(new.raw_user_meta_data->>'avatar_url',''),new.email_confirmed_at is not null)
 on conflict(id) do nothing;
 return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table if not exists public.categories(id text primary key,name text not null,icon text,active boolean not null default true,sort_order integer not null default 0,created_at timestamptz default now());
create table if not exists public.membership_plans(id text primary key,name text not null,price numeric(12,2) not null default 0,listing_limit integer not null default 10,fee_percent numeric(5,2) not null default 0,featured_limit integer not null default 0,badge text,benefits text[] default '{}',active boolean default true,created_at timestamptz default now());
create table if not exists public.seller_profiles(id uuid primary key default gen_random_uuid(),owner_id uuid unique references public.profiles(id) on delete cascade,display_name text,business_name text not null,description text,location text,status text default 'pending',plan_id text references public.membership_plans(id),rating numeric(3,2) default 0,created_at timestamptz default now(),updated_at timestamptz default now());
create table if not exists public.seller_applications(id uuid primary key default gen_random_uuid(),user_id uuid unique references public.profiles(id) on delete cascade,business_name text not null,owner_name text,phone text,email text,location text,description text,requested_plan_id text,identity_file_path text,business_document_path text,status text default 'pending',admin_note text,submitted_at timestamptz default now(),reviewed_at timestamptz,reviewed_by uuid,updated_at timestamptz default now());

create table if not exists public.products(
 id uuid primary key default gen_random_uuid(),seller_id uuid not null references public.profiles(id),seller_name text not null,seller_plan text,name text not null,slug text,description text,category_id text references public.categories(id),price numeric(12,2) not null check(price>=0),discount_price numeric(12,2),stock integer not null default 0 check(stock>=0),condition text,delivery text,location text,images text[] default '{}',image_file_ids text[] default '{}',featured boolean default false,status text not null default 'pending' check(status in ('draft','pending','approved','rejected','suspended','sold_out','archived')),created_at timestamptz default now(),updated_at timestamptz default now()
);
create index if not exists products_status_idx on public.products(status);
create index if not exists products_seller_idx on public.products(seller_id);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_created_idx on public.products(created_at desc);

create table if not exists public.orders(id uuid primary key default gen_random_uuid(),order_number text unique not null,buyer_id uuid not null references public.profiles(id),buyer_name text,buyer_email text,seller_ids uuid[] default '{}',subtotal numeric(12,2) not null,delivery_fee numeric(12,2) default 0,total numeric(12,2) not null,currency text default 'MVR',status text default 'pending',payment_method text,payment_status text default 'pending',shipping_address text,phone text,notes text,bank_reference text,created_at timestamptz default now(),updated_at timestamptz default now());
create table if not exists public.order_items(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id) on delete cascade,product_id uuid not null references public.products(id),seller_id uuid not null references public.profiles(id),product_name text,image_url text,unit_price numeric(12,2) not null,quantity integer not null,subtotal numeric(12,2) not null,status text default 'pending',created_at timestamptz default now());
create index if not exists orders_buyer_idx on public.orders(buyer_id);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists order_items_seller_idx on public.order_items(seller_id);

create table if not exists public.reviews(id uuid primary key default gen_random_uuid(),product_id uuid references public.products(id) on delete cascade,user_id uuid references public.profiles(id),user_name text,rating integer check(rating between 1 and 5),comment text,status text default 'approved',created_at timestamptz default now(),unique(product_id,user_id));
create table if not exists public.notifications(id uuid primary key default gen_random_uuid(),user_id uuid references public.profiles(id) on delete cascade,title text,message text,type text,target_url text,read boolean default false,created_at timestamptz default now());
create table if not exists public.conversations(id uuid primary key default gen_random_uuid(),participant_ids uuid[] not null,participant_names text[] default '{}',product_id uuid references public.products(id),last_message text,updated_at timestamptz default now(),created_at timestamptz default now());
create table if not exists public.messages(id uuid primary key default gen_random_uuid(),conversation_id uuid references public.conversations(id) on delete cascade,sender_id uuid references public.profiles(id),text text not null,read boolean default false,created_at timestamptz default now());
create table if not exists public.complaints(id uuid primary key default gen_random_uuid(),user_id uuid references public.profiles(id),user_email text,type text,subject text,message text,order_id uuid references public.orders(id),status text default 'open',created_at timestamptz default now(),updated_at timestamptz default now());
create table if not exists public.user_lists(id uuid primary key default gen_random_uuid(),user_id uuid references public.profiles(id) on delete cascade,type text not null,items jsonb not null default '[]'::jsonb,updated_at timestamptz default now(),unique(user_id,type));
create table if not exists public.payments(id uuid primary key default gen_random_uuid(),user_id uuid references public.profiles(id),order_id uuid references public.orders(id),amount numeric(12,2),currency text default 'MVR',method text,reference text,proof_file_path text,status text default 'pending',created_at timestamptz default now(),updated_at timestamptz default now());
create table if not exists public.subscriptions(id uuid primary key default gen_random_uuid(),user_id uuid references public.profiles(id),plan_id text references public.membership_plans(id),status text,starts_at timestamptz,expires_at timestamptz,payment_id uuid references public.payments(id),auto_renew boolean default false,created_at timestamptz default now());
create table if not exists public.settings(id text primary key,value jsonb not null default '{}'::jsonb,public boolean default false,updated_by uuid,updated_at timestamptz default now(),created_at timestamptz default now());
create table if not exists public.announcements(id uuid primary key default gen_random_uuid(),title text,message text,audience text default 'all',active boolean default true,created_by uuid,created_at timestamptz default now());
create table if not exists public.client_errors(id uuid primary key default gen_random_uuid(),user_id uuid,page text,message text,created_at timestamptz default now());

-- Enable RLS
alter table public.profiles enable row level security; alter table public.categories enable row level security; alter table public.membership_plans enable row level security;
alter table public.seller_profiles enable row level security; alter table public.seller_applications enable row level security; alter table public.products enable row level security;
alter table public.orders enable row level security; alter table public.order_items enable row level security; alter table public.reviews enable row level security;
alter table public.notifications enable row level security; alter table public.conversations enable row level security; alter table public.messages enable row level security;
alter table public.complaints enable row level security; alter table public.user_lists enable row level security; alter table public.payments enable row level security;
alter table public.subscriptions enable row level security; alter table public.settings enable row level security; alter table public.announcements enable row level security; alter table public.client_errors enable row level security;

-- Policies (drop first to allow safe re-run)
do $$ declare r record; begin for r in select schemaname,tablename,policyname from pg_policies where schemaname='public' loop execute format('drop policy if exists %I on %I.%I',r.policyname,r.schemaname,r.tablename); end loop; end $$;
create policy profiles_select on public.profiles for select using(id=auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update using(id=auth.uid() or public.is_admin()) with check(id=auth.uid() or public.is_admin());
create policy public_categories on public.categories for select using(active or public.is_admin()); create policy admin_categories on public.categories for all using(public.is_admin()) with check(public.is_admin());
create policy public_plans on public.membership_plans for select using(active or public.is_admin()); create policy admin_plans on public.membership_plans for all using(public.is_admin()) with check(public.is_admin());
create policy seller_profiles_read on public.seller_profiles for select using(status='approved' or owner_id=auth.uid() or public.is_admin()); create policy seller_profiles_owner on public.seller_profiles for all using(owner_id=auth.uid() or public.is_admin()) with check(owner_id=auth.uid() or public.is_admin());
create policy seller_apps_owner on public.seller_applications for all using(user_id=auth.uid() or public.is_admin()) with check(user_id=auth.uid() or public.is_admin());
create policy products_public on public.products for select using(status='approved' or seller_id=auth.uid() or public.is_admin()); create policy products_insert on public.products for insert with check(seller_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and (p.seller_status='approved' or p.role='admin'))); create policy products_modify on public.products for update using(seller_id=auth.uid() or public.is_admin()) with check(seller_id=auth.uid() or public.is_admin()); create policy products_delete on public.products for delete using(seller_id=auth.uid() or public.is_admin());
create policy orders_read on public.orders for select using(buyer_id=auth.uid() or auth.uid()=any(seller_ids) or public.is_admin()); create policy orders_admin_update on public.orders for update using(public.is_admin() or auth.uid()=any(seller_ids)) with check(public.is_admin() or auth.uid()=any(seller_ids));
create policy items_read on public.order_items for select using(seller_id=auth.uid() or public.is_admin() or exists(select 1 from public.orders o where o.id=order_id and o.buyer_id=auth.uid()));
create policy reviews_read on public.reviews for select using(status='approved' or user_id=auth.uid() or public.is_admin()); create policy reviews_insert on public.reviews for insert with check(user_id=auth.uid()); create policy reviews_owner on public.reviews for update using(user_id=auth.uid() or public.is_admin()); create policy reviews_delete on public.reviews for delete using(user_id=auth.uid() or public.is_admin());
create policy notification_owner on public.notifications for select using(user_id=auth.uid() or public.is_admin()); create policy notification_update on public.notifications for update using(user_id=auth.uid() or public.is_admin());
create policy conversations_members on public.conversations for select using(auth.uid()=any(participant_ids) or public.is_admin()); create policy conversations_insert on public.conversations for insert with check(auth.uid()=any(participant_ids)); create policy conversations_update on public.conversations for update using(auth.uid()=any(participant_ids) or public.is_admin());
create policy messages_members on public.messages for select using(exists(select 1 from public.conversations c where c.id=conversation_id and auth.uid()=any(c.participant_ids)) or public.is_admin()); create policy messages_insert on public.messages for insert with check(sender_id=auth.uid() and exists(select 1 from public.conversations c where c.id=conversation_id and auth.uid()=any(c.participant_ids)));
create policy complaints_owner on public.complaints for select using(user_id=auth.uid() or public.is_admin()); create policy complaints_insert on public.complaints for insert with check(user_id=auth.uid()); create policy complaints_admin on public.complaints for update using(public.is_admin());
create policy lists_owner on public.user_lists for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy payments_owner on public.payments for select using(user_id=auth.uid() or public.is_admin()); create policy payments_insert on public.payments for insert with check(user_id=auth.uid()); create policy payments_admin on public.payments for update using(public.is_admin());
create policy subscriptions_owner on public.subscriptions for select using(user_id=auth.uid() or public.is_admin()); create policy subscriptions_insert on public.subscriptions for insert with check(user_id=auth.uid() and status='pending'); create policy subscriptions_cancel on public.subscriptions for update using(user_id=auth.uid()) with check(user_id=auth.uid() and status='cancel_requested'); create policy subscriptions_admin on public.subscriptions for all using(public.is_admin()) with check(public.is_admin());
create policy settings_public on public.settings for select using(public or public.is_admin()); create policy settings_admin on public.settings for all using(public.is_admin()) with check(public.is_admin());
create policy announcements_public on public.announcements for select using(active or public.is_admin()); create policy announcements_admin on public.announcements for all using(public.is_admin()) with check(public.is_admin());
create policy errors_insert on public.client_errors for insert with check(user_id=auth.uid()); create policy errors_admin on public.client_errors for select using(public.is_admin());

-- Secure transactional checkout. Browser sends product IDs/quantities only; prices are read from DB.
create or replace function public.create_marketplace_order(p_cart jsonb,p_shipping_address text,p_phone text,p_notes text default '',p_payment_method text default 'cash_on_delivery',p_delivery_fee numeric default 0,p_bank_reference text default '') returns uuid language plpgsql security definer set search_path=public as $$
declare v_order uuid:=gen_random_uuid(); v_number text; v_subtotal numeric:=0; v_item jsonb; v_product public.products%rowtype; v_qty integer; v_sellers uuid[]:='{}';
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if jsonb_array_length(p_cart)=0 then raise exception 'Cart is empty'; end if;
 v_number:='DHI-'||to_char(now(),'YYYYMMDD-HH24MISS')||'-'||upper(substr(replace(v_order::text,'-',''),1,6));
 for v_item in select * from jsonb_array_elements(p_cart) loop
   v_qty:=greatest(1,(v_item->>'quantity')::integer);
   select * into v_product from public.products where id=(v_item->>'productId')::uuid and status='approved' for update;
   if not found then raise exception 'A product is unavailable'; end if;
   if v_product.stock<v_qty then raise exception 'Insufficient stock for %',v_product.name; end if;
   v_subtotal:=v_subtotal+(coalesce(v_product.discount_price,v_product.price)*v_qty);
   if not v_product.seller_id=any(v_sellers) then v_sellers:=array_append(v_sellers,v_product.seller_id); end if;
 end loop;
 insert into public.orders(id,order_number,buyer_id,buyer_name,buyer_email,seller_ids,subtotal,delivery_fee,total,currency,status,payment_method,payment_status,shipping_address,phone,notes,bank_reference)
 select v_order,v_number,auth.uid(),p.display_name,p.email,v_sellers,v_subtotal,p_delivery_fee,v_subtotal+p_delivery_fee,'MVR','pending',p_payment_method,'pending',p_shipping_address,p_phone,p_notes,p_bank_reference from public.profiles p where p.id=auth.uid();
 for v_item in select * from jsonb_array_elements(p_cart) loop
   v_qty:=greatest(1,(v_item->>'quantity')::integer); select * into v_product from public.products where id=(v_item->>'productId')::uuid for update;
   insert into public.order_items(order_id,product_id,seller_id,product_name,image_url,unit_price,quantity,subtotal) values(v_order,v_product.id,v_product.seller_id,v_product.name,v_product.images[1],coalesce(v_product.discount_price,v_product.price),v_qty,coalesce(v_product.discount_price,v_product.price)*v_qty);
   update public.products set stock=stock-v_qty,status=case when stock-v_qty=0 then 'sold_out' else status end,updated_at=now() where id=v_product.id;
   insert into public.notifications(user_id,title,message,type,target_url) values(v_product.seller_id,'New order','A customer ordered '||v_product.name,'order','orders.html?id='||v_order);
 end loop;
 return v_order;
end $$;
grant execute on function public.create_marketplace_order(jsonb,text,text,text,text,numeric,text) to authenticated;

-- Storage buckets
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp']),
('profile-images','profile-images',true,3145728,array['image/jpeg','image/png','image/webp']),
('payment-proofs','payment-proofs',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']),
('seller-documents','seller-documents',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Storage policies
create policy "public product images" on storage.objects for select using(bucket_id in ('product-images','profile-images'));
create policy "user uploads product images" on storage.objects for insert to authenticated with check(bucket_id='product-images' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "owner manages product images" on storage.objects for update to authenticated using(bucket_id='product-images' and owner_id=auth.uid()::text);
create policy "owner deletes product images" on storage.objects for delete to authenticated using(bucket_id='product-images' and owner_id=auth.uid()::text);
create policy "private upload owner" on storage.objects for insert to authenticated with check(bucket_id in ('payment-proofs','seller-documents') and (storage.foldername(name))[1]=auth.uid()::text);
create policy "private read owner or admin" on storage.objects for select to authenticated using(bucket_id in ('payment-proofs','seller-documents') and (owner_id=auth.uid()::text or public.is_admin()));

-- Seed data
insert into public.categories(id,name,icon,active,sort_order) values
('electronics','Electronics','fa-tv',true,1),('mobile-phones','Mobile Phones','fa-mobile-screen-button',true,2),('computers','Computers','fa-laptop',true,3),('fashion','Fashion','fa-shirt',true,4),('beauty','Beauty','fa-spa',true,5),('home-furniture','Home and Furniture','fa-couch',true,6),('vehicles','Vehicles','fa-car',true,7),('auto-parts','Auto Parts','fa-gears',true,8),('food-drinks','Food and Drinks','fa-burger',true,9),('sports','Sports','fa-futbol',true,10),('books','Books','fa-book',true,11),('toys','Toys','fa-puzzle-piece',true,12),('health','Health','fa-heart-pulse',true,13),('services','Services','fa-screwdriver-wrench',true,14),('property','Property','fa-building',true,15),('other','Other','fa-layer-group',true,16)
on conflict(id) do update set name=excluded.name,icon=excluded.icon,active=excluded.active,sort_order=excluded.sort_order;
insert into public.membership_plans(id,name,price,listing_limit,fee_percent,featured_limit,badge,benefits,active) values
('bronze','Bronze',99,10,8,0,'Starter',array['Basic seller account','10 active product listings','Standard support'],true),
('silver','Silver',249,75,5,0,'Popular',array['75 active product listings','Lower selling fee','Priority support'],true),
('gold','Gold',499,500,2,15,'Premium',array['High product listing limit','Lowest selling fee','Featured products','Premium badge'],true)
on conflict(id) do update set name=excluded.name,price=excluded.price,listing_limit=excluded.listing_limit,fee_percent=excluded.fee_percent,featured_limit=excluded.featured_limit,badge=excluded.badge,benefits=excluded.benefits,active=excluded.active;
insert into public.settings(id,value,public) values('public','{"cashOnDelivery":true,"bankTransfer":true,"onlinePayment":false,"maintenanceMode":false}'::jsonb,true) on conflict(id) do nothing;
