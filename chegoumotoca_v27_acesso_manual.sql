-- Chegou Motoca v27 - apoio para acesso manual criado pelo admin.
-- Opcional para o MVP: armazena usuário inicial e senha de teste em tabela separada.
-- Antes de produção real, trocar por Supabase Auth ou senha com hash no backend.

create table if not exists public.profile_access_credentials (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin','estabelecimento','motoboy')),
  username text not null unique,
  email text,
  temporary_password text not null,
  must_reset_password boolean not null default true,
  created_by text default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profile_access_credentials_profile_id on public.profile_access_credentials(profile_id);
create index if not exists idx_profile_access_credentials_username on public.profile_access_credentials(username);
