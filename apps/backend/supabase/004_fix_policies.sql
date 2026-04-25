-- eMeet: corrección de políticas RLS problemáticas
-- Ejecutar en SQL Editor de Supabase

-- ─── Fix 1: room_members auto-referencia ─────────────────────────────────────
-- La política original hace "exists (select 1 from room_members ...)" dentro de
-- la política de room_members → recursión infinita → error 500 en todos los
-- endpoints de chat que tocan room_members o tablas que la referencian.
-- Solución: un usuario solo puede ver sus propias filas de membresía.

drop policy if exists "room_members_select_member" on public.room_members;

create policy "room_members_select_own"
  on public.room_members
  for select
  to authenticated
  using (auth.uid() = user_id);

-- ─── Fix 2: profiles solo leía el propio perfil ───────────────────────────────
-- El chat necesita mostrar nombre y avatar de cada emisor de mensajes.
-- Con la política original, al intentar leer perfiles de otros usuarios
-- Supabase devuelve error (viola RLS) → 500 en GET /chat/rooms/:id/messages.
-- Solución: cualquier usuario autenticado puede leer perfiles básicos.
-- Las políticas SELECT en Supabase se aplican con OR, así que esta convive
-- sin problemas con la política "profiles_select_own" ya existente.

drop policy if exists "profiles_select_authenticated" on public.profiles;

create policy "profiles_select_authenticated"
  on public.profiles
  for select
  to authenticated
  using (true);
