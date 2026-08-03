-- Chegou Motoca v23 - taxa da plataforma editável no painel admin
-- Rode no Supabase SQL Editor se a tabela payment_settings ainda não tiver a coluna.

alter table public.payment_settings
  add column if not exists platform_fee_percent numeric(5,2) not null default 10;

update public.payment_settings
set platform_fee_percent = coalesce(platform_fee_percent, 10)
where platform_fee_percent is null;
