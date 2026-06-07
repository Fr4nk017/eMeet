# eMeet - Backend Plan Actual

> **Nota:** este plan fue actualizado para quedar alineado con el **frontend que existe hoy**. Actualmente el proyecto ya funciona como un MVP en `Next.js`, y la integración con `Google Places API` se está usando solo como apoyo de desarrollo. En la arquitectura propuesta, esa consulta se centraliza en el **backend / BFF**, junto con autenticación, persistencia y tiempo real.

---

## 1. Estado actual del proyecto frente al frontend

| Área funcional | Estado actual en frontend | Soporte backend requerido |
|---|---|---|
| **Autenticación** | Pantalla `/auth` operativa con login y registro simulados | Integrar `Supabase Auth`, sesiones reales y recuperación de cuenta |
| **Feed principal** | Descubre bares, cafés, restaurantes y discotecas cercanas usando Google Places | Persistir historial, preferencias, likes y guardados |
| **Búsqueda** | Filtros por categoría y exploración visual de panoramas | Guardar preferencias de uso y enriquecer recomendaciones |
| **Guardados** | Existe interfaz `/saved`, pero hoy usa estado local/mock | Persistencia en PostgreSQL por usuario |
| **Perfil** | Intereses y preferencias gestionadas localmente | Guardar y recuperar perfil desde base de datos |
| **Chat / comunidad** | Salas y mensajes simulados con `ChatContext` | Realtime + almacenamiento persistente de salas y mensajes |

---

## 2. Objetivo del backend

El backend de `eMeet` debe construirse para **respaldar exactamente lo que el frontend actual ya muestra**, sin sobrediseñar la solución.

Las prioridades reales son:

- autenticación de usuarios con sesión segura;
- persistencia de perfil, intereses y preferencias;
- almacenamiento de acciones como `like`, `save` y descartes;
- soporte para salas comunitarias asociadas a lugares;
- base de datos para historial e interacciones del usuario;
- seguridad de acceso con control por usuario y futuro rol administrativo.

La idea no es crear una API separada innecesaria, sino usar una arquitectura práctica y escalable para el MVP.

---

## 3. Stack backend propuesto

| Capa | Tecnología | Rol propuesto |
|---|---|---|
| **BFF / server layer** | `Next.js Route Handlers` + `Server Actions` | Orquestar lógica segura entre frontend y servicios |
| **Base de datos** | `Supabase PostgreSQL` | Persistir usuarios, preferencias, acciones y mensajes |
| **Autenticación** | `Supabase Auth` | Registro, login, sesiones y control de acceso |
| **ORM** | `Prisma ORM` | Modelado tipado, migraciones y consultas mantenibles |
| **Tiempo real** | `Supabase Realtime` | Actualizar chat y actividad comunitaria |
| **Archivos** | `Supabase Storage` | Guardar avatares y recursos futuros |
| **Servicio externo de lugares** | `Google Places API` | Obtener y enriquecer panoramas cercanos desde el backend |
| **Hosting** | `Vercel` | Despliegue del frontend + capa servidor de Next.js |
| **Repositorio** | `GitHub` | Control de versiones y colaboración del equipo |

---

## 4. Decisión de arquitectura alineada con el frontend actual

La decisión más coherente es mantener a **Next.js como capa de presentación y orquestación**, mientras `Supabase` resuelve identidad, persistencia y sincronización en tiempo real.

```text
Usuario final
   |
   v
Frontend web (Next.js App Router)
   |
   v
BFF / Route Handlers de Next.js
   |
   +--> Google Places API
   +--> Supabase Auth
   +--> Prisma ORM -> PostgreSQL (Supabase)
   +--> Supabase Realtime
   +--> Supabase Storage
```

### ¿Por qué esta arquitectura sí calza con el frontend actual?
- el frontend ya está montado en `Next.js`;
- la integración con lugares externos puede centralizarse en el backend para ocultar claves y controlar costos;
- lo que falta no es otra interfaz, sino **persistencia y seguridad**;
- `AuthContext`, `NearbyPlacesContext` y `ChatContext` pueden migrar de mock a backend real de forma progresiva.

---

## 5. Módulos prioritarios del backend según el frontend actual

### 5.1 Autenticación y perfiles
Responsabilidades:
- registro e inicio de sesión reales;
- cierre de sesión;
- creación automática del perfil del usuario;
- persistencia de nombre, avatar, bio, ciudad e intereses.

### 5.2 Preferencias y personalización
Responsabilidades:
- guardar tipos de lugar preferidos;
- guardar radio máximo de búsqueda;
- permitir ajustar filtros persistentes desde `/profile`.

### 5.3 Acciones del usuario sobre lugares
Responsabilidades:
- registrar `like`, `save` y descarte;
- guardar historial de interacciones;
- poblar correctamente la vista `/saved`.

### 5.4 Comunidad y chat por lugar
Responsabilidades:
- crear o recuperar una sala asociada a un lugar (`placeId`);
- guardar miembros de la comunidad;
- persistir mensajes;
- entregar actualización en tiempo real en una fase posterior.

### 5.5 Integración y caché de lugares externos
Responsabilidades:
- consultar `Google Places API` desde el backend, no desde el cliente;
- almacenar metadata relevante para evitar repetir consultas innecesarias;
- guardar nombre, dirección, categoría, rating, web e imagen;
- facilitar métricas y recomendaciones futuras.

---

## 6. Modelo de datos recomendado

### 6.1 Tabla `profiles`
Extiende la identidad base de `Supabase Auth`.

Campos sugeridos:
- `id UUID PK` = `auth.users.id`
- `full_name TEXT`
- `email TEXT`
- `avatar_url TEXT NULL`
- `bio TEXT NULL`
- `city TEXT NULL`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

