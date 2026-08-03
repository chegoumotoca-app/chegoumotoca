-- Chegou Motoca v51 - limpeza opcional para teste real controlado
-- Use somente se você quiser começar o teste da hamburgueria com base limpa.
-- Preserva usuários admin/superadmin em app_users e preserva configurações gerais/cidades.
-- Antes de executar: faça backup/export do Supabase se houver dados importantes.

begin;

do $$
begin
  if to_regclass('public.bag_events') is not null then
    execute 'truncate table public.bag_events restart identity cascade';
  end if;
  if to_regclass('public.bag_ratings') is not null then
    execute 'truncate table public.bag_ratings restart identity cascade';
  end if;
  if to_regclass('public.bag_proofs') is not null then
    execute 'truncate table public.bag_proofs restart identity cascade';
  end if;
  if to_regclass('public.bag_disputes') is not null then
    execute 'truncate table public.bag_disputes restart identity cascade';
  end if;
  if to_regclass('public.bag_attempt_rider_actions') is not null then
    execute 'truncate table public.bag_attempt_rider_actions restart identity cascade';
  end if;
  if to_regclass('public.bag_attempts') is not null then
    execute 'truncate table public.bag_attempts restart identity cascade';
  end if;
  if to_regclass('public.bag_deliveries') is not null then
    execute 'truncate table public.bag_deliveries restart identity cascade';
  end if;
  if to_regclass('public.bags') is not null then
    execute 'truncate table public.bags restart identity cascade';
  end if;
  if to_regclass('public.credit_requests') is not null then
    execute 'truncate table public.credit_requests restart identity cascade';
  end if;
  if to_regclass('public.rider_work_sessions') is not null then
    execute 'truncate table public.rider_work_sessions restart identity cascade';
  end if;
  if to_regclass('public.establishment_wallets') is not null then
    execute 'truncate table public.establishment_wallets restart identity cascade';
  end if;
  if to_regclass('public.app_feedbacks') is not null then
    execute 'truncate table public.app_feedbacks restart identity cascade';
  end if;
  if to_regclass('public.platform_feedback') is not null then
    execute 'truncate table public.platform_feedback restart identity cascade';
  end if;
  if to_regclass('public.registration_applications') is not null then
    execute 'truncate table public.registration_applications restart identity cascade';
  end if;
  if to_regclass('public.push_subscriptions') is not null then
    execute 'truncate table public.push_subscriptions restart identity cascade';
  end if;
  if to_regclass('public.riders') is not null then
    execute 'truncate table public.riders restart identity cascade';
  end if;
  if to_regclass('public.establishments') is not null then
    execute 'truncate table public.establishments restart identity cascade';
  end if;
end $$;

do $$
begin
  if to_regclass('public.app_users') is not null then
    delete from public.app_users where role in ('motoboy', 'estabelecimento');
  end if;
  if to_regclass('public.profile_access_credentials') is not null then
    delete from public.profile_access_credentials where role in ('motoboy', 'estabelecimento');
  end if;
end $$;

-- Mantém public.profiles/app_profiles para evitar apagar perfis administrativos antigos.
-- Se quiser apagar perfis comuns também, confirme antes a estrutura real do banco.

commit;
