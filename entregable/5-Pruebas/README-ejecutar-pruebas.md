# eMeet — Guía para Ejecutar Pruebas Unitarias

## Requisitos previos

- Node.js 20+
- npm 11+
- (Opcional) Credenciales de Supabase de prueba para tests autenticados

## Instalación

```bash
# Desde la raíz del monorepo
npm install
```

## Ejecutar todos los tests

```bash
# Todos los servicios en paralelo (Turborepo)
npm test

# Con reporte de cobertura
npx turbo run test -- --coverage
```

## Ejecutar tests de un servicio específico

```bash
# Navegar al servicio
cd apps/app-places    # (o app-auth, app-events, etc.)

# Ejecutar tests
npm test

# Con cobertura
npx jest --coverage

# Con reporte HTML (abrir en navegador)
npx jest --coverage --coverageReporters=html
# → Ver: apps/<servicio>/coverage/lcov-report/index.html

# Modo watch (desarrollo)
npx jest --watch
```

## Configurar tests autenticados

Para ejecutar los tests que requieren autenticación real, crear `.env` en cada servicio:

```env
# apps/app-auth/.env (y demás servicios)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://...

# Credenciales de usuario de prueba en Supabase
TEST_USER_EMAIL=usuario-prueba@emeet.com
TEST_USER_PASSWORD=contraseña-segura

# Para app-admin
TEST_ADMIN_EMAIL=admin-prueba@emeet.com
TEST_ADMIN_PASSWORD=contraseña-admin

# Para app-events
CRON_SECRET=mi-cron-secret
GOOGLE_MAPS_API_KEY=AIzaSy...
```

> Los tests que requieren estas variables usan `it.skip` automáticamente si no están configuradas, por lo que el pipeline no falla en entornos CI sin credenciales.

## Estructura de tests por servicio

| Servicio | Archivo de tests | Tests totales | Sin credenciales |
|---|---|---|---|
| app-auth | `src/__tests__/auth.routes.test.ts` | 8 | 5 |
| app-events | `src/__tests__/events.routes.test.ts` | 11 | 0 |
| app-profile | `src/__tests__/profile.routes.test.ts` | 5 | 0 |
| app-chat | `src/__tests__/chat.routes.test.ts` | ~8 | 0 |
| app-saved | `src/__tests__/saved.routes.test.ts` | ~10 | 0 |
| app-places | `src/__tests__/places.routes.test.ts` | 6 | 6 |
| app-admin | `src/__tests__/admin.routes.test.ts` | 9 | 0 |

## Interpretar los resultados

- `PASS` — El test pasó correctamente
- `FAIL` — El test falló (revisar el mensaje de error)
- `SKIP` (●) — Test omitido por falta de variables de entorno de prueba

## Ver reporte de cobertura generado

Los reportes de cobertura se generan en `apps/<servicio>/coverage/`:

```
apps/app-places/coverage/
├── coverage-summary.json   # Resumen en JSON
├── lcov.info               # Formato LCOV (para CI/CD)
└── lcov-report/
    └── index.html          # Reporte visual interactivo
```

Los archivos `coverage-summary.json` de todos los servicios están en la carpeta `reportes-cobertura/` de este entregable.
