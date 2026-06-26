-- Stokk inventory schema for Supabase (Postgres). Mirrors the previous
-- Prisma models (products, inventory, consumption_history) so the rest of
-- the app's business logic (velocity tiers, budget shield, half-tube split)
-- carries over unchanged.

create extension if not exists pgcrypto;

create table products (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  line text not null,
  shade_code text not null,
  sku text not null unique,
  ideal_stock_level double precision not null,
  -- Manual override so a manager can force a slow-moving shade onto the
  -- active weekly order sheet even though its usage velocity would
  -- otherwise hold it in the Pending Budget Review queue.
  budget_override boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand, line, shade_code)
);

create table inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references products (id) on delete restrict,
  -- The "half-tube" split: a sealed, full box (full_quantity) is tracked
  -- distinctly from a partially-used backbar tube (partial_quantity, e.g. 0.5).
  full_quantity integer not null default 0,
  partial_quantity double precision not null default 0,
  last_scanned_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Every consumption event (a color-tab scan logging tubes used on a client)
-- lands here, dated and timestamped, so reorder velocity can be computed
-- from real historical usage instead of a flat par-level threshold.
create table consumption_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete restrict,
  quantity_used double precision not null,
  scan_mode text not null,
  recorded_at timestamptz not null default now()
);

create index consumption_history_product_id_idx on consumption_history (product_id);
create index consumption_history_recorded_at_idx on consumption_history (recorded_at);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger products_set_updated_at
  before update on products
  for each row execute function set_updated_at();

create trigger inventory_set_updated_at
  before update on inventory
  for each row execute function set_updated_at();

-- RLS: this app has no end-user auth layer (it's a single-stockroom staff
-- tool), so policies are left permissive for both anon and authenticated
-- roles. Tighten these before exposing the project beyond a single trusted
-- team if it ever needs per-user isolation.
alter table products enable row level security;
alter table inventory enable row level security;
alter table consumption_history enable row level security;

create policy "products_all" on products for all using (true) with check (true);
create policy "inventory_all" on inventory for all using (true) with check (true);
create policy "consumption_history_all" on consumption_history for all using (true) with check (true);
