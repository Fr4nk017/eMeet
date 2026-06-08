# Informe de Pruebas Unitarias — eMeet

## Resumen Ejecutivo

El proyecto eMeet cuenta con **173 pruebas unitarias** distribuidas en 6 suites (una por microservicio). Todas las pruebas utilizan mocks en memoria — sin conexión a base de datos real — garantizando reproducibilidad y velocidad de ejecución.

**Herramienta:** Jest 29 + Supertest  
**Tipo:** Pruebas de integración de endpoints HTTP con mocks in-memory  
**Estrategia:** Cada microservicio tiene su propia suite independiente

---

## Cobertura de Código por Microservicio

### Tabla Consolidada

| Microservicio | Tests | % Statements | % Branch | % Functions | % Lines |
|---------------|------:|:------------:|:--------:|:-----------:|:-------:|
| app-auth | 24 | 96.42% | 85.71% | 100.00% | 97.56% |
| app-profile | 13 | 88.23% | 74.19% | 100.00% | 89.36% |
| app-events | 37 | 86.98% | 72.72% | 90.90% | 93.49% |
| app-saved | 30 | 93.83% | 84.82% | 86.36% | 94.28% |
| app-chat | 47 | 75.26% | 59.55% | 74.19% | 82.80% |
| app-admin | 22 | 67.00% | 51.66% | 83.33% | 71.59% |
| **TOTAL** | **173** | **84.6%** | **71.5%** | **89.1%** | **88.2%** |

> **app-places** no tiene suite de pruebas unitarias ya que actúa como proxy directo hacia Google Places API, sin lógica de negocio propia. Se verifica mediante pruebas de integración manual con Swagger UI.

---

## Cobertura Visual

```
app-auth    █████████████████████  96.4% statements ★ mayor cobertura
app-saved   █████████████████████  93.8% statements
app-events  ██████████████████░░░  87.0% statements
app-profile █████████████████░░░░  88.2% statements
app-chat    ████████████████░░░░░  75.3% statements
app-admin   ██████████████░░░░░░░  67.0% statements
```

---

## Detalle por Microservicio

### app-auth — 24 pruebas

**Archivo:** `apps/app-auth/src/__tests__/auth.routes.test.ts`

| # | Prueba | Resultado |
|---|--------|-----------|
| 1 | POST /auth/login › rechaza si faltan credenciales | ✅ PASS |
| 2 | POST /auth/login › rechaza si falta la contraseña | ✅ PASS |
| 3 | POST /auth/login › rechaza con credenciales inválidas | ✅ PASS |
| 4 | POST /auth/login › devuelve 429 cuando hay rate limit | ✅ PASS |
| 5 | POST /auth/login › devuelve user y session con credenciales válidas | ✅ PASS |
| 6 | POST /auth/register › rechaza si faltan campos obligatorios | ✅ PASS |
| 7 | POST /auth/register › rechaza contraseña menor a 6 caracteres | ✅ PASS |
| 8 | POST /auth/register › rechaza rol inválido | ✅ PASS |
| 9 | POST /auth/register › registra usuario básico correctamente | ✅ PASS |
| 10 | POST /auth/register › registra locatario con businessName | ✅ PASS |
| 11 | POST /auth/register › devuelve 400 si Supabase rechaza el registro | ✅ PASS |
| 12 | POST /auth/register › deshace el registro si falla el upsert del perfil | ✅ PASS |
| 13 | POST /auth/logout › cierra sesión y devuelve 204 | ✅ PASS |
| 14 | POST /auth/logout › funciona sin token | ✅ PASS |
| 15 | POST /auth/logout › devuelve 500 si Supabase falla | ✅ PASS |
| 16 | GET /auth/session › devuelve session null si no hay token | ✅ PASS |
| 17 | GET /auth/session › devuelve session null si el token es inválido | ✅ PASS |
| 18 | GET /auth/session › devuelve session con user si el token es válido | ✅ PASS |
| 19 | GET /auth/callback › redirige al frontend con tokens tras OAuth code | ✅ PASS |
| 20 | GET /auth/callback › redirige con error si el code OAuth es inválido | ✅ PASS |
| 21 | GET /auth/callback › verifica email con token_hash y redirige con tokens | ✅ PASS |
| 22 | GET /auth/callback › redirige con error si la verificación de email falla | ✅ PASS |
| 23 | GET /auth/callback › redirige con error si no hay params | ✅ PASS |
| 24 | GET /auth/callback › redirige a /locatario si el usuario tiene rol locatario | ✅ PASS |

**Cobertura detallada:**
```
File             | % Stmts | % Branch | % Funcs | % Lines
auth.routes.ts   |   96.42 |    85.71 |  100.00 |   97.56
```

---

### app-profile — 13 pruebas

**Archivo:** `apps/app-profile/src/__tests__/profile.routes.test.ts`

