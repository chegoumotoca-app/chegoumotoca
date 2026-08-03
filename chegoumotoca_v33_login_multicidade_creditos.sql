-- Chegou Motoca v33
-- Base de login por usuário/senha (sem senha no código), cidade Taquaritinga,
-- usuários de teste e fluxo de créditos com PIX configurável.
-- Rode no Supabase SQL Editor antes de subir/testar a v33.

create extension if not exists pgcrypto;

-- 1) Cidade/operação inicial
create table if not exists public.app_cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  state text not null default 'SP',
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.app_cities (id, name, state, slug, is_active)
values
  ('10000000-0000-4000-8000-000000000000', 'Plataforma Geral', 'BR', 'plataforma-geral', true),
  ('10000000-0000-4000-8000-000000000001', 'Taquaritinga', 'SP', 'taquaritinga-sp', true)
on conflict (slug) do update set name = excluded.name, state = excluded.state, is_active = excluded.is_active;

-- 2) Estruturas mínimas usadas pelo app
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  phone text,
  email text,
  status text default 'ativo',
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists status text default 'ativo';
alter table public.profiles add column if not exists created_at timestamptz default now();

create table if not exists public.establishments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid,
  trade_name text,
  cnpj text,
  phone text,
  whatsapp text,
  city text,
  state text,
  status text default 'ativo',
  created_at timestamptz not null default now()
);

alter table public.establishments add column if not exists profile_id uuid;
alter table public.establishments add column if not exists trade_name text;
alter table public.establishments add column if not exists cnpj text;
alter table public.establishments add column if not exists phone text;
alter table public.establishments add column if not exists whatsapp text;
alter table public.establishments add column if not exists city text;
alter table public.establishments add column if not exists state text;
alter table public.establishments add column if not exists status text default 'ativo';
alter table public.establishments add column if not exists created_at timestamptz default now();
alter table public.establishments add column if not exists legal_name text;
alter table public.establishments add column if not exists document_number text;
alter table public.establishments add column if not exists base_address text;
alter table public.establishments add column if not exists base_lat numeric(12,8);
alter table public.establishments add column if not exists base_lng numeric(12,8);
alter table public.establishments add column if not exists distance_radius_km numeric(8,2) default 3;
alter table public.establishments add column if not exists address_status text default 'pendente';
alter table public.establishments add column if not exists address text;
alter table public.establishments add column if not exists responsible_name text;

create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid,
  full_name text,
  whatsapp text,
  pix_key text,
  vehicle_plate text,
  city text,
  state text,
  status text default 'ativo',
  online_now boolean default false,
  profile_photo_url text,
  created_at timestamptz not null default now()
);

alter table public.riders add column if not exists profile_id uuid;
alter table public.riders add column if not exists full_name text;
alter table public.riders add column if not exists whatsapp text;
alter table public.riders add column if not exists pix_key text;
alter table public.riders add column if not exists vehicle_plate text;
alter table public.riders add column if not exists city text;
alter table public.riders add column if not exists state text;
alter table public.riders add column if not exists status text default 'ativo';
alter table public.riders add column if not exists online_now boolean default false;
alter table public.riders add column if not exists profile_photo_url text;
alter table public.riders add column if not exists cpf text;
alter table public.riders add column if not exists created_at timestamptz default now();

