# eMeet - Backend Plan

## 1. Objetivo del backend
El backend de eMeet debe permitir:
- autenticación de usuarios y organizadores,
- publicación y gestión de eventos,
- publicación y reproducción de videos cortos promocionales por evento,
- descubrimiento de eventos cercanos,
- filtros por categorías e intereses,
- interacción social mediante comunidad y match,
- seguridad de acceso basada en roles.

La prioridad del MVP es construir un backend simple, seguro y escalable sin crear una API separada innecesaria.

## 2. Stack elegido
### Frontend + capa servidor
- **Next.js** — Lenguaje de programación base del proyecto.
	- App Router para páginas y layouts.
	- Route Handlers para endpoints propios cuando se necesite lógica servidor.
	- Server Components y Server Actions para operaciones seguras desde servidor.

### Backend managed
- **Supabase** — Storage, Functions, Database, Auth.
	- PostgreSQL como base de datos principal.
	- Supabase Auth para registro e inicio de sesión.
	- Supabase Storage para imágenes y videos de eventos y perfiles.
	- Row Level Security (RLS) para proteger datos por usuario y rol.
	- RPC/SQL functions para consultas complejas como eventos cercanos.

### ORM
- **Prisma JS** — ORM para modelar y consultar la base de datos de Supabase desde Next.js.
	- Esquema tipado con generación automática de tipos TypeScript.
	- Migraciones controladas del esquema de base de datos.
	- Reemplaza el uso directo del cliente de Supabase para queries de negocio complejas.

### Hosting / CI-CD
- **Vercel** — Plataforma de despliegue para Next.js.
	- Deploy automático en cada push a rama principal.
	- Variables de entorno gestionadas por proyecto.
	- Edge Network para servir contenido estático optimizado.

### Repositorio
- **GitHub** — Control de versiones y colaboración.
	- Repositorio: https://github.com/Fr4nk017/eMeet
	- Integración con Vercel para CI-CD automático.

## 3. Decisión de arquitectura
No conviene crear un backend monolítico aparte en esta fase. El diseño recomendado es:

- Next.js como capa de presentación y orquestación.
- Supabase como backend principal de datos, auth y storage.
- Route Handlers de Next.js solo para:
	- webhooks,
	- operaciones sensibles con service role,
	- composición de respuestas que mezclen varias tablas,
	- validaciones adicionales de negocio.

## 4. Arquitectura general
```text
Cliente web (Next.js)
		|
		| autenticación / consultas / mutations
		v
Next.js server layer
		|
		| supabase client / admin client
		v
Supabase
	- Auth
	- Postgres
	- Storage
	- RLS
	- SQL functions / RPC
```

## 5. Responsabilidades por capa
### Next.js
- Renderizar la interfaz.
- Gestionar sesión del usuario en servidor y cliente.
- Validar inputs antes de persistir.
- Exponer endpoints propios cuando se necesite lógica compuesta.
- Proteger rutas privadas de organizadores y usuarios registrados.

### Supabase
- Persistencia de datos.
- Gestión de identidad.
- Seguridad de acceso con políticas RLS.
- Consultas geográficas para eventos cercanos.
- Almacenamiento de imágenes.

## 6. Módulos funcionales del backend
### 6.1 Autenticación y perfiles
Responsabilidades:
- registro con email y contraseña,
- login/logout,
- recuperación de contraseña,
- creación automática del perfil de usuario,
- distinción entre usuario normal, organizador y admin.

### 6.2 Gestión de eventos
Responsabilidades:
- crear evento,
- editar evento,
- pausar o despublicar evento,
- subir imágenes y videos cortos promocionales,
- asociar categorías,
- mostrar eventos activos.

### 6.3 Descubrimiento geolocalizado
Responsabilidades:
- recibir ubicación del usuario,
- calcular distancia a cada evento,
- ordenar por cercanía,
- aplicar filtros por categoría, fecha y precio,
- alimentar la experiencia tipo swipe basada en video corto.

### 6.4 Preferencias e intereses
Responsabilidades:
- guardar categorías favoritas,
- guardar radio máximo de búsqueda,
- personalizar resultados.

### 6.5 Comunidad y match
Responsabilidades:
- registrar interés del usuario por asistir acompañado,
- permitir interacción entre usuarios registrados,
- generar match cuando dos usuarios muestran interés compatible,
- habilitar conversaciones o grupos en una fase posterior.

## 7. Modelo de datos recomendado
## 7.1 Tabla profiles
Extiende la identidad de Supabase Auth.

Campos sugeridos:
- id UUID PK, igual a auth.users.id
- role TEXT check in ('user', 'organizer', 'admin')
- full_name TEXT
- username TEXT unique nullable
- avatar_url TEXT nullable
- bio TEXT nullable
- age INTEGER nullable
- city TEXT nullable
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

