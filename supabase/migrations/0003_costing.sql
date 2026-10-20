-- Phase 2: ingredient and packaging prices, costing worksheets, and the cost settings from her price sheet.

alter table public.settings
  add column overhead jsonb not null default '[{"name":"Depreciation","pct":10},{"name":"Electricity","pct":10},{"name":"Water","pct":12},{"name":"Rent","pct":1},{"name":"Traveling","pct":20},{"name":"Consultation","pct":30}]',
  add column gas_cylinder_price numeric not null default 5500,
  add column gas_cylinder_lb numeric not null default 30,
  add column gas_lb_per_hour numeric not null default 0.4;

-- One list for everything she buys. Ingredients carry a buffer (markup) on top of the pack price;
-- packaging is costed at its plain price.
create table public.ingredients (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null default 'ingredient' check (kind in ('ingredient','packaging')),
  name text not null,
  pack_price numeric not null default 0,   -- J$ paid for the pack
  pack_qty numeric,                        -- how many units are in the pack
  unit text,                               -- cup, oz, g, amt, floz, lb, ml, kg, tsp …
  markup_pct numeric not null default 60,  -- buffer added to the unit cost
  store text,
  notes text,
  needs_check boolean not null default false,
  updated_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  deleted boolean not null default false
);

-- A costing worksheet for one cake or batch: ingredient lines, packaging lines and hours.
create table public.costings (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  product_id uuid,
  size text,
  recipe_id uuid,
  lines jsonb not null default '[]',       -- [{ "ingredient_id": uuid, "qty": number }]
  packaging jsonb not null default '[]',   -- [{ "ingredient_id": uuid, "qty": number }]
  bake_hours numeric not null default 0,   -- drives the gas cost
  labour_hours numeric not null default 0,
  selling_price numeric,                   -- what she charges today, for comparison
  notes text,
  updated_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  deleted boolean not null default false
);

do $$
declare t text;
begin
  foreach t in array array['ingredients','costings']
  loop
    execute format('create index %1$s_owner_synced on public.%1$I (owner_id, synced_at)', t);
    execute format('create trigger %1$s_sync_stamp before insert or update on public.%1$I for each row execute function public.sync_stamp()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: owner reads" on public.%1$I for select to authenticated using (owner_id = (select auth.uid()) and (select public.is_allowed()))', t);
    execute format('create policy "%1$s: owner inserts" on public.%1$I for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.is_allowed()))', t);
    execute format('create policy "%1$s: owner updates" on public.%1$I for update to authenticated using (owner_id = (select auth.uid()) and (select public.is_allowed())) with check (owner_id = (select auth.uid()))', t);
  end loop;
end $$;
