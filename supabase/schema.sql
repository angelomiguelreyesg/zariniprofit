-- =============================================================
-- ZariniProfit - Esquema de base de datos (Supabase / Postgres)
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- =============================================================

-- 1. Tabla de perfiles (extiende auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nombre text,
  nombre_negocio text,
  moneda text not null default 'COP',
  created_at timestamptz not null default now()
);

-- 2. Productos / Inventario
create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null,
  categoria text,
  precio_venta numeric(14,2) not null default 0,
  costo numeric(14,2) not null default 0,
  stock numeric(14,2) not null default 0,
  imagen_url text,
  created_at timestamptz not null default now()
);

-- 3. Ventas
create table if not exists public.ventas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  producto_id uuid references public.productos (id) on delete set null,
  descripcion text,
  cantidad numeric(14,2) not null default 1,
  precio_unitario numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  metodo_pago text not null default 'Efectivo',
  fecha timestamptz not null default now()
);

-- 4. Gastos
create table if not exists public.gastos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  descripcion text not null,
  monto numeric(14,2) not null default 0,
  categoria text,
  fecha timestamptz not null default now()
);

-- =============================================================
-- Índices
-- =============================================================
create index if not exists productos_user_idx on public.productos (user_id, created_at desc);
create index if not exists ventas_user_fecha_idx on public.ventas (user_id, fecha desc);
create index if not exists gastos_user_fecha_idx on public.gastos (user_id, fecha desc);

-- =============================================================
-- Row Level Security (RLS)
-- =============================================================
alter table public.profiles enable row level security;
alter table public.productos enable row level security;
alter table public.ventas enable row level security;
alter table public.gastos enable row level security;

-- Profiles
drop policy if exists "Perfil propio visible/editable" on public.profiles;
create policy "Perfil propio visible/editable" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Productos
drop policy if exists "Productos propios" on public.productos;
create policy "Productos propios" on public.productos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Ventas
drop policy if exists "Ventas propias" on public.ventas;
create policy "Ventas propias" on public.ventas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Gastos
drop policy if exists "Gastos propios" on public.gastos;
create policy "Gastos propios" on public.gastos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================
-- Trigger: crea perfil automáticamente al registrarse
-- =============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, nombre, nombre_negocio)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nombre', ''),
    coalesce(new.raw_user_meta_data ->> 'nombre_negocio', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
