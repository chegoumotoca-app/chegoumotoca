-- Chegou Motoca v22 - cadastro nativo com aprovação do administrador
-- Rode este script no Supabase SQL Editor antes de testar cadastros persistidos.

create extension if not exists pgcrypto;

create table if not exists public.registration_applications (
  id text primary key,
  role text not null check (role in ('motoboy','estabelecimento')),
  status text not null default 'pendente' check (status in ('pendente','aprovado','recusado')),
  full_name text not null,
  username text not null,
  email text not null,
  whatsapp text not null,
  access_password text not null,
  city text not null default 'Taquaritinga',
  state text not null default 'SP',
  cpf text,
  vehicle_plate text,
  pix_key text,
  profile_photo_name text,
  profile_photo_data_url text,
  source text,
  document_number text,
  responsible_name text,
  address text,
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists idx_registration_applications_status on public.registration_applications(status, created_at desc);
create index if not exists idx_registration_applications_role on public.registration_applications(role, status);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  role text,
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

alter table public.riders add column if not exists cpf text;
alter table public.riders add column if not exists vehicle_plate text;
alter table public.riders add column if not exists whatsapp text;
alter table public.riders add column if not exists profile_photo_url text;
alter table public.riders add column if not exists online_now boolean default false;
alter table public.riders add column if not exists status text default 'ativo';

alter table public.establishments add column if not exists trade_name text;
alter table public.establishments add column if not exists cnpj text;
alter table public.establishments add column if not exists whatsapp text;
alter table public.establishments add column if not exists address text;
alter table public.establishments add column if not exists responsible_name text;
alter table public.establishments add column if not exists status text default 'ativo';

comment on table public.registration_applications is 'Cadastros enviados pelo fluxo nativo v22 antes da aprovação administrativa.';
