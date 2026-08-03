-- Chegou Motoca v36
-- Correção do login/vínculo de estabelecimento + funções resilientes.
-- Rode este SQL inteiro no Supabase antes de testar a v36.

create extension if not exists pgcrypto;

-- Limpa assinaturas antigas que podem impedir CREATE OR REPLACE quando muda retorno.
drop function if exists public.chm_login(text, text, text);
drop function if exists public.chm_list_admin_users();
drop function if exists public.chm_upsert_app_user(text, text, text, text, text, text, text, text, uuid);
drop function if exists public.chm_create_admin_user(text, text, text, text, text, text, text);
drop function if exists public.chm_reset_app_user_password(uuid, text);
drop function if exists public.chm_reset_entity_password(text, uuid, text);
drop function if exists public.chm_actor_is_superadmin(uuid, text);
drop function if exists public.chm_reset_admin_password_secure(uuid, text, uuid, text);
drop function if exists public.chm_set_admin_active_secure(uuid, text, uuid, boolean);
drop function if exists public.chm_remove_admin_access_secure(uuid, text, uuid);

-- Estruturas necessárias, sem apagar dados existentes.
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

alter table if exists public.profiles add column if not exists role text;
alter table if exists public.profiles add column if not exists full_name text;
alter table if exists public.profiles add column if not exists phone text;
alter table if exists public.profiles add column if not exists email text;
alter table if exists public.profiles add column if not exists status text default 'ativo';

alter table if exists public.establishments add column if not exists profile_id uuid;
alter table if exists public.establishments add column if not exists trade_name text;
alter table if exists public.establishments add column if not exists legal_name text;
alter table if exists public.establishments add column if not exists cnpj text;
alter table if exists public.establishments add column if not exists document_number text;
alter table if exists public.establishments add column if not exists phone text;
alter table if exists public.establishments add column if not exists whatsapp text;
alter table if exists public.establishments add column if not exists city text;
alter table if exists public.establishments add column if not exists state text;
alter table if exists public.establishments add column if not exists status text default 'ativo';
alter table if exists public.establishments add column if not exists city_id uuid;
alter table if exists public.establishments add column if not exists base_address text;
alter table if exists public.establishments add column if not exists address text;
alter table if exists public.establishments add column if not exists responsible_name text;
alter table if exists public.establishments add column if not exists distance_radius_km numeric(8,2) default 3;
alter table if exists public.establishments add column if not exists address_status text default 'pendente';

alter table if exists public.riders add column if not exists profile_id uuid;
alter table if exists public.riders add column if not exists whatsapp text;
alter table if exists public.riders add column if not exists pix_key text;
alter table if exists public.riders add column if not exists vehicle_plate text;
alter table if exists public.riders add column if not exists city text;
alter table if exists public.riders add column if not exists state text;
alter table if exists public.riders add column if not exists status text default 'ativo';
alter table if exists public.riders add column if not exists online_now boolean default false;
alter table if exists public.riders add column if not exists profile_photo_url text;
alter table if exists public.riders add column if not exists city_id uuid;
alter table if exists public.riders add column if not exists cpf text;