create table if not exists public.establishment_wallets (
  establishment_id uuid primary key references public.establishments(id) on delete cascade,
  approved_balance numeric(10,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_requests (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  amount numeric(10,2) not null,
  status text not null default 'pendente',
  request_channel text not null default 'plataforma',
  attachment_name text,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  notes text
);

alter table public.credit_requests add column if not exists establishment_id uuid;
alter table public.credit_requests add column if not exists amount numeric(10,2);
alter table public.credit_requests add column if not exists status text default 'pendente';
alter table public.credit_requests add column if not exists request_channel text default 'plataforma';
alter table public.credit_requests add column if not exists attachment_name text;
alter table public.credit_requests add column if not exists requested_at timestamptz default now();
alter table public.credit_requests add column if not exists reviewed_at timestamptz;
alter table public.credit_requests add column if not exists notes text;
alter table public.credit_requests add column if not exists city_id uuid;
alter table public.credit_requests add column if not exists requested_by_user_id uuid;



-- v33: preparação multi-cidade para filtros futuros
alter table public.establishments add column if not exists city_id uuid;
alter table public.riders add column if not exists city_id uuid;
do $$ begin
  alter table public.bags add column if not exists city_id uuid;
exception when undefined_table then null; end $$;

update public.establishments set city_id = '10000000-0000-4000-8000-000000000001' where city_id is null;
update public.riders set city_id = '10000000-0000-4000-8000-000000000001' where city_id is null;
update public.credit_requests set city_id = '10000000-0000-4000-8000-000000000001' where city_id is null;

-- 3) Configurações da plataforma/cidade: PIX, contato, valores e taxa
create table if not exists public.payment_settings (
  id uuid primary key default gen_random_uuid(),
  brand_name text default 'Chegou Motoca',
  city_name text default 'Taquaritinga',
  state text default 'SP',
  support_whatsapp text,
  support_email text,
  support_phone text,
  pix_key text,
  pix_receiver_name text,
  normal_delivery_value numeric(10,2) default 8,
  distant_delivery_value numeric(10,2) default 10,
  platform_fee_percent numeric(5,2) default 10,
  updated_at timestamptz not null default now()
);

alter table public.payment_settings add column if not exists brand_name text default 'Chegou Motoca';
alter table public.payment_settings add column if not exists city_name text default 'Taquaritinga';
alter table public.payment_settings add column if not exists state text default 'SP';
alter table public.payment_settings add column if not exists support_whatsapp text;
alter table public.payment_settings add column if not exists support_email text;
alter table public.payment_settings add column if not exists support_phone text;
alter table public.payment_settings add column if not exists pix_key text;
alter table public.payment_settings add column if not exists pix_receiver_name text;
alter table public.payment_settings add column if not exists normal_delivery_value numeric(10,2) default 8;
alter table public.payment_settings add column if not exists distant_delivery_value numeric(10,2) default 10;
alter table public.payment_settings add column if not exists platform_fee_percent numeric(5,2) default 10;
alter table public.payment_settings add column if not exists updated_at timestamptz default now();

insert into public.payment_settings (
  id, brand_name, city_name, state, support_whatsapp, support_email, support_phone,
  pix_key, pix_receiver_name, normal_delivery_value, distant_delivery_value, platform_fee_percent, updated_at
)
values (
  '20000000-0000-4000-8000-000000000001',
  'Chegou Motoca', 'Taquaritinga', 'SP',
  '5517999999999', 'contato@chegoumotoca.com', '(17) 99999-9999',
  'configure-a-chave-pix-no-admin', 'Chegou Motoca', 8, 10, 10, now()
)
on conflict (id) do update set
  brand_name = excluded.brand_name,
  city_name = excluded.city_name,
  state = excluded.state,
  support_whatsapp = coalesce(public.payment_settings.support_whatsapp, excluded.support_whatsapp),
  support_email = coalesce(public.payment_settings.support_email, excluded.support_email),
  support_phone = coalesce(public.payment_settings.support_phone, excluded.support_phone),
  pix_key = coalesce(nullif(public.payment_settings.pix_key, ''), excluded.pix_key),
  pix_receiver_name = coalesce(nullif(public.payment_settings.pix_receiver_name, ''), excluded.pix_receiver_name),
  normal_delivery_value = coalesce(public.payment_settings.normal_delivery_value, excluded.normal_delivery_value),
  distant_delivery_value = coalesce(public.payment_settings.distant_delivery_value, excluded.distant_delivery_value),
  platform_fee_percent = coalesce(public.payment_settings.platform_fee_percent, excluded.platform_fee_percent),
  updated_at = now();

-- 4) Usuários do app. A senha fica em hash; não fica no código.
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  city_id uuid references public.app_cities(id) on delete set null,
  role text not null check (role in ('superadmin','admin','estabelecimento','motoboy')),
  username text not null,
  email text,
  document_number text,
  display_name text not null,
  password_hash text not null,
  entity_id uuid,
  is_active boolean not null default true,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  unique (city_id, username)
);

alter table public.app_users add column if not exists city_id uuid;
alter table public.app_users add column if not exists role text;
alter table public.app_users add column if not exists username text;
alter table public.app_users add column if not exists email text;
alter table public.app_users add column if not exists document_number text;
alter table public.app_users add column if not exists display_name text;
alter table public.app_users add column if not exists password_hash text;
alter table public.app_users add column if not exists entity_id uuid;
alter table public.app_users add column if not exists is_active boolean default true;
alter table public.app_users add column if not exists must_change_password boolean default false;
alter table public.app_users add column if not exists created_at timestamptz default now();

