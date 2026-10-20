-- Sweet Kakes n Treats: phase 1 schema
-- Every synced table has: id (client-generated uuid), owner_id, updated_at (set by the
-- device that made the change), synced_at (set by the server), deleted (soft delete).
-- Devices push rows whose updated_at changed and pull rows whose synced_at is newer
-- than their last pull. On a clash the newest updated_at wins.

create extension if not exists pgcrypto;

-- Who may use the app at all
create table public.allowed_users (
  email text primary key
);
alter table public.allowed_users enable row level security;
insert into public.allowed_users (email) values ('creativecoupledesigns@gmail.com');

create or replace function public.is_allowed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.allowed_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Server sync stamp + last-write-wins guard
create or replace function public.sync_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return old;  -- an older edit arrived late; keep the newer row
  end if;
  new.synced_at := clock_timestamp();
  return new;
end;
$$;

create table public.settings (
  id uuid primary key,                       -- equals owner_id: one row per owner
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  business_name text not null default 'Sweet Kakes n Treats',
  tagline text default 'Homemade goodness in every bite',
  phone text,
  bank_name text,
  bank_account_name text,
  deposit_pct numeric not null default 50,
  labour_rate numeric not null default 0,     -- J$ per hour, changes by season
  margin_pct numeric not null default 0,      -- changes by season
  gct_enabled boolean not null default false,
  gct_pct numeric not null default 15,
  day_hours numeric not null default 8,       -- working hours per day for the workload gauge
  delivery_zones jsonb not null default '[{"id":"kingston","name":"Kingston","min":500,"max":700},{"id":"outside","name":"Outside Kingston (Portmore, Spanish Town)","min":800,"max":900}]',
  updated_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table public.customers (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  phone text,
  notes text,
  updated_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table public.products (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  line text not null default 'menu' check (line in ('menu','custom','seasonal')),
  sizes jsonb not null default '[]',          -- e.g. ["6\"","8\"","9\"","10\""]
  base_price numeric,                         -- optional default price
  prep_minutes int not null default 60,
  bake_minutes int not null default 60,
  active boolean not null default true,
  sort int not null default 0,
  updated_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table public.orders (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  order_no text not null,
  customer_id uuid,
  due_at timestamptz not null,
  status text not null default 'enquiry'
    check (status in ('enquiry','confirmed','baking','decorating','ready','collected','cancelled')),
  handover text not null default 'pickup' check (handover in ('pickup','kingston','outside')),
  delivery_address text,
  delivery_fee numeric not null default 0,
  price numeric not null default 0,           -- her final price for the items
  deposit_pct numeric not null default 50,
  notes text,
  updated_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table public.order_items (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  order_id uuid not null,
  product_id uuid,
  name text not null,
  size text,
  quantity int not null default 1,
  notes text,
  work_minutes int not null default 120,
  updated_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table public.payments (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  order_id uuid not null,
  amount numeric not null,
  method text not null default 'bank' check (method in ('bank','cash')),
  kind text not null default 'deposit' check (kind in ('deposit','balance','other')),
  paid_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table public.order_photos (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  order_id uuid not null,
  path text not null,                         -- object path in the order-photos bucket
  updated_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table public.recipes (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  category text,
  ingredients text,
  method text,
  notes text,
  updated_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  deleted boolean not null default false
);

-- Indexes, triggers and row-level security for every synced table
do $$
declare t text;
begin
  foreach t in array array['settings','customers','products','orders','order_items','payments','order_photos','recipes']
  loop
    execute format('create index %1$s_owner_synced on public.%1$I (owner_id, synced_at)', t);
    execute format('create trigger %1$s_sync_stamp before insert or update on public.%1$I for each row execute function public.sync_stamp()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: owner reads" on public.%1$I for select to authenticated using (owner_id = (select auth.uid()) and (select public.is_allowed()))', t);
    execute format('create policy "%1$s: owner inserts" on public.%1$I for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.is_allowed()))', t);
    execute format('create policy "%1$s: owner updates" on public.%1$I for update to authenticated using (owner_id = (select auth.uid()) and (select public.is_allowed())) with check (owner_id = (select auth.uid()))', t);
  end loop;
end $$;

create index order_items_order on public.order_items (order_id);
create index payments_order on public.payments (order_id);
create index order_photos_order on public.order_photos (order_id);

-- Private bucket for customers' reference photos; each user writes under a folder named by their id
insert into storage.buckets (id, name, public) values ('order-photos', 'order-photos', false)
on conflict (id) do nothing;

create policy "order photos: owner reads" on storage.objects for select to authenticated
  using (bucket_id = 'order-photos' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.is_allowed()));
create policy "order photos: owner uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'order-photos' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.is_allowed()));