## 7.2 Tabla organizer_profiles
Representa negocios u organizadores.

Campos sugeridos:
- id UUID PK
- user_id UUID FK -> profiles.id
- business_name TEXT
- business_type TEXT
- description TEXT
- phone TEXT nullable
- website TEXT nullable
- verified BOOLEAN default false
- created_at TIMESTAMPTZ

## 7.3 Tabla categories
Catálogo de categorías.

Campos sugeridos:
- id BIGINT PK
- slug TEXT unique
- name TEXT
- icon TEXT nullable

## 7.4 Tabla events
Entidad principal del negocio.

Campos sugeridos:
- id UUID PK
- organizer_id UUID FK -> organizer_profiles.id
- title TEXT
- description TEXT
- category_id BIGINT FK -> categories.id
- start_at TIMESTAMPTZ
- end_at TIMESTAMPTZ nullable
- price NUMERIC(10,2) nullable
- currency TEXT default 'USD'
- venue_name TEXT
- address TEXT
- city TEXT
- latitude DOUBLE PRECISION
- longitude DOUBLE PRECISION
- cover_image_url TEXT nullable
- capacity INTEGER nullable
- status TEXT check in ('draft', 'published', 'paused', 'finished')
- is_featured BOOLEAN default false
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

Nota técnica:
Para consultas de cercanía, lo ideal es habilitar PostGIS en Supabase y almacenar un campo geográfico derivado de latitude y longitude.

## 7.5 Tabla event_images
- id UUID PK
- event_id UUID FK -> events.id
- image_url TEXT
- sort_order INTEGER default 0

## 7.6 Tabla event_videos
Clips cortos promocionales mostrados en el feed vertical.

Campos sugeridos:
- id UUID PK
- event_id UUID FK -> events.id
- video_url TEXT
- thumbnail_url TEXT nullable
- duration_seconds INTEGER
- is_primary BOOLEAN default false
- processing_status TEXT check in ('pending', 'ready', 'failed')
- created_at TIMESTAMPTZ

## 7.7 Tabla user_preferences
- user_id UUID PK FK -> profiles.id
- max_distance_km INTEGER default 20
- preferred_price_level TEXT nullable
- looking_for_company BOOLEAN default false
- updated_at TIMESTAMPTZ

## 7.8 Tabla user_category_preferences
- id UUID PK
- user_id UUID FK -> profiles.id
- category_id BIGINT FK -> categories.id

## 7.9 Tabla event_swipes
Registra la interacción del feed de videos con eventos.

Campos sugeridos:
- id UUID PK
- user_id UUID FK -> profiles.id
- event_id UUID FK -> events.id
- action TEXT check in ('right', 'left', 'save')
- source TEXT check in ('video_feed', 'event_card') default 'video_feed'
- created_at TIMESTAMPTZ

Regla:
- unique(user_id, event_id)

Regla de UX:
- right representa interés en asistir.
- left representa descarte.

## 7.10 Tabla event_attendance_intents
Registra intención de asistir y si el usuario quiere ir acompañado.

Campos sugeridos:
- id UUID PK
- user_id UUID FK -> profiles.id
- event_id UUID FK -> events.id
- status TEXT check in ('interested', 'going')
- wants_company BOOLEAN default false
- created_at TIMESTAMPTZ

Regla:
- unique(user_id, event_id)

## 7.11 Tabla user_matches
Puede ser global o asociada a un evento. Para MVP conviene asociarla al evento.

Campos sugeridos:
- id UUID PK
- event_id UUID FK -> events.id
- user_a UUID FK -> profiles.id
- user_b UUID FK -> profiles.id
- status TEXT check in ('pending', 'accepted', 'rejected', 'blocked')
- created_at TIMESTAMPTZ

Reglas:
- unique(event_id, user_a, user_b)
- user_a != user_b

## 8. Autenticación y autorización
### Roles
- user: explora eventos, guarda preferencias, usa comunidad y match.
- organizer: crea y administra sus eventos.
- admin: modera contenido y usuarios.

### Flujo recomendado
1. El usuario se registra con Supabase Auth.
2. Un trigger SQL crea su fila en profiles.
3. Si solicita cuenta de organizador, se crea organizer_profiles.
4. Las políticas RLS controlan qué puede leer o modificar cada rol.

## 9. Reglas de seguridad con RLS
### Profiles
- cada usuario puede leer y editar su propio perfil.
- admin puede leer y editar todos.

### Events
- cualquiera puede leer eventos con status = 'published'.
- organizer solo puede insertar y editar eventos propios.
- admin puede moderar todos.

### Event swipes y preferencias
- cada usuario solo puede crear y ver sus propios registros.

