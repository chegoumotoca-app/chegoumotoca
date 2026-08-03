-- Chegou Motoca v45
-- Campos para configuração de raio por estabelecimento.
-- Execute depois do SQL v44, se for usar cálculo de entrega normal/distante por distância no Supabase.

alter table if exists public.establishments
  add column if not exists normal_radius_km numeric(8,2) default 3,
  add column if not exists base_latitude double precision,
  add column if not exists base_longitude double precision,
  add column if not exists base_location_updated_at timestamptz;

alter table if exists public.registration_applications
  add column if not exists normal_radius_km numeric(8,2),
  add column if not exists base_latitude double precision,
  add column if not exists base_longitude double precision;

alter table if exists public.bag_deliveries
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists distance_km numeric(8,2);

comment on column public.establishments.normal_radius_km is 'Raio em quilômetros considerado entrega normal para o estabelecimento.';
comment on column public.establishments.base_latitude is 'Latitude da base do estabelecimento para cálculo de distância.';
comment on column public.establishments.base_longitude is 'Longitude da base do estabelecimento para cálculo de distância.';
comment on column public.bag_deliveries.distance_km is 'Distância aproximada entre base do estabelecimento e destino da entrega.';
