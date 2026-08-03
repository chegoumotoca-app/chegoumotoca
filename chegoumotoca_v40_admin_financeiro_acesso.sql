-- Chegou Motoca v40
-- Conferência financeira por entregador, bloqueio lógico de contas e preparação de auditoria.
-- Rode após a v39. Não apaga histórico de Bags, créditos, repasses ou avaliações.

create extension if not exists pgcrypto;

create table if not exists public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  action text not null,
  target_role text,
  target_id uuid,
  target_name text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_action_logs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='admin_action_logs' and policyname='admin_action_logs_all') then
    create policy admin_action_logs_all on public.admin_action_logs for all using (true) with check (true);
  end if;
end $$;

create or replace function public.chm_set_entity_access_status(
  p_role text,
  p_entity_id uuid,
  p_status text,
  p_actor_user_id uuid default null,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_name text;
  v_active boolean := coalesce(p_status, '') <> 'bloqueado';
begin
  if p_role not in ('motoboy','estabelecimento') then
    raise exception 'Perfil inválido';
  end if;

  if p_status not in ('ativo','bloqueado') then
    raise exception 'Status inválido';
  end if;

  if p_role = 'motoboy' then
    select r.profile_id, coalesce(p.full_name, 'Motoboy') into v_profile_id, v_name
    from public.riders r
    left join public.profiles p on p.id = r.profile_id
    where r.id = p_entity_id;

    update public.riders
       set status = p_status,
           online_now = case when p_status = 'bloqueado' then false else online_now end
     where id = p_entity_id;
  else
    select e.profile_id, coalesce(e.trade_name, p.full_name, 'Estabelecimento') into v_profile_id, v_name
    from public.establishments e
    left join public.profiles p on p.id = e.profile_id
    where e.id = p_entity_id;

    update public.establishments
       set status = p_status
     where id = p_entity_id;
  end if;

  if v_profile_id is not null then
    update public.profiles set status = p_status where id = v_profile_id;
  end if;

  update public.app_users
     set is_active = v_active
   where role = p_role
     and entity_id = p_entity_id;

  insert into public.admin_action_logs (actor_user_id, action, target_role, target_id, target_name, reason, metadata)
  values (p_actor_user_id, case when p_status = 'bloqueado' then 'bloquear_conta' else 'reativar_conta' end, p_role, p_entity_id, v_name, p_reason, jsonb_build_object('status', p_status));

  return true;
end;
$$;

grant execute on function public.chm_set_entity_access_status(text, uuid, text, uuid, text) to anon, authenticated;

-- Resumo de repasse por motoboy para relatórios/admin.
create or replace view public.chm_rider_payout_summary as
select
  r.id as rider_id,
  coalesce(p.full_name, 'Motoboy') as rider_name,
  r.whatsapp,
  r.pix_key,
  count(b.id) filter (where b.status = 'finalizada_estabelecimento') as finalized_bags,
  coalesce(sum(b.total_value) filter (where b.status = 'finalizada_estabelecimento'), 0) as gross_total,
  coalesce(sum(b.total_value * (coalesce(ps.platform_fee_percent, 10) / 100.0)) filter (where b.status = 'finalizada_estabelecimento'), 0) as platform_fee_total,
  coalesce(sum(b.total_value - (b.total_value * (coalesce(ps.platform_fee_percent, 10) / 100.0))) filter (where b.status = 'finalizada_estabelecimento'), 0) as rider_net_total,
  coalesce(sum(b.total_value - (b.total_value * (coalesce(ps.platform_fee_percent, 10) / 100.0))) filter (where b.status = 'finalizada_estabelecimento' and coalesce(b.payout_status, 'pendente') <> 'pago'), 0) as pending_payout_total
from public.riders r
left join public.profiles p on p.id = r.profile_id
left join public.bags b on b.rider_id = r.id
left join public.payment_settings ps on true
group by r.id, p.full_name, r.whatsapp, r.pix_key;

-- Preparação futura para jornada do motoboy/iniciar dia/encerrar dia.
create table if not exists public.rider_work_sessions (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid references public.riders(id) on delete set null,
  city_id uuid references public.app_cities(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  start_km numeric,
  end_km numeric,
  fuel_price numeric,
  km_per_liter numeric,
  estimated_fuel_cost numeric,
  gross_earnings numeric,
  net_earnings numeric,
  created_at timestamptz not null default now()
);

alter table public.rider_work_sessions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='rider_work_sessions' and policyname='rider_work_sessions_all') then
    create policy rider_work_sessions_all on public.rider_work_sessions for all using (true) with check (true);
  end if;
end $$;

select 'v40_ok' as status;
