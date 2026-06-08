-- ============================================================
-- eMeet — Migración completa al nuevo proyecto Supabase
-- Generado: 2026-06-06
--
-- Instrucciones:
--   1. Crea un nuevo proyecto en Supabase (nueva organización)
--   2. Ve a SQL Editor → New query
--   3. Pega y ejecuta este script completo
--   4. Crea los buckets de Storage (ver sección al final)
--   5. Actualiza las variables de entorno en cada app
-- ============================================================


-- ─── 1. Extensiones ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ─── 2. Tipos ENUM ─────────────────────────────────────────────────────────────

CREATE TYPE public.user_role AS ENUM ('user', 'locatario', 'admin');

CREATE TYPE public.event_category AS ENUM (
  'gastronomia',
  'musica',
  'cultura',
  'networking',
  'deporte',
  'fiesta',
  'teatro',
  'arte'
);

CREATE TYPE public.event_action AS ENUM ('like', 'save');

CREATE TYPE public.chat_room_status AS ENUM ('active', 'expired', 'deleted');


-- ─── 3. profiles ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL DEFAULT '',
  bio               TEXT        NOT NULL DEFAULT '',
  avatar_url        TEXT,
  location          TEXT        NOT NULL DEFAULT 'Santiago, Chile',
  interests         public.event_category[] NOT NULL DEFAULT '{}',
  role              public.user_role NOT NULL DEFAULT 'user',
  business_name     TEXT,
  business_location TEXT,
  is_banned         BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─── 4. profile_followers ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profile_followers (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  followed_id UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profile_followers_unique UNIQUE (follower_id, followed_id),
  CONSTRAINT no_self_follow           CHECK  (follower_id <> followed_id)
);


-- ─── 5. locatario_events ───────────────────────────────────────────────────────
-- CORRECCIÓN: se agrega audio_url que faltaba en el esquema anterior.

CREATE TABLE IF NOT EXISTS public.locatario_events (
  id               UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       UUID                   NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title            TEXT                   NOT NULL,
  description      TEXT                   NOT NULL DEFAULT '',
  category         public.event_category  NOT NULL,
  event_date       TIMESTAMPTZ            NOT NULL,
  address          TEXT                   NOT NULL DEFAULT '',
  price            NUMERIC(10, 2),
  image_url        TEXT,
  video_url        TEXT,
  audio_url        TEXT,
  organizer_name   TEXT                   NOT NULL DEFAULT '',
  organizer_avatar TEXT,
  lat              DOUBLE PRECISION,
  lng              DOUBLE PRECISION,
  created_at       TIMESTAMPTZ            NOT NULL DEFAULT now()
);


-- ─── 6. user_events ────────────────────────────────────────────────────────────
-- CORRECCIÓN CRÍTICA: event_id es TEXT, no UUID.
-- Los IDs de Google Places son strings como "ChIJ1QBJAdjHYpYR4MsOZpZv6tA".
-- Los IDs de locatario_events son UUIDs pero se pasan como TEXT sin problema.

CREATE TABLE IF NOT EXISTS public.user_events (
  id              UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID                 NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id        TEXT                 NOT NULL,
  event_title     TEXT,
  event_image_url TEXT,
  event_address   TEXT,
  action          public.event_action  NOT NULL,
  created_at      TIMESTAMPTZ          NOT NULL DEFAULT now(),
  CONSTRAINT user_events_unique UNIQUE (user_id, event_id, action)
);


-- ─── 7. chat_rooms ─────────────────────────────────────────────────────────────
-- id = event_id o place_id del evento asociado (TEXT para soportar IDs de Google Places).

CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id              TEXT                      PRIMARY KEY,
  event_title     TEXT                      NOT NULL,
  event_image_url TEXT,
  event_address   TEXT,
  status          public.chat_room_status   NOT NULL DEFAULT 'active',
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ               NOT NULL DEFAULT now()
);


-- ─── 8. room_members ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.room_members (
  room_id      TEXT        NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);


-- ─── 9. chat_messages ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    TEXT        NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  text       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─── 10. Índices ───────────────────────────────────────────────────────────────

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role      ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON public.profiles(is_banned);

-- profile_followers
CREATE INDEX IF NOT EXISTS idx_pf_follower ON public.profile_followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_pf_followed ON public.profile_followers(followed_id);

-- locatario_events
CREATE INDEX IF NOT EXISTS idx_le_creator    ON public.locatario_events(creator_id);
CREATE INDEX IF NOT EXISTS idx_le_event_date ON public.locatario_events(event_date);
CREATE INDEX IF NOT EXISTS idx_le_category   ON public.locatario_events(category);

-- user_events
CREATE INDEX IF NOT EXISTS idx_ue_user_id  ON public.user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ue_event_id ON public.user_events(event_id);
CREATE INDEX IF NOT EXISTS idx_ue_action   ON public.user_events(action);

-- chat_rooms
CREATE INDEX IF NOT EXISTS idx_cr_status     ON public.chat_rooms(status);
CREATE INDEX IF NOT EXISTS idx_cr_expires_at ON public.chat_rooms(expires_at);

-- room_members
CREATE INDEX IF NOT EXISTS idx_rm_user_id ON public.room_members(user_id);

