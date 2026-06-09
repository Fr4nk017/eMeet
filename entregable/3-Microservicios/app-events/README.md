# eMeet — app-events (Microservicio de Eventos)

Microservicio Express para la gestión de eventos creados por locatarios. Puerto: **3003**.

## Stack

- Node.js + Express 4.21 + TypeScript 5.6
- Prisma 5 + PostgreSQL (Supabase)
- Jest 30 + Supertest 7 (pruebas)

## Instalación

```bash
cd apps/app-events
npm install
```

## Variables de entorno

Crear `apps/app-events/.env`:

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres.xxx:contraseña@aws-0-us-east-1.pooler.supabase.com:6543/postgres
FRONTEND_ORIGIN=http://localhost:3000
CRON_SECRET=mi-cron-secret
PORT=3003

# Solo para tests
TEST_USER_EMAIL=locatario@test.com
TEST_USER_PASSWORD=contraseña123
```

## Ejecución

```bash
npm run dev    # Desarrollo
npm run build  # Compilar
npm start      # Producción
```

## Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/events/public` | Público | Lista eventos futuros |
| GET | `/events/cleanup` | CRON_SECRET | Elimina eventos expirados |
| POST | `/events/locatario` | Bearer | Crear evento |
| GET | `/events/locatario` | Bearer | Mis eventos |
| PATCH | `/events/locatario/:id` | Bearer | Editar evento |
| DELETE | `/events/locatario/:id` | Bearer | Eliminar evento |
| GET | `/health` | Público | Health check |

## Limpieza automática

El endpoint `/events/cleanup` es invocado por Vercel Cron Jobs diariamente. Elimina todos los `locatario_events` con `event_date < NOW()`. Requiere header `Authorization: Bearer <CRON_SECRET>`.

## Pruebas

```bash
npm test
npx jest --coverage --coverageReporters=html
# Ver reporte en: coverage/lcov-report/index.html
```

## Estructura

```
src/
├── app.ts
├── server.ts
├── config/env.ts
├── routes/
│   └── events.routes.ts
└── __tests__/
    └── events.routes.test.ts
```