| # | Prueba | Resultado |
|---|--------|-----------|
| 1 | GET /profile › rechaza sin token | ✅ PASS |
| 2 | GET /profile › devuelve perfil del usuario | ✅ PASS |
| 3 | GET /profile › devuelve 404 si no existe perfil | ✅ PASS |
| 4 | PATCH /profile › rechaza sin token | ✅ PASS |
| 5 | PATCH /profile › rechaza body vacío | ✅ PASS |
| 6 | PATCH /profile › actualiza bio | ✅ PASS |
| 7 | PATCH /profile › actualiza múltiples campos | ✅ PASS |
| 8 | POST /profile/avatar › rechaza sin token | ✅ PASS |
| 9 | POST /profile/avatar › rechaza si no se envía fileBase64 | ✅ PASS |
| 10 | POST /profile/avatar › sube avatar y devuelve URL pública | ✅ PASS |
| 11 | POST /profile/avatar › sube avatar PNG | ✅ PASS |
| 12 | GET /profile/stats › rechaza sin token | ✅ PASS |
| 13 | GET /profile/stats › devuelve estadísticas | ✅ PASS |

**Cobertura detallada:**
```
File               | % Stmts | % Branch | % Funcs | % Lines
profile.routes.ts  |   88.23 |    74.19 |  100.00 |   89.36
```

---

### app-events — 37 pruebas

**Archivo:** `apps/app-events/src/__tests__/events.routes.test.ts`

| Grupo | Pruebas | Resultado |
|-------|--------:|-----------|
| GET /events/public | 2 | ✅ 2/2 PASS |
| GET /events/cleanup | 2 | ✅ 2/2 PASS |
| POST /events/locatario | 4 | ✅ 4/4 PASS |
| GET /events/locatario | 3 | ✅ 3/3 PASS |
| PATCH /events/locatario/:id | 5 | ✅ 5/5 PASS |
| DELETE /events/locatario/:id | 3 | ✅ 3/3 PASS |
| POST /events/upload-url | 14 | ✅ 14/14 PASS |
| POST /events/upload | 5 | ✅ 5/5 PASS |
| **Total** | **37** | **✅ 37/37 PASS** |

**Casos cubiertos (selección):**
- Listado de eventos futuros sin autenticación
- Cron job de limpieza con secret correcto e incorrecto
- Creación de evento con validación de campos obligatorios
- Actualización parcial de evento (título, categoría, fecha, dirección)
- Eliminación de evento propio
- Generación de URL firmada para 8 tipos MIME distintos (PNG, JPEG, WebP, GIF, MP4, WebM, QuickTime, AVIF)
- Upload directo de imagen y video
- Manejo de errores de BD y Storage (500)

**Cobertura detallada:**
```
File               | % Stmts | % Branch | % Funcs | % Lines
events.routes.ts   |   86.98 |    72.72 |   90.90 |   93.49
```

---

### app-saved — 30 pruebas

**Archivo:** `apps/app-saved/src/__tests__/saved.routes.test.ts`

| Grupo | Pruebas | Resultado |
|-------|--------:|-----------|
| POST /events/save | 6 | ✅ 6/6 PASS |
| GET /events/saved | 3 | ✅ 3/3 PASS |
| DELETE /events/save/:id | 3 | ✅ 3/3 PASS |
| POST /events/like | 8 | ✅ 8/8 PASS |
| GET /events/liked | 3 | ✅ 3/3 PASS |
| DELETE /events/like/:id | 4 | ✅ 4/4 PASS |
| POST /events/recommendations | 4 | ✅ 4/4 PASS |
| **Total** | **30** | **✅ 30/30 PASS** |

**Casos cubiertos (selección):**
- Registro de like y save con vinculación automática a sala de chat
- Reintentos con UUID estable (compatibilidad con event_id como UUID en BD)
- Payload legacy de perfil (compatibilidad con schema antiguo, código error 42703)
- Manejo de errores soft: like registrado aunque falle la creación del chat o room_members
- Recomendaciones basadas en eventos disponibles
- Errores de BD en todos los endpoints (500)
- Fallback de UUID en delete (22P02)

**Cobertura detallada:**
```
File               | % Stmts | % Branch | % Funcs | % Lines
saved.routes.ts    |   93.83 |    84.82 |   86.36 |   94.28
```

---

### app-chat — 47 pruebas ★

**Archivos:** 3 suites (rooms, messages, realtime)

| Grupo | Pruebas | Resultado |
|-------|--------:|-----------|
| Salas (rooms) | 14 | ✅ 14/14 PASS |
| Mensajes (messages) | 19 | ✅ 19/19 PASS |
| Tiempo real (realtime) | 14 | ✅ 14/14 PASS |
| **Total** | **47** | **✅ 47/47 PASS** |

**Casos cubiertos (selección):**
- Listar salas del usuario
- Unirse y salir de sala
- Rechazar mensajes en sala expirada
- Paginación de mensajes
- Marcar como leídos y conteo de no leídos
- Expiración de salas con cron job
- Rechazo de cron sin secret correcto
- Orden cronológico de mensajes

**Cobertura detallada:**
```
File               | % Stmts | % Branch | % Funcs | % Lines
chat.routes.ts     |   75.26 |    59.55 |   74.19 |   82.80
mock-db.ts         |   96.49 |    73.13 |  100.00 |   97.87
```

