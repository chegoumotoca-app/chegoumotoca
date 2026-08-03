-- Chegou Motoca v38
-- Complemento para avaliações de entregadores após finalização da Bag.
-- Rode após a base v36/v37 estar aplicada.

create table if not exists public.bag_ratings (
  id uuid primary key default gen_random_uuid(),
  bag_id uuid not null references public.bags(id) on delete cascade,
  establishment_id uuid references public.establishments(id) on delete set null,
  rider_id uuid references public.riders(id) on delete set null,
  score integer not null check (score between 1 and 5),
  comment text,
  tags text[] not null default '{}',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bag_id)
);

alter table public.bag_ratings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'bag_ratings' and policyname = 'bag_ratings_all'
  ) then
    create policy bag_ratings_all on public.bag_ratings for all using (true) with check (true);
  end if;
end $$;

create index if not exists idx_bag_ratings_bag_id on public.bag_ratings(bag_id);
create index if not exists idx_bag_ratings_rider_id on public.bag_ratings(rider_id);

-- Opcional: campos que ajudam futuras telas de perfil/logo sem quebrar bancos antigos.
alter table public.establishments add column if not exists profile_image_url text;
alter table public.riders add column if not exists profile_image_url text;

-- Diagnóstico rápido.
select 'v38_ok' as status, count(*) as avaliacoes_registradas from public.bag_ratings;