### 6.2 Tabla `user_preferences`
Guarda personalización del usuario.

Campos sugeridos:
- `user_id UUID PK FK -> profiles.id`
- `max_distance_km INTEGER DEFAULT 3`
- `preferred_place_types TEXT[]`
- `interests TEXT[]`
- `updated_at TIMESTAMPTZ`

### 6.3 Tabla `cached_places`
Representa lugares obtenidos desde Google Places que vale la pena persistir o reutilizar.

Campos sugeridos:
- `place_id TEXT PK`
- `name TEXT`
- `address TEXT`
- `type TEXT`
- `category TEXT`
- `latitude DOUBLE PRECISION`
- `longitude DOUBLE PRECISION`
- `rating NUMERIC NULL`
- `total_ratings INTEGER NULL`
- `price_level INTEGER NULL`
- `photo_url TEXT NULL`
- `website TEXT NULL`
- `phone TEXT NULL`
- `updated_at TIMESTAMPTZ`

### 6.4 Tabla `user_place_actions`
Registra interacción del usuario sobre un lugar.

Campos sugeridos:
- `id UUID PK`
- `user_id UUID FK -> profiles.id`
- `place_id TEXT FK -> cached_places.place_id`
- `action TEXT CHECK IN ('like', 'save', 'dismiss')`
- `created_at TIMESTAMPTZ`

Regla sugerida:
- `unique(user_id, place_id, action)`

### 6.5 Tabla `chat_rooms`
Sala comunitaria asociada a un lugar.

Campos sugeridos:
- `id TEXT PK`  
- `place_id TEXT FK -> cached_places.place_id`
- `title TEXT`
- `address TEXT`
- `image_url TEXT NULL`
- `created_at TIMESTAMPTZ`

> Para simplificar el MVP, `id` puede reutilizar el mismo `placeId` que ya usa el frontend.

### 6.6 Tabla `chat_room_members`
Participantes de cada sala.

Campos sugeridos:
- `id UUID PK`
- `room_id TEXT FK -> chat_rooms.id`
- `user_id UUID FK -> profiles.id`
- `joined_at TIMESTAMPTZ`

### 6.7 Tabla `chat_messages`
Mensajes enviados dentro de una comunidad.

Campos sugeridos:
- `id UUID PK`
- `room_id TEXT FK -> chat_rooms.id`
- `sender_id UUID FK -> profiles.id`
- `text TEXT`
- `created_at TIMESTAMPTZ`

---

## 7. Operaciones y endpoints sugeridos

No todo tiene que ser API pública; varias operaciones pueden resolverse con `Server Actions` o `Route Handlers` internos.

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

### Perfil y preferencias
- `GET /api/me`
- `PATCH /api/me`
- `GET /api/me/preferences`
- `PUT /api/me/preferences`

### Lugares e interacciones
- `POST /api/places/action`
- `GET /api/places/saved`
- `GET /api/places/history`

### Chat / comunidad
- `GET /api/chat/rooms`
- `POST /api/chat/rooms/join`
- `GET /api/chat/rooms/:id/messages`
- `POST /api/chat/rooms/:id/messages`

---

## 8. Seguridad y autorización

### Reglas base recomendadas
- cada usuario solo puede leer y editar su propio perfil;
- cada usuario solo puede ver y modificar sus propias preferencias;
- las acciones `like`, `save` y `dismiss` deben quedar restringidas al usuario autenticado;
- los mensajes de chat solo deben ser visibles para miembros de la sala;
- las claves sensibles (`service role`, `DATABASE_URL`) nunca deben exponerse en el cliente.

### Aplicación de RLS
En `Supabase`, las políticas **RLS** deben cubrir al menos:
- `profiles`
- `user_preferences`
- `user_place_actions`
- `chat_room_members`
- `chat_messages`

---

## 9. Variables de entorno mínimas

```env
# Google Places / Maps (solo servidor)
GOOGLE_PLACES_API_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Prisma / PostgreSQL
DATABASE_URL=
```

Reglas:
- `NEXT_PUBLIC_*` puede ser leído por el navegador;
- `SUPABASE_SERVICE_ROLE_KEY` solo debe usarse del lado servidor;
- `DATABASE_URL` corresponde a la conexión PostgreSQL usada por Prisma.

---

## 10. Roadmap técnico recomendado según el estado actual del frontend

### Fase 1 — Reemplazar mocks críticos
- integrar `Supabase Auth`;
- crear tabla `profiles`;
- persistir datos de usuario y preferencias;
- reemplazar `AuthContext` mock por autenticación real.

### Fase 2 — Persistencia de interacciones
- guardar `likes`, `saved` y descartes;
- poblar realmente la vista `/saved`;
- asociar acciones a lugares obtenidos desde Google Places.

### Fase 3 — Comunidad en tiempo real
- crear salas persistentes por lugar;
- guardar mensajes reales;
- conectar `/chat` con `Supabase Realtime`.

### Fase 4 — Evolución futura
- notificaciones;
- recomendaciones más inteligentes;
- promociones, cupones o QR;
- analítica de uso y moderación.

---

## 11. Recomendación final

El backend de `eMeet` debe evolucionar **siguiendo el frontend actual**, no reemplazándolo. Hoy el MVP ya valida el flujo de descubrimiento social de lugares cercanos; por lo tanto, la prioridad correcta es construir una capa backend que:

1. elimine los mocks de autenticación y chat,
2. persista preferencias e interacciones reales,
3. mantenga el uso de `Google Places API` como fuente de lugares,
4. y permita escalar progresivamente con `Supabase` + `Prisma`.

Con esta estrategia, el proyecto se mantiene coherente, realista y técnicamente sostenible para las siguientes etapas.
