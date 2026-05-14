# eMeet — Plataforma de Descubrimiento de Eventos

> Monorepo fullstack modular con servicios por dominio.  
> Proyecto académico — Fullstack III.

---

## Índice

1. [Descripción](#descripción)
2. [Arquitectura](#arquitectura)
3. [Tecnologías principales](#tecnologías-principales)
4. [Estructura del repositorio](#estructura-del-repositorio)
5. [Instalación y configuración](#instalación-y-configuración)
6. [Variables de entorno](#variables-de-entorno)
7. [Ejecución en desarrollo](#ejecución-en-desarrollo)
8. [Base de datos — Prisma y migraciones](#base-de-datos--prisma-y-migraciones)
9. [Uso de Prisma y Supabase](#uso-de-prisma-y-supabase)
10. [Microservicios y puertos](#microservicios-y-puertos)
11. [Seguridad](#seguridad)

---

## Descripción

**eMeet** conecta usuarios con eventos locales (gastronomía, música, cultura, networking, deporte, etc.) mediante una interfaz móvil-first con mecánica de swipe. Los usuarios evalúan eventos deslizando tarjetas, se unen a salas de chat grupales por evento y gestionan su perfil e intereses.

---

## Arquitectura

eMeet adopta una **arquitectura de monorepo fullstack modular** gestionada con [Turborepo](https://turbo.build/). El frontend y cada dominio de negocio del backend son aplicaciones independientes que comparten paquetes internos del monorepo.

```
eMeet (Turborepo + npm workspaces)
│
├── apps/
│   ├── app-web          ← Frontend Next.js 14 (SSR + Client Components)
│   ├── app-auth         ← Microservicio: Autenticación        :3001
│   ├── app-profile      ← Microservicio: Perfiles de usuario  :3002
│   ├── app-events       ← Microservicio: Eventos              :3003
│   ├── app-saved        ← Microservicio: Eventos guardados    :3004
│   ├── app-chat         ← Microservicio: Chat grupal          :3005
│   ├── app-places       ← Microservicio: Lugares / Geocode    :3006
│   └── app-admin        ← Microservicio: Panel de administración :3007
│
└── packages/
    ├── db               ← Prisma schema, migraciones y PrismaClient
    ├── redis            ← Cliente Redis compartido
    └── shared           ← Tipos y utilidades compartidas
```

### Diagrama de capas

```
┌─────────────────────────────────────────────────┐
│             Navegador (cliente)                  │
│  Next.js Client Components + Supabase Realtime  │
└───────────────────┬─────────────────────────────┘
                    │ HTTP / WebSocket
┌───────────────────▼─────────────────────────────┐
│         app-web  (Next.js 14 · puerto 3000)      │
│  Server Components · API Routes · Supabase SSR   │
└──┬──────────┬──────────┬──────────┬─────────────┘
   │          │          │          │  fetch() a microservicios
   ▼          ▼          ▼          ▼
app-auth  app-profile  app-chat  app-events  ...
(3001)    (3002)       (3005)    (3003)
   │          │          │          │
   └──────────┴──────────┴──────────┘
                    │
        ┌───────────▼───────────┐
        │    Supabase           │
        │  PostgreSQL + Auth    │
        │  Realtime (chat)      │
        └───────────────────────┘
```

---

## Tecnologías principales

| Categoría | Tecnología | Versión | Rol |
|---|---|---|---|
| **Monorepo** | Turborepo | 2.x | Orquestador de builds y dev |
| **Frontend** | Next.js | 14 | SSR, API Routes, routing |
| **UI** | React + TypeScript | 18 / 5.x | Componentes tipados |
| **Estilos** | Tailwind CSS | 3.x | Utilidades CSS |
| **Animaciones** | Framer Motion | 12 | Swipe, transiciones |
| **Backend** | Express.js + TypeScript | 4.x | Microservicios REST |
| **Auth** | Supabase Auth + `@supabase/ssr` | — | Autenticación SSR-compatible |
| **Base de datos** | Supabase PostgreSQL | — | Almacenamiento principal |
| **ORM** | Prisma | 5.x | Modelado de esquema y migraciones |
| **Realtime** | Supabase Postgres Changes | — | Chat en tiempo real |
| **Cache** | Redis | — | Cache compartido |
| **Maps** | Google Maps API | — | Mapa y geocodificación |
| **Eventos ext.** | Ticketmaster Discovery API | v2 | Feed de eventos externos |

---

## Estructura del repositorio

### `apps/`

Cada subdirectorio es una aplicación independiente con su propio `package.json` y servidor.

| App | Puerto | Descripción |
|---|---|---|
| `app-web` | 3000 | Frontend Next.js 14. Consume los microservicios via fetch y gestiona sesión con Supabase SSR. |
| `app-auth` | 3001 | Endpoints de autenticación y validación de tokens. Usa Supabase Auth como proveedor. |
| `app-profile` | 3002 | CRUD de perfiles de usuario. Consulta Supabase JS con Service Role Key. |
| `app-events` | 3003 | Gestión de eventos de locatarios (`locatario_events`). |
| `app-saved` | 3004 | Registra likes y guardados (`user_events`). |
| `app-chat` | 3005 | Salas de chat grupales por evento (`chat_rooms`, `room_members`, `chat_messages`). |
| `app-places` | 3006 | Geocodificación y búsqueda de lugares via Google Maps API (server-side). |
| `app-admin` | 3007 | Panel de administración — gestión de usuarios y eventos con permisos elevados. |

### `packages/`

Paquetes internos compartidos entre apps.

| Package | Descripción |
|---|---|
| `@emeet/db` | Prisma schema, cliente generado y scripts de migración. |
| `@emeet/redis` | Cliente Redis configurado y exportado para consumo en microservicios. |
| `@emeet/shared` | Tipos TypeScript y utilidades comunes. |

---

## Instalación y configuración

### Requisitos previos

- Node.js >= 18
- npm >= 10
- Redis local (opcional en desarrollo — ver `packages/redis`)
- Cuenta en [Supabase](https://supabase.com) con proyecto creado

### Pasos

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd eMeet

# 2. Instalar todas las dependencias del monorepo
npm install

# 3. Configurar variables de entorno (ver sección siguiente)
cp .env.example .env.local                    # raíz (opcional, para referencia)
cp apps/app-web/.env.example apps/app-web/.env.local
cp apps/app-auth/.env.example apps/app-auth/.env
cp apps/app-profile/.env.example apps/app-profile/.env
cp apps/app-events/.env.example apps/app-events/.env
cp apps/app-saved/.env.example apps/app-saved/.env
cp apps/app-chat/.env.example apps/app-chat/.env
cp apps/app-places/.env.example apps/app-places/.env
cp apps/app-admin/.env.example apps/app-admin/.env
cp packages/db/.env.example packages/db/.env
cp packages/redis/.env.example packages/redis/.env

# 4. Generar el cliente Prisma
npm run db:generate --workspace=packages/db

# 5. Correr migraciones (si existen)
npm run db:migrate:deploy --workspace=packages/db
```

---

## Variables de entorno

El archivo [`.env.example`](./.env.example) en la raíz contiene **todas las variables del monorepo** con descripciones y secciones organizadas.

Cada app tiene también su propio `.env.example` con solo las variables que necesita.

**Clasificación por visibilidad:**

| Tipo | Prefijo | Visible en | Ejemplos |
|---|---|---|---|
| Público (cliente) | `NEXT_PUBLIC_` | Navegador + Servidor | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` |
| Privado (servidor) | *(sin prefijo)* | Solo Servidor | `SUPABASE_SERVICE_ROLE_KEY`, `TICKETMASTER_API_KEY`, `DATABASE_URL` |
| Backend microservicio | *(sin prefijo)* | Solo el proceso Node | `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_MAPS_API_KEY` |

> **Regla crítica:** `SUPABASE_SERVICE_ROLE_KEY` bypasea Row Level Security.  
> Solo puede estar en procesos de servidor. Nunca con `NEXT_PUBLIC_`.

---

## Ejecución en desarrollo

```bash
# Levantar TODOS los servicios en paralelo (Turbo)
npm run dev

# Levantar solo el frontend
npm run dev --workspace=apps/app-web

# Levantar solo un microservicio
npm run dev --workspace=apps/app-chat
```

Los puertos de cada servicio se listan en la sección [Microservicios y puertos](#microservicios-y-puertos).

El script `predev` del `package.json` raíz ejecuta `kill-port` en todos los puertos antes de iniciar, evitando conflictos de puerto en reinicios.

---

## Base de datos — Prisma y migraciones

El esquema vive en [`packages/db/prisma/schema.prisma`](./packages/db/prisma/schema.prisma). Todos los comandos de Prisma se ejecutan desde ese workspace.

```bash
# Generar PrismaClient (después de cualquier cambio en schema.prisma)
npm run db:generate --workspace=packages/db

# Crear y aplicar una migración en desarrollo
npm run db:migrate:dev --workspace=packages/db

# Aplicar migraciones pendientes en producción (sin interactividad)
npm run db:migrate:deploy --workspace=packages/db

# Sincronizar schema directamente con la DB (sin migración — solo dev rápido)
npm run db:push --workspace=packages/db

# Abrir Prisma Studio (explorador visual de la base de datos)
npm run db:studio --workspace=packages/db
```

Las variables de entorno necesarias están en `packages/db/.env`:

```env
DATABASE_URL=   # Pooler de Supabase (puerto 6543) — runtime
DIRECT_URL=     # Conexión directa (puerto 5432)   — migraciones
```

---

## Uso de Prisma y Supabase

Este proyecto implementa una **estrategia híbrida** documentada que no es contradictoria: Prisma y Supabase JS cumplen roles distintos y complementarios.

### Supabase como proveedor de infraestructura

| Componente | Qué hace en eMeet |
|---|---|
| **Supabase Auth** | Gestiona el ciclo completo de autenticación: registro, login, sesiones y tokens JWT. Se consume via `@supabase/ssr` en el frontend (cookies) y via SDK en los microservicios para validar tokens. |
| **Supabase PostgreSQL** | Base de datos relacional donde residen todas las tablas del proyecto. Supabase la administra (backups, conexiones, Row Level Security). |
| **Supabase Realtime** | Suscripción a cambios en `chat_messages` via `CHANNEL.on('postgres_changes', ...)` para el chat en tiempo real sin polling. |
| **Supabase Storage** | Almacenamiento de imágenes de eventos y avatares de perfil. |

### Prisma como capa de modelado y acceso a datos

| Componente | Qué hace en eMeet |
|---|---|
| **schema.prisma** | Fuente de verdad del esquema relacional. Define modelos (`Profile`, `UserEvent`, `ChatRoom`, etc.), relaciones, índices y mapeos de columnas. |
| **Migraciones** | Prisma Migrate genera y versiona los scripts SQL de cambio de esquema en `packages/db/prisma/migrations/`. |
| **PrismaClient** | ORM tipado para consultas complejas donde se necesita type-safety o joins con múltiples tablas. |

### Por qué usar ambos

```
┌─────────────────────────────────────────────────────────┐
│  Supabase Auth   → autenticación delegada, tokens JWT   │
│  Supabase Realtime → WebSockets sin infraestructura     │
│  Supabase Storage → S3-compatible sin configuración     │
│                                                         │
│  Prisma → esquema versionado, migraciones controladas   │
│           consultas con tipos, joins complejos          │
└─────────────────────────────────────────────────────────┘
```

**Supabase JS** se usa principalmente en los microservicios backend para:
- Validar tokens de usuario (`createAnonClient(authToken)`)
- Operaciones que requieren Service Role para bypassear RLS (`createServiceRoleClient()`)
- Consultas directas cuando Prisma no está disponible en el contexto del microservicio

**PrismaClient** se usa cuando:
- Se necesita un esquema fuertemente tipado con autocompletado
- Se ejecutan joins o queries complejas sobre múltiples tablas
- Se gestionan migraciones de esquema (`prisma migrate`)

Esta estrategia es una decisión de diseño válida y común en proyectos que usan Supabase: Supabase provee la infraestructura y Prisma provee la capa de modelado y type-safety.

---

## Microservicios y puertos

| Servicio | Puerto | URL local |
|---|---|---|
| app-web (frontend) | 3000 | http://localhost:3000 |
| app-auth | 3001 | http://localhost:3001 |
| app-profile | 3002 | http://localhost:3002 |
| app-events | 3003 | http://localhost:3003 |
| app-saved | 3004 | http://localhost:3004 |
| app-chat | 3005 | http://localhost:3005 |
| app-places | 3006 | http://localhost:3006 |
| app-admin | 3007 | http://localhost:3007 |
| Redis | 6379 | redis://localhost:6379 |

---

## Seguridad

### Variables de entorno

- Todos los archivos `.env` y `.env.*` están excluidos por `.gitignore`.
- Solo los archivos `.env.example` (sin valores reales) son versionados.
- `SUPABASE_SERVICE_ROLE_KEY` solo existe en procesos backend; nunca en el frontend con `NEXT_PUBLIC_`.
- `TICKETMASTER_API_KEY` y `GOOGLE_MAPS_API_KEY` (backend) son server-side; el cliente nunca los recibe.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` debe estar **restringido por dominio** en Google Cloud Console para evitar uso no autorizado.

### Autenticación

- Los microservicios validan el token JWT del usuario en cada request antes de procesar la lógica de negocio.
- `createAnonClient(authToken)` propaga el token del usuario al cliente Supabase para respetar Row Level Security.
- `createServiceRoleClient()` solo se usa en operaciones que explícitamente requieren permisos elevados (ej: creación de perfil tras registro).

### Recomendaciones pendientes

| Prioridad | Recomendación |
|---|---|
| Alta | Rotar las claves de Supabase si alguna vez fueron expuestas en git accidentalmente. |
| Alta | Restringir `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` por dominio en GCP (Maps API > Credentials > HTTP referrers). |
| Media | Agregar rate limiting en los endpoints de microservicios (ej: `express-rate-limit`). |
| Media | Agregar helmet.js en todos los microservicios Express para headers HTTP de seguridad. |
| Baja | Configurar RLS (Row Level Security) en todas las tablas de Supabase si aún no está activo. |

> **Advertencia:** Nunca subas archivos `.env` con credenciales reales al repositorio.  
> Si cometiste credenciales por error, rótalas inmediatamente en Supabase Dashboard y Google Cloud Console.
