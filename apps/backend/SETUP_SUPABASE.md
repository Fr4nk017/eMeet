# eMeet Backend con Supabase

## 1) SQL inicial
1. Abre Supabase Dashboard -> SQL Editor.
2. Ejecuta el archivo [supabase/001_emeet_schema.sql](supabase/001_emeet_schema.sql).
3. Verifica que existan tablas: `profiles`, `user_events`, `chat_rooms`, `room_members`, `chat_messages`.

## 2) Auth (email/password)
1. Ve a Authentication -> Providers.
2. Habilita `Email` y `Password`.
3. En Authentication -> URL Configuration configura:
- Site URL: `http://localhost:3000`
- Redirect URLs:
  - `http://localhost:3000/auth`
  - `http://localhost:3000`

## 3) Realtime
1. Ve a Database -> Replication.
2. Asegura que `chat_messages` y `room_members` estén publicadas en `supabase_realtime`.
3. En el frontend, usa canales por sala con patrón `rooms:{roomId}`.

## 4) Storage para avatares
1. Ve a Storage y verifica bucket `avatars` (público).
2. Revisa políticas de `storage.objects`:
- Lectura pública en bucket `avatars`.
- Insert/Update/Delete restringido a `avatars/{user_id}/*` para usuarios autenticados.

## 5) Variables de entorno (Next.js)
Configura en [eMeet_frontend/.env.local](../eMeet_frontend/.env.local):

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

## 6) Decisión por endpoint

| Área | Endpoint | Recomendación |
|---|---|---|
| Auth | POST /auth/login | Cliente directo (`supabase.auth.signInWithPassword`) |
| Auth | POST /auth/register | Cliente directo (`supabase.auth.signUp`) |
| Auth | POST /auth/logout | Cliente directo (`supabase.auth.signOut`) |
| Auth | GET /auth/session | Cliente directo (`supabase.auth.getSession`) |
| Perfil | GET /profile | Cliente directo (`profiles` con RLS) |
| Perfil | PATCH /profile | Cliente directo (`profiles` con RLS) |
| Perfil | POST /profile/avatar | Cliente directo (Storage + update profile) |
| Eventos | POST /events/like | Route Handler recomendado si quieres lógica orquestada; cliente directo posible |
| Eventos | POST /events/save | Cliente directo |
| Eventos | DELETE /events/like/:id | Cliente directo |
| Eventos | DELETE /events/save/:id | Cliente directo |
| Eventos | GET /events/liked | Cliente directo |
| Eventos | GET /events/saved | Cliente directo |
| Chat | GET /chat/rooms | Cliente directo |
| Chat | POST /chat/rooms/:id/join | Cliente directo |
| Chat | GET /chat/rooms/:id/messages | Cliente directo |
| Chat | POST /chat/rooms/:id/messages | Cliente directo |
| Chat | POST /chat/rooms/:id/read | Cliente directo |
| Chat | GET /chat/rooms/:id/unread | Cliente directo o vista SQL/RPC |

## 7) Estado de integración frontend
1. `AuthContext` ya usa Supabase Auth + perfil real + `onAuthStateChange`.
2. `ChatContext` ya usa tablas reales + Realtime + persistencia.
3. Feed (`app/page.tsx`) ya registra likes/saves en DB y marca `isLiked/isSaved` desde usuario autenticado.
4. Middleware de Next.js ya refresca sesión automáticamente con `@supabase/ssr`.
