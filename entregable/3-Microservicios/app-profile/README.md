# eMeet — app-profile (Microservicio de Perfil)

Microservicio Express para gestión del perfil de usuario, incluyendo bio, intereses y avatar. Puerto: **3002**.

## Stack

- Node.js + Express 4.21 + TypeScript 5.6
- Prisma 5 + Supabase Storage (avatares)
- Jest 30 + Supertest 7

## Instalación

```bash
cd apps/app-profile
npm install
```

## Variables de entorno

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://...
FRONTEND_ORIGIN=http://localhost:3000
PORT=3002

# Para tests
TEST_USER_EMAIL=usuario@test.com
TEST_USER_PASSWORD=contraseña123
```

## Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/profile` | Bearer | Obtener perfil propio |
| PATCH | `/profile` | Bearer | Actualizar bio, location, interests |
| POST | `/profile/avatar` | Bearer | Subir avatar (base64 → Supabase Storage) |
| GET | `/profile/stats` | Bearer | Estadísticas del perfil |
| GET | `/health` | Público | Health check |

## Upload de avatar

El endpoint `POST /profile/avatar` acepta imagen en base64, la sube a Supabase Storage en el bucket `avatars` y actualiza el campo `avatar_url` en la tabla `profiles`.

```json
// Request body
{ "imageBase64": "data:image/jpeg;base64,/9j/4AAQ..." }

// Response
{ "avatarUrl": "https://xxx.supabase.co/storage/v1/object/public/avatars/uuid.jpg" }
```

## Pruebas

```bash
npm test
npx jest --coverage
```
