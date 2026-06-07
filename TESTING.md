# Guía de Pruebas Unitarias — eMeet

## Estructura de tests

Cada microservicio tiene sus pruebas en `src/__tests__/` usando **Jest + Supertest**.
Todos los tests usan **mocks en memoria** — no se conectan a ninguna base de datos real.

```
apps/
├── app-auth/src/__tests__/auth.routes.test.ts
├── app-profile/src/__tests__/profile.routes.test.ts
├── app-events/src/__tests__/events.routes.test.ts
├── app-saved/src/__tests__/saved.routes.test.ts
├── app-chat/src/__tests__/chat.routes.test.ts
├── app-places/          (sin rutas con lógica propia — proxy directo a Google)
└── app-admin/src/__tests__/admin.routes.test.ts
```

---

## Ejecutar todos los tests

Desde la raíz del monorepo:

```bash
npm test
```

Esto ejecuta `turbo run test` en paralelo sobre todos los workspaces.

---

## Ejecutar tests de un microservicio específico

```bash
cd apps/app-events
npm test
```

O directamente con Jest:

```bash
cd apps/app-events
npx jest --no-coverage
```

---

## Generar reporte de cobertura

Cada microservicio tiene el script `test:coverage`:

```bash
cd apps/app-events
npm run test:coverage
```

El reporte HTML se genera en:

```
apps/app-events/coverage/lcov-report/index.html
```

Abre ese archivo en el navegador para ver la cobertura línea por línea.

### Cobertura de todos los servicios a la vez

```bash
# Desde la raíz
npm run test -- --coverage
```

O service por service:

```bash
for app in app-auth app-profile app-events app-saved app-chat app-admin; do
  echo "=== $app ===" && cd apps/$app && npm run test:coverage && cd ../..
done
```

---

## Resumen de tests por servicio

| Servicio    | Archivo de test                  | Tests |
|-------------|----------------------------------|-------|
| app-auth    | auth.routes.test.ts              | ~10   |
| app-profile | profile.routes.test.ts           | 9     |
| app-events  | events.routes.test.ts            | 11    |
| app-saved   | saved.routes.test.ts             | 12    |
| app-chat    | chat.routes.test.ts              | 47    |
| app-admin   | admin.routes.test.ts             | 13    |

---

## Configuración de Jest

Cada microservicio usa `jest.config.js` con:

- **Preset**: `ts-jest` (TypeScript nativo)
- **Entorno**: `node`
- **Transformación**: TypeScript → CommonJS en tiempo de test
- **Mocks**: middleware `withAuth` y cliente Supabase mockeados por jest.mock()
- **Sin base de datos real**: todos los datos viven en arrays en memoria

### Variables de entorno para tests

Definidas directamente en el archivo de test (no requieren `.env`):

```ts
process.env.SUPABASE_URL              = 'https://mock.supabase.co'
process.env.SUPABASE_ANON_KEY         = 'mock-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key'
```

---

## Ver el reporte de cobertura en HTML

1. Ejecutar `npm run test:coverage` en el servicio deseado
2. Abrir `coverage/lcov-report/index.html` en el navegador
3. El reporte muestra:
   - Porcentaje de statements, branches, functions y lines cubiertos
   - Cada archivo del proyecto con líneas cubiertas (verde) y no cubiertas (rojo)

---

## Documentación Swagger (API REST)

Cada microservicio expone su especificación OpenAPI en `/docs` cuando está corriendo:

| Servicio    | URL                              |
|-------------|----------------------------------|
| app-auth    | http://localhost:3001/docs       |
| app-profile | http://localhost:3002/docs       |
| app-events  | http://localhost:3003/docs       |
| app-saved   | http://localhost:3004/docs       |
| app-chat    | http://localhost:3005/docs       |
| app-places  | http://localhost:3006/docs       |
| app-admin   | http://localhost:3007/docs       |

Para levantar todos los servicios:

```bash
npm run dev
```
