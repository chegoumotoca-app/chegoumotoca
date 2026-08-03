-- Chegou Motoca MVP v2
-- Estrutura inicial para créditos, Bags, entregas e repasse do entregador.

create extension if not exists pgcrypto;

create table if not exists app_profiles (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('admin','estabelecimento','motoboy')),
  display_name text not null,
  phone text,
  whatsapp text,
  email text,
  pix_key text,
  status text not null default 'ativo' check (status in ('ativo','offline','bloqueado','pendente')),
  created_at timestamptz not null default now()
);

create table if not exists establishments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references app_profiles(id) on delete set null,
  legal_name text not null,
  document_number text not null,
  city text,
  state text,
  created_at timestamptz not null default now()
);

create table if not exists riders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references app_profiles(id) on delete set null,
  full_name text not null,
  whatsapp text not null,
  pix_key text,
  vehicle_plate text,
  city text,
  state text,
  created_at timestamptz not null default now()
);

create table if not exists delivery_pricing_rules (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  neighborhood text not null,
  delivery_type text not null check (delivery_type in ('normal','distante')),
  amount numeric(10,2) not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists credit_requests (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  amount numeric(10,2) not null,
  status text not null default 'pendente' check (status in ('pendente','aprovado','recusado')),
  request_channel text not null default 'plataforma' check (request_channel in ('plataforma','whatsapp','comprovante')),
  attachment_name text,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references app_profiles(id) on delete set null,
  notes text
);

create table if not exists establishment_wallets (
  establishment_id uuid primary key references establishments(id) on delete cascade,
  approved_balance numeric(10,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists bags (
  id uuid primary key default gen_random_uuid(),
  bag_code text not null unique,
  establishment_id uuid not null references establishments(id) on delete cascade,
  rider_id uuid references riders(id) on delete set null,
  total_amount numeric(10,2) not null default 0,
  status text not null default 'disponivel' check (status in (
    'disponivel',
    'aguardando_confirmacao_estabelecimento',
    'aguardando_retirada',
    'em_entrega',
    'motoboy_marcou_finalizada',
    'finalizada_estabelecimento',
    'divergencia_estabelecimento'
  )),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  confirmed_at timestamptz,
  started_at timestamptz,
  rider_finished_at timestamptz,
  establishment_finished_at timestamptz,
  finish_reason text,
  payout_status text default 'pendente' check (payout_status in ('pendente','pago')),
  payout_method text check (payout_method in ('pix','dinheiro')),
  payout_at timestamptz
);

create table if not exists bag_deliveries (
  id uuid primary key default gen_random_uuid(),
  bag_id uuid not null references bags(id) on delete cascade,
  customer_name text not null,
  customer_phone text,
  order_description text not null,
  receipt_number text,
  zipcode text,
  street text not null,
  street_number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  state text not null,
  reference_point text,
  notes text,
  customer_payment_method text not null check (customer_payment_method in ('pix_cliente','dinheiro','cartao_casa')),
  delivery_type text not null check (delivery_type in ('normal','distante')),
  delivery_amount numeric(10,2) not null
);

create table if not exists bag_proofs (
  id uuid primary key default gen_random_uuid(),
  bag_id uuid not null references bags(id) on delete cascade,
  uploaded_by_role text not null check (uploaded_by_role in ('motoboy','estabelecimento','admin')),
  proof_type text not null check (proof_type in ('comprovante','comanda','outro')),
  file_name text not null,
  file_url text,
  created_at timestamptz not null default now()
);

create table if not exists bag_events (
  id uuid primary key default gen_random_uuid(),
  bag_id uuid not null references bags(id) on delete cascade,
  event_type text not null,
  actor_role text not null check (actor_role in ('motoboy','estabelecimento','admin','sistema')),
  actor_id uuid,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_requests_establishment_status on credit_requests(establishment_id, status);
create index if not exists idx_bags_establishment_status on bags(establishment_id, status);
create index if not exists idx_bags_rider_status on bags(rider_id, status);
create index if not exists idx_bag_deliveries_bag on bag_deliveries(bag_id);
create index if not exists idx_bag_events_bag on bag_events(bag_id, created_at desc);

create or replace function apply_credit_request(request_id uuid)
returns void language plpgsql as $$
declare
  v_establishment_id uuid;
  v_amount numeric(10,2);
begin
  select establishment_id, amount
    into v_establishment_id, v_amount
  from credit_requests
  where id = request_id and status = 'pendente';

  if v_establishment_id is null then
    return;
  end if;

  insert into establishment_wallets (establishment_id, approved_balance)
  values (v_establishment_id, v_amount)
  on conflict (establishment_id)
  do update set
    approved_balance = establishment_wallets.approved_balance + excluded.approved_balance,
    updated_at = now();

  update credit_requests
    set status = 'aprovado', reviewed_at = now()
  where id = request_id;
end;
$$;