---

### app-admin — 22 pruebas

**Archivo:** `apps/app-admin/src/__tests__/admin.routes.test.ts`

| # | Prueba | Resultado |
|---|--------|-----------|
| 1 | GET /admin/users › rechaza sin token | ✅ PASS |
| 2 | GET /admin/users › rechaza usuario sin rol admin | ✅ PASS |
| 3 | GET /admin/users › lista usuarios (admin) | ✅ PASS |
| 4 | GET /admin/events › rechaza sin token | ✅ PASS |
| 5 | GET /admin/events › lista eventos (admin) | ✅ PASS |
| 6 | GET /admin/statistics › rechaza sin token | ✅ PASS |
| 7 | GET /admin/statistics › devuelve estadísticas globales | ✅ PASS |
| 8 | PUT /admin/users/:id › rechaza sin token | ✅ PASS |
| 9 | PUT /admin/users/:id › rechaza body inválido | ✅ PASS |
| 10 | PUT /admin/users/:id › actualiza rol de usuario | ✅ PASS |
| 11 | PUT /admin/users/:id › banea usuario | ✅ PASS |
| 12 | DELETE /admin/events/:id › rechaza sin token | ✅ PASS |
| 13 | DELETE /admin/events/:id › elimina evento | ✅ PASS |
| 14–22 | Casos adicionales de validación y error | ✅ PASS |

**Cobertura detallada:**
```
File               | % Stmts | % Branch | % Funcs | % Lines
admin.routes.ts    |   67.00 |    51.66 |   83.33 |   71.59
```

---

## Estrategia de Mocking

Todas las pruebas usan mocks en memoria para evitar dependencia de la base de datos:

```typescript
// Mock de withAuth middleware
jest.mock('../middleware/auth', () => ({
  withAuth: (req, res, next) => {
    const header = req.headers.authorization ?? ''
    const token = header.replace('Bearer ', '')
    if (token === VALID_TOKEN) {
      req.user = { id: USER_ID }
      return next()
    }
    return res.status(401).json({ error: 'Token inválido' })
  }
}))

// Mock del cliente Supabase con base de datos in-memory
jest.mock('../lib/supabase', () => ({
  createServiceRoleClient: () => mockServiceClient,
}))

// QueryBuilder encadenable que simula la API de Supabase
function buildQuery(table) {
  let filters = [], insertPayload = null, deleteMode = false

  const query = {
    select: () => query,
    insert: (data) => { insertPayload = data; return query },
    eq: (col, val) => { filters.push(r => r[col] === val); return query },
    then: (resolve) => {
      if (deleteMode) { /* elimina filas que cumplan filtros */ }
      if (insertPayload) { /* agrega fila al array en memoria */ }
      const result = rows.filter(r => filters.every(f => f(r)))
      return resolve({ data: result, error: null })
    }
  }
  return query
}
```

### Inyección de errores por test

Para probar rutas de error (500) sin modificar el estado global del mock:

```typescript
// Inyección de error específica por tabla y operación
let _injectError = null

function setError(e) { _injectError = e }

// En el buildQuery, antes de ejecutar la operación:
if (_injectError?.table === table && _injectError?.op === currentOp) {
  return resolve({ data: null, error: _injectError.error })
}

// En el test:
it('devuelve 500 si falla la BD', async () => {
  setError({ table: 'user_events', op: 'select', error: { message: 'Connection error' } })
  const res = await request(app).get('/events/liked').set('Authorization', `Bearer ${TOKEN}`)
  expect(res.status).toBe(500)
})
```

---

## Cómo Ejecutar las Pruebas

### Ejecutar todos los tests
```bash
npm test           # desde la raíz del monorepo
```

### Ejecutar con cobertura
```bash
npm run test:coverage                          # todos los servicios
npm run test:coverage --workspace=apps/app-chat  # un servicio específico
```

### Ver reporte HTML de cobertura
```bash
# Después de ejecutar test:coverage, abrir:
apps/app-chat/coverage/lcov-report/index.html
apps/app-admin/coverage/lcov-report/index.html
# (cada servicio genera su propio reporte en coverage/)
```

---

## Configuración de Jest

Cada microservicio tiene en su `package.json`:

```json
{
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "collectCoverageFrom": ["src/**/*.ts", "!src/**/*.d.ts"],
    "coverageReporters": ["text", "lcov", "html"]
  }
}
```

---

## Conclusiones

- **173 pruebas** ejecutadas en ~40 segundos total
- **0 fallos** — todas las suites pasan al 100%
- **4 de 6 microservicios** con cobertura de líneas >80% (verde en reporte HTML):
  - app-auth: **97.56%** líneas
  - app-events: **93.49%** líneas
  - app-saved: **94.28%** líneas
  - app-profile: **89.36%** líneas
- La cobertura de branches es menor en todos los servicios porque los casos de error de red/DB requieren inyección de errores al mock
- Los reportes HTML completos están disponibles en cada `apps/*/coverage/lcov-report/index.html`
