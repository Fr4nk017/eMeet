# Descripción de la Persistencia de Datos — eMeet

## Tecnología de Persistencia

eMeet utiliza **Supabase** como plataforma de persistencia, que provee:
- **PostgreSQL** como motor de base de datos relacional
- **Row Level Security (RLS)** para control de acceso a nivel de fila
- **Supabase Storage** para archivos multimedia
- **Supabase Realtime** para sincronización en tiempo real

> La persistencia **no utiliza JPA** (tecnología Java). El stack es Node.js/TypeScript y la interacción con la base de datos se realiza a través del **cliente oficial de Supabase** (`@supabase/supabase-js`), que provee una API de consultas type-safe equivalente a un ORM.

---

## Esquema de la Base de Datos

### Tabla: `profiles`
Almacena el perfil público de cada usuario autenticado.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | FK → auth.users.id |
| name | TEXT | Nombre del usuario |
| bio | TEXT | Descripción personal |
| avatar_url | TEXT | URL de foto de perfil |
| location | TEXT | Ciudad/ubicación |
| interests | TEXT[] | Array de categorías de interés |
| role | TEXT | `'user'` / `'locatario'` / `'admin'` |
| business_name | TEXT | Nombre del negocio (locatarios) |
| business_location | TEXT | Ubicación del negocio |
| is_banned | BOOLEAN | Estado de baneo |
| created_at | TIMESTAMPTZ | Fecha de registro |

### Tabla: `events`
Eventos creados por locatarios.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK generado |
| title | TEXT | Nombre del evento |
| description | TEXT | Descripción |
| category | TEXT | Categoría (musica, gastronomia, etc.) |
| event_date | TIMESTAMPTZ | Fecha y hora del evento |
| address | TEXT | Dirección |
| lat / lng | FLOAT | Coordenadas geográficas |
| organizer_id | UUID | FK → auth.users.id |
| organizer_name | TEXT | Nombre del organizador |
| media_url | TEXT | URL de imagen/video principal |
| created_at | TIMESTAMPTZ | Fecha de creación |

### Tabla: `user_events`
Registra likes y guardados de usuarios sobre eventos.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → auth.users.id |
| event_id | UUID | FK → events.id |
| type | TEXT | `'like'` / `'save'` |
| created_at | TIMESTAMPTZ | Fecha de interacción |

### Tabla: `chat_rooms`
Una sala de chat por evento.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK |
| event_id | UUID | FK → events.id (único) |
| event_title | TEXT | Título del evento |
| expires_at | TIMESTAMPTZ | Expiración de la sala |
| created_at | TIMESTAMPTZ | Fecha de creación |

### Tabla: `room_members`
Membresía de usuarios en salas de chat.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK |
| room_id | UUID | FK → chat_rooms.id |
| user_id | UUID | FK → auth.users.id |
| joined_at | TIMESTAMPTZ | Fecha de unión |
| last_read_at | TIMESTAMPTZ | Último mensaje leído |

### Tabla: `messages`
Mensajes de chat.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK |
| room_id | UUID | FK → chat_rooms.id |
| user_id | UUID | FK → auth.users.id |
| text | TEXT | Contenido del mensaje |
| created_at | TIMESTAMPTZ | Timestamp del mensaje |

---

## Row Level Security (RLS)

Supabase aplica RLS directamente en PostgreSQL. Cada tabla tiene políticas que restringen el acceso según el usuario autenticado:

```sql
-- Ejemplo: usuarios solo ven su propio perfil
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Ejemplo: solo el organizador puede editar su evento
CREATE POLICY "Organizers can update own events"
ON events FOR UPDATE
USING (auth.uid() = organizer_id);
```

Los microservicios usan **dos tipos de clientes**:
- **`SUPABASE_ANON_KEY`** (+ token JWT del usuario): Respeta RLS. Usado para operaciones del usuario.
- **`SUPABASE_SERVICE_ROLE_KEY`**: Bypasa RLS. Usado para operaciones administrativas (ej: contar miembros de salas, eliminar usuarios).

---

## Supabase Storage (Archivos Multimedia)

Los eventos pueden tener imágenes y videos. El flujo de upload:

```
1. Frontend solicita URL firmada: POST /events/upload-url
2. app-events genera Signed URL via Supabase Storage Admin API
3. Frontend sube el archivo DIRECTAMENTE a Supabase Storage (evita límite de 4.5MB de Vercel)
4. Supabase almacena el archivo en bucket 'event-media'
5. La URL pública se guarda en events.media_url
```

Bucket configurado: `event-media` (público para lectura).

---

## Supabase Realtime (Chat en Tiempo Real)

Los mensajes de chat se sincronizan en tiempo real usando Supabase Realtime:

```typescript
// Frontend se suscribe a cambios en la tabla messages
const channel = supabase
  .channel(`room:${roomId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `room_id=eq.${roomId}`
  }, (payload) => {
    setMessages(prev => [...prev, payload.new])
  })
  .subscribe()
```

Supabase Realtime usa WebSockets y replication de PostgreSQL para propagar cambios a los clientes suscritos.

---

## Cliente de Supabase (Equivalente a ORM)

Cada microservicio inicializa dos clientes:

```typescript
// Cliente con contexto del usuario (respeta RLS)
export function createAnonClient(authToken: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${authToken}` } }
  })
}

// Cliente administrativo (bypasa RLS)
export function createServiceRoleClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}
```

Las consultas tienen una API fluida equivalente a JPA Criteria API:

```typescript
// SELECT con filtros y joins
const { data, error } = await supabase
  .from('events')
  .select('*, profiles(name, avatar_url)')
  .gte('event_date', new Date().toISOString())
  .order('event_date', { ascending: true })

// INSERT
const { data, error } = await supabase
  .from('messages')
  .insert({ room_id, user_id, text })
  .select()
  .single()

// UPDATE con condición
const { error } = await supabase
  .from('profiles')
  .update({ is_banned: true })
  .eq('id', userId)
```

---

## Resumen

| Aspecto | Implementación |
|---------|----------------|
| Motor BD | PostgreSQL (vía Supabase) |
| ORM/Query Builder | Supabase JS Client v2 |
| Control de acceso | Row Level Security (RLS) políticas SQL |
| Archivos | Supabase Storage (S3-compatible) |
| Tiempo real | Supabase Realtime (WebSockets + Postgres replication) |
| Autenticación | Supabase Auth (JWT, OAuth Google) |
| Backup | Automático en Supabase (plan free: 1 semana) |