create table if not exists public.establishment_wallets (
  establishment_id uuid primary key references public.establishments(id) on delete cascade,
  approved_balance numeric(10,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  city_id uuid references public.app_cities(id) on delete set null,
  role text not null check (role in ('superadmin','admin','estabelecimento','motoboy')),
  username text not null,
  email text,
  phone text,
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
alter table public.app_users add column if not exists phone text;
alter table public.app_users add column if not exists document_number text;
alter table public.app_users add column if not exists display_name text;
alter table public.app_users add column if not exists password_hash text;
alter table public.app_users add column if not exists entity_id uuid;
alter table public.app_users add column if not exists is_active boolean default true;
alter table public.app_users add column if not exists must_change_password boolean default false;
alter table public.app_users add column if not exists created_at timestamptz default now();

create table if not exists public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  target_user_id uuid,
  action text not null,
  city_id uuid,
  details text,
  created_at timestamptz not null default now()
);

-- Hash simples do MVP. Não expõe senha no frontend.
create or replace function public.chm_password_hash(p_username text, p_password text)
returns text
language sql
immutable
as $$
  select 'v33$' || md5(lower(trim(coalesce(p_username, ''))) || ':' || coalesce(p_password, '') || ':chegoumotoca_v33');
$$;

-- Reforça usuários de teste e vínculo exato do estabelecimento.
insert into public.profiles (id, role, full_name, phone, email, status, created_at)
values
  ('30000000-0000-4000-8000-000000000000', 'admin', 'Superadmin Chegou Motoca', null, 'superadmin@chegoumotoca.local', 'ativo', now()),
  ('30000000-0000-4000-8000-000000000001', 'admin', 'Administrador Taquaritinga', null, 'admin@chegoumotoca.local', 'ativo', now()),
  ('30000000-0000-4000-8000-000000000002', 'estabelecimento', 'Speed Teste', '(17) 99999-0001', 'speed_teste@chegoumotoca.local', 'ativo', now()),
  ('30000000-0000-4000-8000-000000000003', 'motoboy', 'Motoca Teste', '(17) 99999-0002', 'motoca_teste@chegoumotoca.local', 'ativo', now())
on conflict (id) do update set full_name = excluded.full_name, phone = excluded.phone, email = excluded.email, status = excluded.status;

insert into public.establishments (id, profile_id, trade_name, legal_name, cnpj, document_number, phone, whatsapp, city, state, status, base_address, address, responsible_name, distance_radius_km, address_status, city_id, created_at)
values (
  '40000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002',
  'Speed Teste Taquaritinga', 'Speed Teste Taquaritinga', '00000000000191', '00000000000191',
  '(17) 99999-0001', '5517999990001', 'Taquaritinga', 'SP', 'ativo',
  'Centro, Taquaritinga/SP', 'Centro, Taquaritinga/SP', 'Responsável teste', 3, 'aprovado', '10000000-0000-4000-8000-000000000001', now()
)
on conflict (id) do update set
  profile_id = excluded.profile_id,
  trade_name = excluded.trade_name,
  legal_name = excluded.legal_name,
  cnpj = excluded.cnpj,
  document_number = excluded.document_number,
  phone = excluded.phone,
  whatsapp = excluded.whatsapp,
  city = excluded.city,
  state = excluded.state,
  status = excluded.status,
  base_address = excluded.base_address,
  address = excluded.address,
  responsible_name = excluded.responsible_name,
  distance_radius_km = excluded.distance_radius_km,
  address_status = excluded.address_status,
  city_id = excluded.city_id;

insert into public.riders (id, profile_id, full_name, whatsapp, pix_key, vehicle_plate, city, state, status, online_now, profile_photo_url, city_id, created_at)
values (
  '50000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000003',
  'Motoca Teste', '5517999990002', 'motoca_teste_pix', 'ABC1D23', 'Taquaritinga', 'SP', 'ativo', true, null, '10000000-0000-4000-8000-000000000001', now()
)
on conflict (id) do update set whatsapp = excluded.whatsapp, pix_key = excluded.pix_key, vehicle_plate = excluded.vehicle_plate, city = excluded.city, state = excluded.state, status = excluded.status, online_now = excluded.online_now, city_id = excluded.city_id;

insert into public.establishment_wallets (establishment_id, approved_balance, updated_at)
values ('40000000-0000-4000-8000-000000000001', 0, now())
on conflict (establishment_id) do update set updated_at = now();

insert into public.app_users (id, city_id, role, username, email, phone, document_number, display_name, password_hash, entity_id, is_active, must_change_password, created_at)
values
  ('60000000-0000-4000-8000-000000000000', '10000000-0000-4000-8000-000000000000', 'superadmin', 'superadmin', 'superadmin@chegoumotoca.local', null, null, 'Superadmin Chegou Motoca', public.chm_password_hash('superadmin', 'ak2026153143'), null, true, false, now()),
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'admin', 'admin', 'admin@chegoumotoca.local', null, null, 'Administrador Taquaritinga', public.chm_password_hash('admin', 'ak2026153143'), null, true, false, now()),
  ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'estabelecimento', 'speed_teste', 'speed_teste@chegoumotoca.local', '17999990001', '00000000000191', 'Speed Teste Taquaritinga', public.chm_password_hash('speed_teste', '123456'), '40000000-0000-4000-8000-000000000001', true, false, now()),
  ('60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'motoboy', 'motoca_teste', 'motoca_teste@chegoumotoca.local', '17999990002', '12345678909', 'Motoca Teste', public.chm_password_hash('motoca_teste', '123456'), '50000000-0000-4000-8000-000000000001', true, false, now())
on conflict (city_id, username) do update set
  role = excluded.role,
  email = excluded.email,
  phone = excluded.phone,
  document_number = excluded.document_number,
  display_name = excluded.display_name,
  password_hash = excluded.password_hash,
  entity_id = excluded.entity_id,
  is_active = excluded.is_active,
  must_change_password = excluded.must_change_password;

-- Repara estabelecimentos aprovados que ficaram sem usuário ou com vínculo errado.
update public.app_users u
   set entity_id = e.id,
       phone = coalesce(nullif(u.phone, ''), regexp_replace(coalesce(e.whatsapp, e.phone, ''), '\\D', '', 'g')),
       document_number = coalesce(nullif(u.document_number, ''), regexp_replace(coalesce(e.document_number, e.cnpj, ''), '\\D', '', 'g')),
       display_name = coalesce(nullif(u.display_name, ''), e.trade_name)
  from public.establishments e
 where u.role = 'estabelecimento'
   and u.city_id = coalesce(e.city_id, u.city_id)
   and (
     lower(u.display_name) = lower(coalesce(e.trade_name, e.legal_name, u.display_name))
     or regexp_replace(coalesce(u.document_number, ''), '\\D', '', 'g') = regexp_replace(coalesce(e.document_number, e.cnpj, ''), '\\D', '', 'g')
     or regexp_replace(coalesce(u.phone, ''), '\\D', '', 'g') = regexp_replace(coalesce(e.whatsapp, e.phone, ''), '\\D', '', 'g')
   )
   and (u.entity_id is null or not exists (select 1 from public.establishments ee where ee.id = u.entity_id));

-- Função de upsert usada quando admin aprova cadastro ou cria acesso manual.
create or replace function public.chm_upsert_app_user(
  p_city_slug text,
  p_role text,
  p_username text,
  p_password text,
  p_display_name text,
  p_email text default null,
  p_phone text default null,
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
  if p_role in ('admin','superadmin') then
    if length(coalesce(p_password, '')) < 8 then raise exception 'Senha administrativa deve ter pelo menos 8 caracteres'; end if;
  else
    if length(coalesce(p_password, '')) < 4 or length(coalesce(p_password, '')) > 6 then raise exception 'Senha deve ter de 4 a 6 números'; end if;
  end if;

  select id into v_city_id from public.app_cities where slug = coalesce(nullif(p_city_slug, ''), 'taquaritinga-sp') limit 1;
  if v_city_id is null then raise exception 'Cidade não encontrada'; end if;

  insert into public.app_users (city_id, role, username, email, phone, document_number, display_name, password_hash, entity_id, is_active, must_change_password)
  values (v_city_id, p_role, lower(trim(p_username)), nullif(p_email, ''), nullif(p_phone, ''), nullif(p_document_number, ''), p_display_name, public.chm_password_hash(p_username, p_password), p_entity_id, true, false)
  on conflict (city_id, username) do update set
    role = excluded.role,
    email = excluded.email,
    phone = excluded.phone,
    document_number = excluded.document_number,
    display_name = excluded.display_name,
    password_hash = excluded.password_hash,
    entity_id = excluded.entity_id,
    is_active = true,
    must_change_password = false
  returning id into v_user_id;

  return v_user_id;
end;
$$;

grant execute on function public.chm_upsert_app_user(text, text, text, text, text, text, text, text, uuid) to anon, authenticated;

-- Login prioriza usuários com entidade vinculada. Se o vínculo for inválido, retorna aviso em vez de quebrar a tela.
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
  v_digits text := regexp_replace(coalesce(p_identifier, ''), '\\D', '', 'g');
begin
  if v_identifier = '' or coalesce(p_password, '') = '' then return null; end if;

  select * into v_city
    from public.app_cities
   where slug = coalesce(nullif(p_city_slug, ''), 'taquaritinga-sp') and is_active = true
   limit 1;
  if v_city.id is null then return null; end if;

  select * into v_user
    from public.app_users u
   where u.is_active = true
     and (u.city_id = v_city.id or u.role = 'superadmin')
     and (
       lower(u.username) = v_identifier
       or lower(coalesce(u.email, '')) = v_identifier
       or regexp_replace(coalesce(u.document_number, ''), '\\D', '', 'g') = v_digits
       or (v_digits <> '' and regexp_replace(coalesce(u.phone, ''), '\\D', '', 'g') = v_digits)
       or (v_digits <> '' and regexp_replace(coalesce(u.phone, ''), '\\D', '', 'g') = '55' || v_digits)
       or (v_digits <> '' and right(regexp_replace(coalesce(u.phone, ''), '\\D', '', 'g'), length(v_digits)) = v_digits)
     )
   order by case when u.entity_id is null and u.role in ('estabelecimento','motoboy') then 1 else 0 end,
            u.created_at desc
   limit 1;

  if v_user.id is null then return null; end if;
  if v_user.password_hash <> public.chm_password_hash(v_user.username, p_password) then return null; end if;

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

create or replace function public.chm_list_admin_users()
returns table (
  id uuid,
  city_id uuid,
  city_label text,
  role text,
  username text,
  display_name text,
  email text,
  phone text,
  is_active boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    u.id,
    u.city_id,
    coalesce(c.name || '/' || c.state, 'Plataforma Geral') as city_label,
    u.role,
    u.username,
    u.display_name,
    u.email,
    u.phone,
    u.is_active,
    u.created_at
  from public.app_users u
  left join public.app_cities c on c.id = u.city_id
  where u.role in ('admin','superadmin')
  order by case when u.role = 'superadmin' then 0 else 1 end, c.name nulls first, u.display_name;
$$;

grant execute on function public.chm_list_admin_users() to anon, authenticated;

create or replace function public.chm_create_admin_user(
  p_city_slug text,
  p_username text,
  p_password text,
  p_display_name text,
  p_email text default null,
  p_phone text default null,
  p_role text default 'admin'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_city_id uuid;
  v_user_id uuid;
  v_role text := case when p_role = 'superadmin' then 'superadmin' else 'admin' end;
begin
  if length(coalesce(p_password, '')) < 8 then raise exception 'Senha administrativa deve ter pelo menos 8 caracteres'; end if;
  select id into v_city_id from public.app_cities where slug = coalesce(nullif(p_city_slug, ''), 'taquaritinga-sp') limit 1;
  if v_city_id is null then raise exception 'Cidade não encontrada'; end if;

  insert into public.app_users (city_id, role, username, email, phone, display_name, password_hash, entity_id, is_active, must_change_password)
  values (v_city_id, v_role, lower(trim(p_username)), nullif(p_email, ''), nullif(p_phone, ''), p_display_name, public.chm_password_hash(p_username, p_password), null, true, false)
  on conflict (city_id, username) do update set
    role = excluded.role,
    email = excluded.email,
    phone = excluded.phone,
    display_name = excluded.display_name,
    password_hash = excluded.password_hash,
    is_active = true,
    must_change_password = false
  returning id into v_user_id;
  return v_user_id;
end;
$$;

grant execute on function public.chm_create_admin_user(text, text, text, text, text, text, text) to anon, authenticated;

create or replace function public.chm_reset_app_user_password(p_user_id uuid, p_new_password text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_role text;
begin
  select username, role into v_username, v_role from public.app_users where id = p_user_id;
  if v_username is null then return false; end if;
  if v_role in ('admin','superadmin') then
    if length(coalesce(p_new_password, '')) < 8 then raise exception 'Senha administrativa deve ter pelo menos 8 caracteres'; end if;
  else
    if length(coalesce(p_new_password, '')) < 4 or length(coalesce(p_new_password, '')) > 6 then raise exception 'Senha deve ter de 4 a 6 números'; end if;
  end if;
  update public.app_users set password_hash = public.chm_password_hash(v_username, p_new_password), must_change_password = false where id = p_user_id;
  return true;
end;
$$;

grant execute on function public.chm_reset_app_user_password(uuid, text) to anon, authenticated;

create or replace function public.chm_reset_entity_password(p_role text, p_entity_id uuid, p_new_password text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if p_role not in ('estabelecimento','motoboy') then raise exception 'Perfil inválido'; end if;
  select id into v_user_id from public.app_users where role = p_role and entity_id = p_entity_id limit 1;
  if v_user_id is null then return false; end if;
  return public.chm_reset_app_user_password(v_user_id, p_new_password);
end;
$$;

grant execute on function public.chm_reset_entity_password(text, uuid, text) to anon, authenticated;

create or replace function public.chm_actor_is_superadmin(p_actor_user_id uuid, p_actor_password text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.app_users%rowtype;
begin
  select * into v_actor from public.app_users where id = p_actor_user_id and is_active = true limit 1;
  if v_actor.id is null or v_actor.role <> 'superadmin' then return false; end if;
  return v_actor.password_hash = public.chm_password_hash(v_actor.username, coalesce(p_actor_password, ''));
end;
$$;

grant execute on function public.chm_actor_is_superadmin(uuid, text) to anon, authenticated;

create or replace function public.chm_reset_admin_password_secure(p_actor_user_id uuid, p_actor_password text, p_target_user_id uuid, p_new_password text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.chm_actor_is_superadmin(p_actor_user_id, p_actor_password) then raise exception 'Confirmação de superadmin inválida'; end if;
  if not exists (select 1 from public.app_users where id = p_target_user_id and role in ('admin','superadmin')) then raise exception 'Administrador não encontrado'; end if;
  perform public.chm_reset_app_user_password(p_target_user_id, p_new_password);
  insert into public.admin_action_logs(actor_user_id, target_user_id, action, details) values (p_actor_user_id, p_target_user_id, 'reset_admin_password', 'Senha administrativa redefinida pelo superadmin.');
  return true;
end;
$$;

grant execute on function public.chm_reset_admin_password_secure(uuid, text, uuid, text) to anon, authenticated;

create or replace function public.chm_set_admin_active_secure(p_actor_user_id uuid, p_actor_password text, p_target_user_id uuid, p_is_active boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.chm_actor_is_superadmin(p_actor_user_id, p_actor_password) then raise exception 'Confirmação de superadmin inválida'; end if;
  update public.app_users set is_active = p_is_active where id = p_target_user_id and role in ('admin','superadmin');
  insert into public.admin_action_logs(actor_user_id, target_user_id, action, details) values (p_actor_user_id, p_target_user_id, case when p_is_active then 'activate_admin' else 'pause_admin' end, 'Status administrativo alterado.');
  return true;
end;
$$;

grant execute on function public.chm_set_admin_active_secure(uuid, text, uuid, boolean) to anon, authenticated;

create or replace function public.chm_remove_admin_access_secure(p_actor_user_id uuid, p_actor_password text, p_target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.chm_actor_is_superadmin(p_actor_user_id, p_actor_password) then raise exception 'Confirmação de superadmin inválida'; end if;
  update public.app_users set is_active = false where id = p_target_user_id and role = 'admin';
  insert into public.admin_action_logs(actor_user_id, target_user_id, action, details) values (p_actor_user_id, p_target_user_id, 'remove_admin_access', 'Acesso de admin local removido/arquivado.');
  return true;
end;
$$;

grant execute on function public.chm_remove_admin_access_secure(uuid, text, uuid) to anon, authenticated;

-- Policies MVP para as tabelas usadas pelo app.
do $$
declare
  tbl text;
begin
  foreach tbl in array array['profiles','establishments','riders','establishment_wallets','credit_requests','payment_settings','bags','bag_deliveries','bag_attempts','bag_proofs','bag_events','bag_disputes','bag_attempt_rider_actions','registration_applications','admin_action_logs'] loop
    begin
      execute format('alter table public.%I enable row level security', tbl);
      execute format('drop policy if exists "%s_mvp_all" on public.%I', tbl, tbl);
      execute format('create policy "%s_mvp_all" on public.%I for all to anon, authenticated using (true) with check (true)', tbl, tbl);
    exception when undefined_table then null;
    end;
  end loop;
end $$;

-- Diagnóstico rápido após rodar: deve retornar entity_id preenchido para speed_teste.
select username, role, display_name, entity_id, is_active from public.app_users where username in ('speed_teste','motoca_teste','admin','superadmin') order by role, username;
