# eMeet — app-admin (Microservicio de Administración)

Microservicio Express para el panel de administración: gestión de usuarios, moderación de eventos y estadísticas del sistema. Puerto: **3007**.

## Stack

- Node.js + Express 4.21 + TypeScript 5.6
- Prisma 5 + Supabase (PostgreSQL + Auth)
- Jest 30 + Supertest 7

## Instalación

```bash
cd apps/app-admin
npm install
```

## Variables de entorno

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://...
FRONTEND_ORIGIN=http://localhost:3000
PORT=3007

# Para tests
TEST_ADMIN_EMAIL=admin@test.com
TEST_ADMIN_PASSWORD=contraseña-admin
```

## Endpoints

Todos los endpoints requieren token de usuario con `role = "admin"`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/admin/users` | Listar todos los usuarios |
| GET | `/admin/users/:id` | Detalle de usuario |
| PUT | `/admin/users/:id` | Cambiar rol / banear |
| DELETE | `/admin/users/:id` | Eliminar usuario |
| GET | `/admin/events` | Listar todos los eventos |
| DELETE | `/admin/events/:id` | Eliminar evento (moderación) |
| GET | `/admin/statistics` | Dashboard de estadísticas |
| GET | `/health` | Health check |

### GET /admin/statistics — Respuesta

```json
{
  "totalUsers": 142,
  "totalEvents": 38,
  "totalLikes": 521,
  "bannedUsers": 3
}
```

## Seguridad

- Todos los endpoints verifican el token JWT con Supabase.
- El middleware comprueba que el perfil del usuario tenga `role = "admin"` en la tabla `profiles`.
- Se usa el cliente admin de Supabase (`SERVICE_ROLE_KEY`) para operaciones que bypasan RLS.

## Pruebas

```bash
npm test
# Requiere TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD en .env
```