-- Perfis e entidades de teste em Taquaritinga
insert into public.profiles (id, role, full_name, phone, email, status, created_at)
values
  ('30000000-0000-4000-8000-000000000000', 'superadmin', 'Superadmin Chegou Motoca', null, 'superadmin@chegoumotoca.local', 'ativo', now()),
  ('30000000-0000-4000-8000-000000000001', 'admin', 'Administrador Taquaritinga', null, 'admin@chegoumotoca.local', 'ativo', now()),
  ('30000000-0000-4000-8000-000000000002', 'estabelecimento', 'Speed Teste', '(17) 99999-0001', 'speed_teste@chegoumotoca.local', 'ativo', now()),
  ('30000000-0000-4000-8000-000000000003', 'motoboy', 'Motoca Teste', '(17) 99999-0002', 'motoca_teste@chegoumotoca.local', 'ativo', now())
on conflict (id) do update set role = excluded.role, full_name = excluded.full_name, phone = excluded.phone, email = excluded.email, status = excluded.status;

insert into public.establishments (id, profile_id, trade_name, legal_name, cnpj, document_number, phone, whatsapp, city, state, status, base_address, distance_radius_km, address_status, created_at)
values (
  '40000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002',
  'Speed Teste Taquaritinga', 'Speed Teste Taquaritinga', '00000000000191', '00000000000191',
  '(17) 99999-0001', '5517999990001', 'Taquaritinga', 'SP', 'ativo',
  'Centro, Taquaritinga/SP', 3, 'aprovado', now()
)
on conflict (id) do update set
  trade_name = excluded.trade_name,
  legal_name = excluded.legal_name,
  cnpj = excluded.cnpj,
  document_number = excluded.document_number,
  whatsapp = excluded.whatsapp,
  city = excluded.city,
  state = excluded.state,
  status = excluded.status,
  base_address = excluded.base_address,
  distance_radius_km = excluded.distance_radius_km,
  address_status = excluded.address_status;

insert into public.riders (id, profile_id, full_name, whatsapp, pix_key, vehicle_plate, city, state, status, online_now, profile_photo_url, created_at)
values (
  '50000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000003',
  'Motoca Teste', '5517999990002', 'motoca_teste_pix', 'ABC1D23', 'Taquaritinga', 'SP', 'ativo', true, null, now()
)
on conflict (id) do update set
  full_name = excluded.full_name,
  whatsapp = excluded.whatsapp,
  pix_key = excluded.pix_key,
  vehicle_plate = excluded.vehicle_plate,
  city = excluded.city,
  state = excluded.state,
  status = excluded.status,
  online_now = excluded.online_now;

insert into public.establishment_wallets (establishment_id, approved_balance, updated_at)
values ('40000000-0000-4000-8000-000000000001', 0, now())
on conflict (establishment_id) do update set updated_at = now();

-- Hash simples para MVP sem depender de crypt/gen_salt no runtime do Supabase.
-- A senha não fica no código do frontend. Para produção, migrar para Supabase Auth.
create or replace function public.chm_password_hash(p_username text, p_password text)
returns text
language sql
immutable
as $$
  select 'v33$' || md5(lower(trim(coalesce(p_username, ''))) || ':' || coalesce(p_password, '') || ':chegoumotoca_v33');
$$;

