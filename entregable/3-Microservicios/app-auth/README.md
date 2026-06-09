# eMeet — app-auth (Microservicio de Autenticación)

Microservicio Express responsable de login, registro, gestión de sesión y OAuth. Puerto: **3001**.

## Stack

- Node.js + Express 4.21 + TypeScript 5.6
- Supabase Auth (JWT, OAuth, email verification)
- Jest 30 + Supertest 7 (pruebas)

## Instalación

```bash
cd apps/app-auth
npm install
```

## Variables de entorno

Crear `apps/app-auth/.env`:

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
FRONTEND_ORIGIN=http://localhost:3000
PORT=3001

# Solo para tests (opcional)
TEST_USER_EMAIL=usuario@test.com
TEST_USER_PASSWORD=contraseña123
```

## Ejecución

```bash
npm run dev    # Desarrollo con hot-reload (tsx watch)
npm run build  # Compilar TypeScript
npm start      # Producción
```

## Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/login` | Público | Login con email/password |
| POST | `/auth/register` | Público | Registro de nuevo usuario |
| GET | `/auth/session` | Bearer token | Verificar/refrescar sesión |
| POST | `/auth/logout` | Bearer token | Cerrar sesión |
| GET | `/auth/callback` | Público | Redirect OAuth / email verify |
| GET | `/health` | Público | Health check |

## Pruebas

```bash
npm test                    # Ejecutar todos los tests
npx jest --coverage         # Con reporte de cobertura
npx jest --watch            # Modo watch
```

Los tests de rutas autenticadas requieren `TEST_USER_EMAIL` y `TEST_USER_PASSWORD` en `.env`.

## Estructura

```
src/
├── app.ts              # Express app
├── server.ts           # Entry point
├── config/env.ts       # Validación de variables de entorno
├── routes/
│   └── auth.routes.ts  # Definición de endpoints
└── __tests__/
    └── auth.routes.test.ts
```
