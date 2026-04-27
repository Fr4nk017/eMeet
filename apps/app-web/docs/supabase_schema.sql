-- ============================================================
-- eMeet – Schema completo para Supabase
-- Generado para coincidir con packages/db/prisma/schema.prisma
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- ─── EXTENSIONES ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── TIPOS ENUM ──────────────────────────────────────────────
do $$ begin
  create type event_category as enum (
    'gastronomia','musica','cultura','networking',
    'deporte','fiesta','teatro','arte'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type "UserEventAction" as enum ('like', 'save');
exception when duplicate_object then null;
end $$;

-- ─── TABLA: profiles ─────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default '',
  bio         text not null default '',
  avatar_url  text,
  location    text not null default '',
  interests   event_category[] not null default '{}',
  created_at  timestamptz not null default now()
);

-- ─── TRIGGER: crear perfil al registrarse ────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── TABLA: user_events ──────────────────────────────────────
create table if not exists public.user_events (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  event_id        text not null,
  event_title     text,
  event_image_url text,
  event_address   text,
  action          "UserEventAction" not null,
  created_at      timestamptz not null default now(),
  -- Constraint requerida por upsert onConflict en Supabase / Prisma @@unique
  constraint user_events_user_event_action_key unique (user_id, event_id, action)
);

-- ─── TABLA: profile_followers ───────────────────────────────
create table if not exists public.profile_followers (
  id           uuid primary key default uuid_generate_v4(),
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  followed_id  uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  constraint profile_followers_unique unique (follower_id, followed_id),
  constraint profile_followers_no_self_follow check (follower_id <> followed_id)
);

-- ─── TABLA: locatario_events ─────────────────────────────────
create table if not exists public.locatario_events (
  id               uuid primary key default uuid_generate_v4(),
  creator_id       uuid not null references public.profiles(id) on delete cascade,
  title            text not null,
  description      text not null default '',
  category         event_category not null,
  event_date       timestamptz not null,
  address          text not null default '',
  price            numeric,
  image_url        text,
  organizer_name   text not null default '',
  organizer_avatar text,
  created_at       timestamptz not null default now()
);

-- ─── TABLA: chat_rooms ───────────────────────────────────────
create table if not exists public.chat_rooms (
  id              text primary key,
  event_title     text not null,
  event_image_url text,
  event_address   text,
  created_at      timestamptz not null default now()
);

-- ─── TABLA: room_members ─────────────────────────────────────
create table if not exists public.room_members (
  room_id      text not null references public.chat_rooms(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  joined_at    timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- ─── TABLA: chat_messages ────────────────────────────────────
create table if not exists public.chat_messages (
  id         uuid primary key default uuid_generate_v4(),
  room_id    text not null references public.chat_rooms(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now()
);

-- ─── ÍNDICES de rendimiento ──────────────────────────────────
create index if not exists idx_user_events_user_id    on public.user_events(user_id);
create index if not exists idx_user_events_action     on public.user_events(action);
create index if not exists idx_profile_followers_followed on public.profile_followers(followed_id);
create index if not exists idx_profile_followers_follower on public.profile_followers(follower_id);
create index if not exists idx_locatario_creator      on public.locatario_events(creator_id);
create index if not exists idx_chat_messages_room     on public.chat_messages(room_id);
create index if not exists idx_chat_messages_created  on public.chat_messages(created_at);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────

-- profiles
alter table public.profiles enable row level security;

drop policy if exists "profiles: ver el propio" on public.profiles;
create policy "profiles: ver el propio"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles: actualizar el propio" on public.profiles;
create policy "profiles: actualizar el propio"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "profiles: insertar al registrarse" on public.profiles;
create policy "profiles: insertar al registrarse"
  on public.profiles for insert
  with check (auth.uid() = id);

-- user_events
alter table public.user_events enable row level security;

drop policy if exists "user_events: acceso propio" on public.user_events;
create policy "user_events: acceso propio"
  on public.user_events for all
  using (auth.uid() = user_id);

-- profile_followers
alter table public.profile_followers enable row level security;

drop policy if exists "profile_followers: lectura publica" on public.profile_followers;
create policy "profile_followers: lectura publica"
  on public.profile_followers for select
  using (true);

drop policy if exists "profile_followers: insertar propio" on public.profile_followers;
create policy "profile_followers: insertar propio"
  on public.profile_followers for insert
  with check (auth.uid() = follower_id);

drop policy if exists "profile_followers: eliminar propio" on public.profile_followers;
create policy "profile_followers: eliminar propio"
  on public.profile_followers for delete
  using (auth.uid() = follower_id);

-- locatario_events
alter table public.locatario_events enable row level security;

drop policy if exists "locatario_events: lectura publica" on public.locatario_events;
create policy "locatario_events: lectura publica"
  on public.locatario_events for select
  using (true);

drop policy if exists "locatario_events: escritura propia" on public.locatario_events;
create policy "locatario_events: escritura propia"
  on public.locatario_events for insert
  with check (auth.uid() = creator_id);

drop policy if exists "locatario_events: eliminar propio" on public.locatario_events;
create policy "locatario_events: eliminar propio"
  on public.locatario_events for delete
  using (auth.uid() = creator_id);

-- chat_rooms
alter table public.chat_rooms enable row level security;

drop policy if exists "chat_rooms: lectura para miembros" on public.chat_rooms;
create policy "chat_rooms: lectura para miembros"
  on public.chat_rooms for select
  using (
    exists (
      select 1 from public.room_members
      where room_members.room_id = chat_rooms.id
        and room_members.user_id = auth.uid()
    )
  );

drop policy if exists "chat_rooms: insertar con auth" on public.chat_rooms;
create policy "chat_rooms: insertar con auth"
  on public.chat_rooms for insert
  with check (auth.uid() is not null);

-- room_members
alter table public.room_members enable row level security;

drop policy if exists "room_members: acceso propio" on public.room_members;
create policy "room_members: acceso propio"
  on public.room_members for all
  using (auth.uid() = user_id);

-- chat_messages
alter table public.chat_messages enable row level security;

drop policy if exists "chat_messages: leer en sala propia" on public.chat_messages;
create policy "chat_messages: leer en sala propia"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.room_members
      where room_members.room_id = chat_messages.room_id
        and room_members.user_id = auth.uid()
    )
  );

drop policy if exists "chat_messages: insertar en sala propia" on public.chat_messages;
create policy "chat_messages: insertar en sala propia"
  on public.chat_messages for insert
  with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.room_members
      where room_members.room_id = chat_messages.room_id
        and room_members.user_id = auth.uid()
    )
  );

-- ─── REALTIME ────────────────────────────────────────────────
-- Habilitar publicaciones para chat en tiempo real
do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_publication p on p.oid = pr.prpubid
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_publication p on p.oid = pr.prpubid
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'room_members'
  ) then
    alter publication supabase_realtime add table public.room_members;
  end if;
end
$$;
