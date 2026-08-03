-- Chegou Motoca v50 — painel admin, feedback e raio persistente
-- Rode este arquivo no SQL Editor do Supabase depois da v45.

alter table public.establishments
  add column if not exists normal_radius_km numeric(8,2) default 3,
  add column if not exists base_latitude double precision,
  add column if not exists base_longitude double precision,
  add column if not exists base_address text,
  add column if not exists responsible_name text,
  add column if not exists address text;

create table if not exists public.app_feedbacks (
  id text primary key,
  name text not null,
  email text,
  whatsapp text,
  kind text not null default 'sugestao' check (kind in ('sugestao','problema','elogio','contato')),
  message text not null,
  status text not null default 'novo' check (status in ('novo','em_analise','resolvido')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.app_feedbacks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'app_feedbacks'
      and policyname = 'app_feedbacks_all'
  ) then
    create policy app_feedbacks_all on public.app_feedbacks
      for all using (true) with check (true);
  end if;
end $$;

create index if not exists idx_app_feedbacks_status_created
  on public.app_feedbacks(status, created_at desc);

create or replace view public.admin_delivery_radius_review as
select
  e.id,
  e.trade_name,
  e.status,
  coalesce(e.base_address, e.address) as base_address,
  e.normal_radius_km,
  e.base_latitude,
  e.base_longitude
from public.establishments e
order by e.trade_name;

select 'v50_ok' as status;
