-- Chegou Motoca v39
-- Validações de cadastro, identidades para admin, sugestões e base para reputação do entregador.
-- Rode após a base v38. O script evita índices únicos para não falhar em bases que já tenham dados duplicados.

create extension if not exists pgcrypto;

create or replace function public.chm_only_digits(p_value text)
returns text
language sql
immutable
as $$ select regexp_replace(coalesce(p_value, ''), '\\D', '', 'g') $$;

create or replace function public.chm_norm(p_value text)
returns text
language sql
immutable
as $$ select lower(regexp_replace(coalesce(trim(p_value), ''), '\\s+', '', 'g')) $$;

alter table public.registration_applications add column if not exists review_note text;
alter table public.riders add column if not exists vehicle_plate text;
alter table public.riders add column if not exists cpf text;
alter table public.establishments add column if not exists profile_image_url text;
alter table public.riders add column if not exists profile_image_url text;

-- Lista segura para o frontend/admin mostrar usuário, e-mail e vínculo sem expor senha/hash.
create or replace function public.chm_list_app_identities()
returns table (
  id uuid,
  city_id uuid,
  role text,
  username text,
  email text,
  phone text,
  document_number text,
  display_name text,
  entity_id uuid,
  is_active boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select u.id, u.city_id, u.role, u.username, u.email, u.phone, u.document_number, u.display_name, u.entity_id, u.is_active, u.created_at
  from public.app_users u
  where coalesce(u.is_active, true) = true
  order by u.created_at desc;
$$;

grant execute on function public.chm_list_app_identities() to anon, authenticated;

-- Checagem de duplicidade global: usuário, e-mail, WhatsApp, CPF/CNPJ e placa.
create or replace function public.chm_check_registration_conflict(
  p_username text default null,
  p_email text default null,
  p_phone text default null,
  p_document_number text default null,
  p_plate text default null,
  p_ignore_application_id text default null
)
returns table (has_conflict boolean, field text, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text := public.chm_norm(p_username);
  v_email text := public.chm_norm(p_email);
  v_phone text := public.chm_only_digits(p_phone);
  v_doc text := public.chm_only_digits(p_document_number);
  v_plate text := public.chm_norm(p_plate);
begin
  if v_username <> '' and exists (select 1 from public.app_users where public.chm_norm(username) = v_username and coalesce(is_active, true)) then
    return query select true, 'username', 'Este nome de usuário já está cadastrado no Chegou Motoca.';
    return;
  end if;
  if v_username <> '' and exists (select 1 from public.registration_applications where status = 'pendente' and id::text <> coalesce(p_ignore_application_id, '') and public.chm_norm(username) = v_username) then
    return query select true, 'username', 'Este nome de usuário já está em análise.';
    return;
  end if;

  if v_email <> '' and exists (select 1 from public.app_users where public.chm_norm(email) = v_email and coalesce(is_active, true)) then
    return query select true, 'email', 'Este e-mail já está vinculado a uma conta no Chegou Motoca.';
    return;
  end if;
  if v_email <> '' and exists (select 1 from public.registration_applications where status = 'pendente' and id::text <> coalesce(p_ignore_application_id, '') and public.chm_norm(email) = v_email) then
    return query select true, 'email', 'Este e-mail já está em análise.';
    return;
  end if;

  if v_phone <> '' and exists (select 1 from public.app_users where public.chm_only_digits(phone) = v_phone and coalesce(is_active, true)) then
    return query select true, 'whatsapp', 'Este WhatsApp já está vinculado a uma conta no Chegou Motoca.';
    return;
  end if;
  if v_phone <> '' and exists (select 1 from public.registration_applications where status = 'pendente' and id::text <> coalesce(p_ignore_application_id, '') and public.chm_only_digits(whatsapp) = v_phone) then
    return query select true, 'whatsapp', 'Este WhatsApp já está em análise.';
    return;
  end if;

  if v_doc <> '' and exists (select 1 from public.app_users where public.chm_only_digits(document_number) = v_doc and coalesce(is_active, true)) then
    return query select true, 'documento', 'Este CPF/CNPJ já possui cadastro no Chegou Motoca.';
    return;
  end if;
  if v_doc <> '' and exists (select 1 from public.registration_applications where status = 'pendente' and id::text <> coalesce(p_ignore_application_id, '') and public.chm_only_digits(coalesce(cpf, document_number)) = v_doc) then
    return query select true, 'documento', 'Este CPF/CNPJ já está em análise.';
    return;
  end if;

  if v_plate <> '' and exists (select 1 from public.riders where public.chm_norm(vehicle_plate) = v_plate) then
    return query select true, 'placa', 'Esta placa já está cadastrada no Chegou Motoca.';
    return;
  end if;
  if v_plate <> '' and exists (select 1 from public.registration_applications where status = 'pendente' and id::text <> coalesce(p_ignore_application_id, '') and public.chm_norm(vehicle_plate) = v_plate) then
    return query select true, 'placa', 'Esta placa já está em análise.';
    return;
  end if;

  return query select false, null::text, null::text;
end;
$$;

grant execute on function public.chm_check_registration_conflict(text, text, text, text, text, text) to anon, authenticated;

-- Reforça a função de criação de usuário de app para bloquear e-mail/telefone/documento duplicado.
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
  v_username text := lower(trim(coalesce(p_username, '')));
begin
  if p_role not in ('admin','estabelecimento','motoboy','superadmin') then raise exception 'Perfil inválido'; end if;
  if length(coalesce(p_password, '')) < 4 or length(coalesce(p_password, '')) > 30 then raise exception 'Senha inválida'; end if;
  select id into v_city_id from public.app_cities where slug = coalesce(nullif(p_city_slug, ''), 'taquaritinga-sp') limit 1;
  if v_city_id is null then raise exception 'Cidade não encontrada'; end if;

  if exists (select 1 from public.app_users where city_id = v_city_id and public.chm_norm(username) = public.chm_norm(v_username) and username <> v_username and coalesce(is_active, true)) then
    raise exception 'Nome de usuário já cadastrado';
  end if;
  if coalesce(p_email, '') <> '' and exists (select 1 from public.app_users where city_id = v_city_id and public.chm_norm(email) = public.chm_norm(p_email) and public.chm_norm(username) <> public.chm_norm(v_username) and coalesce(is_active, true)) then
    raise exception 'E-mail já cadastrado';
  end if;
  if coalesce(p_phone, '') <> '' and exists (select 1 from public.app_users where city_id = v_city_id and public.chm_only_digits(phone) = public.chm_only_digits(p_phone) and public.chm_norm(username) <> public.chm_norm(v_username) and coalesce(is_active, true)) then
    raise exception 'WhatsApp já cadastrado';
  end if;
  if coalesce(p_document_number, '') <> '' and exists (select 1 from public.app_users where city_id = v_city_id and public.chm_only_digits(document_number) = public.chm_only_digits(p_document_number) and public.chm_norm(username) <> public.chm_norm(v_username) and coalesce(is_active, true)) then
    raise exception 'CPF/CNPJ já cadastrado';
  end if;

  insert into public.app_users (city_id, role, username, email, phone, document_number, display_name, password_hash, entity_id, is_active, must_change_password)
  values (v_city_id, p_role, v_username, nullif(lower(trim(coalesce(p_email, ''))), ''), nullif(public.chm_only_digits(p_phone), ''), nullif(public.chm_only_digits(p_document_number), ''), p_display_name, public.chm_password_hash(v_username, p_password), p_entity_id, true, false)
  on conflict (city_id, username) do update set
    role = excluded.role,
    email = excluded.email,
    phone = excluded.phone,
    document_number = excluded.document_number,
    display_name = excluded.display_name,
    password_hash = excluded.password_hash,
    entity_id = excluded.entity_id,
    is_active = true
  returning id into v_user_id;

  return v_user_id;
end;
$$;

grant execute on function public.chm_upsert_app_user(text, text, text, text, text, text, text, text, uuid) to anon, authenticated;

-- Sugestões/avaliações públicas da plataforma para próxima etapa do painel admin.
create table if not exists public.platform_feedback (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  whatsapp text,
  feedback_type text not null default 'sugestao',
  message text not null,
  status text not null default 'nova',
  city_id uuid references public.app_cities(id) on delete set null,
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

alter table public.platform_feedback enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='platform_feedback' and policyname='platform_feedback_all') then
    create policy platform_feedback_all on public.platform_feedback for all using (true) with check (true);
  end if;
end $$;

-- Visão de reputação agregada por entregador.
create or replace view public.rider_rating_summary as
select
  r.id as rider_id,
  coalesce(p.full_name, 'Motoboy') as rider_name,
  round(avg(br.score)::numeric, 2) as avg_score,
  count(br.id) as total_ratings
from public.riders r
left join public.profiles p on p.id = r.profile_id
left join public.bag_ratings br on br.rider_id = r.id
group by r.id, p.full_name;

select 'v39_ok' as status;
