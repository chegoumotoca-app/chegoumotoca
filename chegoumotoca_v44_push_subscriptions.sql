-- Chegou Motoca v44 - base para inscrições de notificações push do PWA
-- Aplique no Supabase para salvar os aparelhos que ativarem notificações.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text,
  auth text,
  expiration_time timestamptz,
  user_id text,
  role text,
  username text,
  display_name text,
  entity_id text,
  city_id text,
  subscription_json jsonb not null,
  user_agent text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user_id on public.push_subscriptions(user_id);
create index if not exists idx_push_subscriptions_role on public.push_subscriptions(role);
create index if not exists idx_push_subscriptions_active on public.push_subscriptions(is_active);

alter table public.push_subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'push_subscriptions'
      and policyname = 'push_subscriptions_insert_public'
  ) then
    create policy push_subscriptions_insert_public
      on public.push_subscriptions
      for insert
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'push_subscriptions'
      and policyname = 'push_subscriptions_update_public'
  ) then
    create policy push_subscriptions_update_public
      on public.push_subscriptions
      for update
      using (true)
      with check (true);
  end if;
end $$;

-- Observação:
-- Esta tabela salva a inscrição do aparelho. O envio real de push remoto ainda precisa
-- de uma Edge Function/API com chave VAPID privada e regra de negócio para disparar
-- avisos de nova Bag, aceite, retirada, finalização, divergência etc.
