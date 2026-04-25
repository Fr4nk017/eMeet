-- eMeet Supabase bootstrap (PostgreSQL)
-- Ejecutar en SQL Editor de Supabase

create extension if not exists pgcrypto;

-- Tablas
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  bio text not null default '',
  avatar_url text,
  location text not null default '',
  interests text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint profiles_interests_valid check (
    interests <@ array[
      'gastronomia',
      'musica',
      'cultura',
      'networking',
      'deporte',
      'fiesta',
      'teatro',
      'arte'
    ]::text[]
  )
);

create table if not exists public.user_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id text not null,
  event_title text,
  event_image_url text,
  event_address text,
  action text not null check (action in ('like', 'save')),
  created_at timestamptz not null default now(),
  unique (user_id, event_id, action)
);

create table if not exists public.chat_rooms (
  id text primary key,
  event_title text not null,
  event_image_url text,
  event_address text,
  created_at timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id text not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (length(trim(text)) > 0),
  created_at timestamptz not null default now()
);

-- Indices
create index if not exists idx_profiles_created_at on public.profiles(created_at desc);

create index if not exists idx_user_events_user_action_created
  on public.user_events(user_id, action, created_at desc);
create index if not exists idx_user_events_event_id on public.user_events(event_id);

create index if not exists idx_chat_rooms_created_at on public.chat_rooms(created_at desc);

create index if not exists idx_room_members_user_id on public.room_members(user_id);
create index if not exists idx_room_members_room_id on public.room_members(room_id);

create index if not exists idx_chat_messages_room_created
  on public.chat_messages(room_id, created_at desc);
create index if not exists idx_chat_messages_user_id on public.chat_messages(user_id);

-- RLS
alter table public.profiles enable row level security;
alter table public.user_events enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.chat_messages enable row level security;

-- profiles: solo propietario
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- user_events: solo propietario
create policy "user_events_select_own"
  on public.user_events
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_events_insert_own"
  on public.user_events
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_events_delete_own"
  on public.user_events
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "user_events_update_own"
  on public.user_events
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- chat_rooms: lectura solo si eres miembro, insercion autenticada
create policy "chat_rooms_select_member"
  on public.chat_rooms
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.room_members rm
      where rm.room_id = chat_rooms.id
        and rm.user_id = auth.uid()
    )
  );

create policy "chat_rooms_insert_authenticated"
  on public.chat_rooms
  for insert
  to authenticated
  with check (true);

create policy "chat_rooms_update_member"
  on public.chat_rooms
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.room_members rm
      where rm.room_id = chat_rooms.id
        and rm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.room_members rm
      where rm.room_id = chat_rooms.id
        and rm.user_id = auth.uid()
    )
  );

-- room_members: lectura solo miembros del room, insercion autenticada propia
create policy "room_members_select_member"
  on public.room_members
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.room_members rm2
      where rm2.room_id = room_members.room_id
        and rm2.user_id = auth.uid()
    )
  );

create policy "room_members_insert_authenticated"
  on public.room_members
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "room_members_update_own"
  on public.room_members
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "room_members_delete_own"
  on public.room_members
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- chat_messages: lectura solo miembros del room, insercion autenticada
create policy "chat_messages_select_member"
  on public.chat_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.room_members rm
      where rm.room_id = chat_messages.room_id
        and rm.user_id = auth.uid()
    )
  );

create policy "chat_messages_insert_authenticated"
  on public.chat_messages
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.room_members rm
      where rm.room_id = chat_messages.room_id
        and rm.user_id = auth.uid()
    )
  );

-- Trigger de perfil automatico al registrarse en auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Realtime
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.room_members;

-- Storage bucket de avatares
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

create policy "avatars_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'avatars');

create policy "avatars_upload_own_folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own_folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own_folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
