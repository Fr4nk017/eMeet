# eMeet — app-saved (Microservicio de Guardados y Likes)

Microservicio Express para gestionar likes, guardados y recomendaciones personalizadas basadas en Redis. Puerto: **3004**.

## Stack

- Node.js + Express 4.21 + TypeScript 5.6
- Prisma 5 + PostgreSQL (Supabase)
- Redis (motor de recomendaciones por similitud coseno)
- Jest 30 + Supertest 7

## Instalación

```bash
cd apps/app-saved
npm install
```

## Variables de entorno

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
FRONTEND_ORIGIN=http://localhost:3000
PORT=3004

# Para tests
TEST_USER_EMAIL=usuario@test.com
TEST_USER_PASSWORD=contraseña123
```

## Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/saved/like` | Bearer | Dar like a un evento |
| POST | `/saved/save` | Bearer | Guardar evento para después |
| DELETE | `/saved/like/:id` | Bearer | Quitar like |
| DELETE | `/saved/save/:id` | Bearer | Quitar guardado |
| GET | `/saved/liked` | Bearer | Listar eventos con like |
| GET | `/saved/saved` | Bearer | Listar eventos guardados |
| POST | `/saved/recommendations` | Bearer | Recomendaciones personalizadas |
| GET | `/health` | Público | Health check |

## Motor de recomendaciones

Al dar like a un evento, el servicio actualiza un vector de preferencias del usuario en Redis (pesos por categoría: gastronomia, musica, etc.). El endpoint `/saved/recommendations` calcula similitud coseno entre usuarios para sugerir eventos que otros usuarios con gustos similares han marcado.

## Pruebas

```bash
npm test
npx jest --coverage
```
