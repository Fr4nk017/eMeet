-- ============================================================
-- eMeet — RLS, Triggers y Storage
-- Ejecutar en: Supabase Dashboard → SQL Editor → Run
-- DESPUÉS de aplicar la migración de Prisma
-- ============================================================


-- ─── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locatario_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages     ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_auth" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- profile_followers
CREATE POLICY "pf_select_auth" ON public.profile_followers
  FOR SELECT TO authenticated USING (true);

-- locatario_events
CREATE POLICY "le_select_public"  ON public.locatario_events FOR SELECT USING (true);

CREATE POLICY "le_insert_own" ON public.locatario_events
  FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());

CREATE POLICY "le_update_own" ON public.locatario_events
  FOR UPDATE TO authenticated
  USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

CREATE POLICY "le_delete_own" ON public.locatario_events
  FOR DELETE TO authenticated USING (creator_id = auth.uid());

-- user_events
CREATE POLICY "ue_select_own" ON public.user_events
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- chat_rooms
CREATE POLICY "cr_select_member" ON public.chat_rooms
  FOR SELECT TO authenticated
  USING (id IN (SELECT room_id FROM public.room_members WHERE user_id = auth.uid()));

-- room_members
CREATE POLICY "rm_select_own" ON public.room_members
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "rm_update_own" ON public.room_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- chat_messages
CREATE POLICY "cm_select_member" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (room_id IN (SELECT room_id FROM public.room_members WHERE user_id = auth.uid()));


-- ─── Trigger: crear perfil al registrarse ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  raw_role TEXT;
BEGIN
  raw_role := NEW.raw_user_meta_data->>'role';

  INSERT INTO public.profiles (id, name, bio, location, role, business_name, business_location)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''), split_part(NEW.email, '@', 1), 'usuario'),
    '',
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'business_location', ''),
      NULLIF(NEW.raw_user_meta_data->>'location', ''),
      'Santiago, Chile'
    ),
    CASE WHEN raw_role IN ('user', 'locatario', 'admin')
      THEN raw_role::"public"."UserRole"
      ELSE 'user'::"public"."UserRole"
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
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─── Storage Buckets ───────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-media', 'event-media', true, 52428800,
  ARRAY['image/png','image/jpeg','image/gif','image/webp','image/avif','image/bmp','image/tiff','video/mp4','video/webm','video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true, 5242880,
  ARRAY['image/png','image/jpeg','image/gif','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "storage_event_media_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "storage_event_media_select" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'event-media');

CREATE POLICY "storage_avatars_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "storage_avatars_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "storage_avatars_select" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'avatars');