-- Usuários de teste solicitados
insert into public.app_users (id, city_id, role, username, email, document_number, display_name, password_hash, entity_id, is_active, must_change_password, created_at)
values
  ('60000000-0000-4000-8000-000000000000', '10000000-0000-4000-8000-000000000000', 'superadmin', 'superadmin', 'superadmin@chegoumotoca.local', null, 'Superadmin Chegou Motoca', public.chm_password_hash('superadmin', 'ak2026153143'), null, true, false, now()),
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'admin', 'admin', 'admin@chegoumotoca.local', null, 'Administrador Taquaritinga', public.chm_password_hash('admin', 'ak2026153143'), null, true, false, now()),
  ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'estabelecimento', 'speed_teste', 'speed_teste@chegoumotoca.local', '00000000000191', 'Speed Teste Taquaritinga', public.chm_password_hash('speed_teste', '123456'), '40000000-0000-4000-8000-000000000001', true, false, now()),
  ('60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'motoboy', 'motoca_teste', 'motoca_teste@chegoumotoca.local', '12345678909', 'Motoca Teste', public.chm_password_hash('motoca_teste', '123456'), '50000000-0000-4000-8000-000000000001', true, false, now())
on conflict (city_id, username) do update set
  role = excluded.role,
  email = excluded.email,
  document_number = excluded.document_number,
  display_name = excluded.display_name,
  password_hash = excluded.password_hash,
  entity_id = excluded.entity_id,
  is_active = excluded.is_active;

-- Função de login. A tabela app_users não precisa ficar exposta para select direto.
create or replace function public.chm_login(p_identifier text, p_password text, p_city_slug text default 'taquaritinga-sp')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.app_users%rowtype;
  v_city public.app_cities%rowtype;
  v_identifier text := lower(trim(coalesce(p_identifier, '')));
begin
  if v_identifier = '' or coalesce(p_password, '') = '' then
    return null;
  end if;

  select * into v_city
  from public.app_cities
  where slug = coalesce(nullif(p_city_slug, ''), 'taquaritinga-sp') and is_active = true
  limit 1;

  if v_city.id is null then
    return null;
  end if;

  select * into v_user
  from public.app_users u
  where u.is_active = true
    and (u.city_id = v_city.id or u.role = 'superadmin')
    and (
      lower(u.username) = v_identifier
      or lower(coalesce(u.email, '')) = v_identifier
      or regexp_replace(coalesce(u.document_number, ''), '\\D', '', 'g') = regexp_replace(v_identifier, '\\D', '', 'g')
    )
  limit 1;

  if v_user.id is null then
    return null;
  end if;

  if v_user.password_hash <> public.chm_password_hash(v_user.username, p_password) then
    return null;
  end if;

  return jsonb_build_object(
    'user_id', v_user.id,
    'role', v_user.role,
    'username', v_user.username,
    'display_name', v_user.display_name,
    'city_id', v_city.id,
    'city_name', v_city.name || '/' || v_city.state,
    'city_slug', v_city.slug,
    'entity_id', v_user.entity_id,
    'created_at', now()
  );
end;
$$;

grant execute on function public.chm_login(text, text, text) to anon, authenticated;

-- Políticas liberais para MVP/testes com anon key. Endurecer antes da produção final.
do $$
begin
  alter table public.app_users enable row level security;
  -- app_users: sem policy de select. Login passa apenas pela função chm_login.
exception when others then null;
end $$;

-- Se RLS estiver ligado nas tabelas operacionais, estas policies permitem teste pelo app.
do $$
declare
  tbl text;
begin
  foreach tbl in array array['profiles','establishments','riders','establishment_wallets','credit_requests','payment_settings','bags','bag_deliveries','bag_attempts','bag_proofs','bag_events','bag_disputes','bag_attempt_rider_actions','registration_applications'] loop
    begin
      execute format('alter table public.%I enable row level security', tbl);
      execute format('drop policy if exists "%s_mvp_all" on public.%I', tbl, tbl);
      execute format('create policy "%s_mvp_all" on public.%I for all to anon, authenticated using (true) with check (true)', tbl, tbl);
    exception when undefined_table then
      null;
    end;
  end loop;
end $$;

-- Cria/atualiza usuário de app depois que o admin aprovar cadastro ou cadastro manual.
create or replace function public.chm_upsert_app_user(
  p_city_slug text,
  p_role text,
  p_username text,
  p_password text,
  p_display_name text,
  p_email text default null,
  p_document_number text default null,
  p_entity_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_city_id uuid;
  v_user_id uuid;
begin
  if p_role not in ('admin','estabelecimento','motoboy','superadmin') then
    raise exception 'Perfil inválido';
  end if;
  if length(coalesce(p_password, '')) < 4 or length(coalesce(p_password, '')) > 20 then
    raise exception 'Senha inválida';
  end if;

  select id into v_city_id from public.app_cities where slug = coalesce(nullif(p_city_slug, ''), 'taquaritinga-sp') limit 1;
  if v_city_id is null then
    raise exception 'Cidade não encontrada';
  end if;

  insert into public.app_users (city_id, role, username, email, document_number, display_name, password_hash, entity_id, is_active, must_change_password)
  values (v_city_id, p_role, lower(trim(p_username)), nullif(p_email, ''), nullif(p_document_number, ''), p_display_name, public.chm_password_hash(p_username, p_password), p_entity_id, true, false)
  on conflict (city_id, username) do update set
    role = excluded.role,
    email = excluded.email,
    document_number = excluded.document_number,
    display_name = excluded.display_name,
    password_hash = excluded.password_hash,
    entity_id = excluded.entity_id,
    is_active = true
  returning id into v_user_id;

  return v_user_id;
end;
$$;

grant execute on function public.chm_upsert_app_user(text, text, text, text, text, text, text, uuid) to anon, authenticated;