### Matches
- solo los usuarios involucrados pueden ver su match.
- admin puede moderar si es necesario.

## 10. Consultas críticas del sistema
### 10.1 Eventos cercanos
Recomendación:
- crear una función SQL o RPC get_nearby_events(lat, lng, radius_km, category_id, limit_count)
- ordenar por distancia ascendente.

Debe devolver como mínimo:
- datos del evento,
- nombre del organizador,
- distancia estimada,
- imagen principal,
- categoría.

### 10.2 Feed tipo swipe
El feed debe excluir:
- eventos ya descartados,
- eventos finalizados,
- eventos fuera del radio del usuario.

Comportamiento requerido:
- formato vertical tipo TikTok con clip corto principal por evento,
- swipe right para marcar interés,
- swipe left para descartar,
- reproducción automática del video principal en cada tarjeta del feed.

### 10.3 Match por evento
Un match debe ocurrir cuando:
- ambos usuarios hicieron swipe right en el mismo evento,
- ambos tienen wants_company = true,
- ninguno bloqueó al otro.

Para MVP, esta lógica puede vivir en Route Handlers de Next.js o en una función SQL, según complejidad.

## 11. Endpoints y operaciones sugeridas
No todos deben ser API públicas. Algunas pueden resolverse con Server Actions.

### Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout

### Events
- GET /api/events
- GET /api/events/nearby
- GET /api/events/:id
- GET /api/events/:id/videos
- POST /api/events
- PATCH /api/events/:id
- DELETE /api/events/:id

### Feed
- GET /api/feed/video-swipe

### Preferences
- GET /api/me/preferences
- PUT /api/me/preferences

### Swipes
- POST /api/swipes

### Attendance
- POST /api/events/:id/attendance

### Match
- GET /api/matches
- POST /api/matches/respond

## 12. Estructura sugerida en Next.js
```text
src/
	app/
		api/
			events/
			feed/
			swipes/
			matches/
			me/
	lib/
		supabase/
			client.ts
			server.ts
			admin.ts
		validations/
			event.schema.ts
			profile.schema.ts
		services/
			event.service.ts
			feed.service.ts
			match.service.ts
			user.service.ts
		auth/
			permissions.ts
```

Regla recomendada:
- la lógica de negocio no debe quedar dispersa en los Route Handlers.
- los handlers deben delegar en services.

## 13. Variables de entorno mínimas
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Prisma
DATABASE_URL=
```

Reglas:
- SUPABASE_SERVICE_ROLE_KEY solo debe usarse en servidor.
- DATABASE_URL es la connection string de Supabase Postgres usada por Prisma.
- En Vercel, todas las variables se configuran en el dashboard del proyecto.

## 14. Storage
Buckets sugeridos:
- event-images
- event-videos
- profile-avatars

Reglas:
- usuarios normales solo suben su avatar.
- organizadores suben imágenes y videos de sus propios eventos.
- archivos públicos solo cuando realmente deban ser visibles sin firma.

Validación recomendada para videos cortos:
- duración máxima entre 15 y 45 segundos en MVP,
- formatos permitidos: mp4 y mov,
- tamaño máximo por archivo según presupuesto de storage.

## 15. Validaciones clave de negocio
- no se puede publicar un evento sin título, fecha, categoría y ubicación.
- cada evento publicado debe tener al menos un video corto en estado ready para aparecer en el feed swipe.
- un organizador no puede editar eventos de otro organizador.
- un usuario no puede generar match sin estar autenticado.
- la comunidad y match deben requerir registro.
- no se deben mostrar eventos pausados o finalizados en el feed principal.

## 16. Observabilidad y mantenimiento
Para el MVP:
- registrar errores de Route Handlers.
- guardar timestamps en todas las tablas principales.
- usar soft states como published, paused y finished en vez de borrar eventos.

Más adelante:
- agregar logs centralizados,
- métricas de uso del feed,
- auditoría de moderación.

## 17. Roadmap técnico recomendado
### Fase 1
- Auth con Supabase.
- Tabla profiles.
- Tabla categories.
- Tabla events.
- Lectura de eventos publicados.

### Fase 2
- Geolocalización y consulta de eventos cercanos.
- Preferencias de usuario.
- Feed tipo swipe con video corto vertical.

### Fase 3
- Attendance intents.
- Match entre usuarios.
- Storage de imágenes.

### Fase 4
- Panel de organizadores.
- Moderación admin.
- Analítica básica.

## 18. Recomendación final
Para eMeet, la mejor decisión técnica en esta etapa es usar Next.js como fullstack app y Supabase como backend administrado. Eso reduce complejidad, acelera el MVP y deja una base suficientemente sólida para escalar el producto sin construir infraestructura innecesaria desde el inicio.