-- chat_messages
CREATE INDEX IF NOT EXISTS idx_cm_room_id    ON public.chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_cm_room_time  ON public.chat_messages(room_id, created_at DESC);


-- ─── 11. Row Level Security ────────────────────────────────────────────────────

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locatario_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages     ENABLE ROW LEVEL SECURITY;

-- profiles: cualquier usuario autenticado puede leer todos los perfiles
-- (necesario para mostrar nombres/avatares en el chat y admin)
CREATE POLICY "profiles_select_auth"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- profiles: solo el propio usuario puede actualizar su perfil
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- profile_followers: usuarios autenticados pueden leer seguidores
CREATE POLICY "pf_select_auth"
  ON public.profile_followers FOR SELECT
  TO authenticated
  USING (true);

-- locatario_events: cualquier visitante puede leer (feed público)
CREATE POLICY "le_select_public"
  ON public.locatario_events FOR SELECT
  USING (true);

-- locatario_events: solo el creador puede insertar sus eventos
CREATE POLICY "le_insert_own"
  ON public.locatario_events FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

-- locatario_events: solo el creador puede actualizar sus eventos
CREATE POLICY "le_update_own"
  ON public.locatario_events FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- locatario_events: solo el creador puede borrar sus eventos
CREATE POLICY "le_delete_own"
  ON public.locatario_events FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());

-- user_events: solo el propio usuario puede ver sus likes/guardados
CREATE POLICY "ue_select_own"
  ON public.user_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- chat_rooms: solo miembros de la sala pueden leerla
CREATE POLICY "cr_select_member"
  ON public.chat_rooms FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT room_id FROM public.room_members WHERE user_id = auth.uid()
    )
  );

-- room_members: el usuario ve sus propias membresías
CREATE POLICY "rm_select_own"
  ON public.room_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- room_members: el usuario actualiza su propio last_read_at
CREATE POLICY "rm_update_own"
  ON public.room_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- chat_messages: solo miembros de la sala pueden leer mensajes
CREATE POLICY "cm_select_member"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM public.room_members WHERE user_id = auth.uid()
    )
  );


-- ─── 12. Trigger: crear perfil automáticamente al registrarse ──────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_role TEXT;
BEGIN
  raw_role := NEW.raw_user_meta_data->>'role';

  INSERT INTO public.profiles (
    id,
    name,
    bio,
    location,
    role,
    business_name,
    business_location
  )
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      split_part(NEW.email, '@', 1),
      'usuario'
    ),
    '',
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'business_location', ''),
      NULLIF(NEW.raw_user_meta_data->>'location', ''),
      'Santiago, Chile'
    ),
    CASE
      WHEN raw_role IN ('user', 'locatario', 'admin')
        THEN raw_role::public.user_role
      ELSE 'user'::public.user_role
    END,
    NULLIF(NEW.raw_user_meta_data->>'business_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'business_location', '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- STORAGE BUCKETS
-- Crear manualmente desde Supabase Dashboard > Storage, o via API:
--
-- 1. event-media
--    - Public: SÍ
--    - File size limit: 52428800 (50 MB)
--    - Allowed MIME types: image/png, image/jpeg, image/gif,
--      image/webp, image/avif, video/mp4, video/webm, video/quicktime
--
-- 2. avatars
--    - Public: SÍ
--    - File size limit: 5242880 (5 MB)
--    - Allowed MIME types: image/png, image/jpeg, image/gif, image/webp
--
-- O ejecuta este SQL si prefieres hacerlo por script:
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-media',
  'event-media',
  true,
  52428800,
  ARRAY[
    'image/png', 'image/jpeg', 'image/gif', 'image/webp',
    'image/avif', 'image/bmp', 'image/tiff',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public            = EXCLUDED.public,
  file_size_limit   = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public            = EXCLUDED.public,
  file_size_limit   = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas de Storage: cualquier autenticado puede subir a su propia carpeta
CREATE POLICY "storage_event_media_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'event-media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "storage_event_media_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'event-media');

CREATE POLICY "storage_avatars_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "storage_avatars_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "storage_avatars_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');


-- ============================================================
-- VARIABLES DE ENTORNO A ACTUALIZAR DESPUÉS DE LA MIGRACIÓN
--
-- En apps/app-web/.env.local (y en cada app Express):
--   NEXT_PUBLIC_SUPABASE_URL=https://<nuevo-project-ref>.supabase.co
--   NEXT_PUBLIC_SUPABASE_ANON_KEY=<nueva-anon-key>
--   SUPABASE_SERVICE_ROLE_KEY=<nueva-service-role-key>
--   DATABASE_URL=postgresql://postgres:<password>@db.<nuevo-project-ref>.supabase.co:5432/postgres
--
-- En cada app Express (app-auth, app-events, app-profile, app-saved, app-chat, app-places, app-admin):
--   SUPABASE_URL=https://<nuevo-project-ref>.supabase.co
--   SUPABASE_ANON_KEY=<nueva-anon-key>
--   SUPABASE_SERVICE_ROLE_KEY=<nueva-service-role-key>
--
-- En app-auth (para OAuth callbacks):
--   SUPABASE_URL debe coincidir con la URL del nuevo proyecto
-- ============================================================
