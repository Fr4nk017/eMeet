-- eMeet: tabla de eventos creados por locatarios
-- Ejecutar en SQL Editor de Supabase después de 001_emeet_schema.sql

create table if not exists public.locatario_events (
  id             uuid        primary key default gen_random_uuid(),
  creator_id     uuid        not null references public.profiles(id) on delete cascade,
  title          text        not null,
  description    text        not null default '',
  category       text        not null check (category in (
                               'fiesta','musica','gastronomia','networking',
                               'arte','cultura','teatro','deporte'
                             )),
  event_date     timestamptz not null,
  address        text        not null default '',
  price          numeric,
  image_url      text,
  organizer_name text        not null default '',
  organizer_avatar text,
  created_at     timestamptz not null default now()
);

-- Índices
create index if not exists idx_locatario_events_creator
  on public.locatario_events(creator_id, created_at desc);

create index if not exists idx_locatario_events_date
  on public.locatario_events(event_date desc);

-- RLS
alter table public.locatario_events enable row level security;

-- Cualquier usuario autenticado puede leer eventos (feed principal)
create policy "locatario_events_select_all"
  on public.locatario_events
  for select
  to authenticated
  using (true);

-- Solo el creador puede insertar
create policy "locatario_events_insert_own"
  on public.locatario_events
  for insert
  to authenticated
  with check (auth.uid() = creator_id);

-- Solo el creador puede eliminar
create policy "locatario_events_delete_own"
  on public.locatario_events
  for delete
  to authenticated
  using (auth.uid() = creator_id);
