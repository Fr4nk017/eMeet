# app-auth

Microservicio de autenticación de eMeet. Gestiona registro, inicio de sesión y sesión de usuarios mediante Supabase Auth.

- **Puerto**: `3001`
- **Prefijo de rutas**: `/auth`
- **Documentación Swagger**: `http://localhost:3001/docs`

---

## Endpoints

| Método | Ruta             | Auth | Descripción                          |
|--------|------------------|------|--------------------------------------|
| POST   | /auth/login      | No   | Inicia sesión con email y contraseña |
| POST   | /auth/register   | No   | Registra un nuevo usuario            |
| POST   | /auth/logout     | Sí   | Cierra la sesión actual              |
| GET    | /auth/session    | Sí   | Devuelve los datos del usuario activo|
| GET    | /auth/callback   | No   | Callback OAuth (magic link, etc.)    |

---

## Variables de entorno

Crea un archivo `.env` en la raíz de este directorio:

```env
PORT=3001
FRONTEND_ORIGIN=http://localhost:3000

SUPABASE_URL=https://<proyecto>.supabase.co
SUPABASE_ANON_KEY=<clave-anon>
SUPABASE_SERVICE_ROLE_KEY=<clave-service-role>
```

---

## Instalación

```bash
# Desde la raíz del monorepo
npm install

# O solo las dependencias de este servicio
cd apps/app-auth
npm install
```

---

## Ejecución

```bash
# Modo desarrollo (con recarga automática)
npm run dev

# Compilar y ejecutar en producción
npm run build
npm start
```

## Probar con Swagger

Con el servidor corriendo (`npm run dev`), abre el browser en:

```
http://localhost:3001/docs
```

| URL | Descripción |
|-----|-------------|
| `http://localhost:3001/docs` | Swagger UI interactivo |
| `http://localhost:3001/docs/spec` | Spec OpenAPI en JSON |

**Endpoints con autenticación:** haz clic en **Authorize** e ingresa `Bearer <token>` (token obtenido del `POST /auth/login`).

Para verificar que el servidor responde antes de abrir el browser:

```bash
curl http://localhost:3001/health
# → {"ok":true,"service":"emeet-app-auth",...}
```

---

## Pruebas

```bash
# Ejecutar tests (sin base de datos real — todo mockeado)
npm test

# Ejecutar tests con reporte de cobertura HTML
npm run test:coverage
```

El reporte de cobertura se genera en `coverage/lcov-report/index.html`.

### Ejemplo de petición (login)

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "usuario@ejemplo.cl", "password": "mi-contraseña"}'
```

Respuesta exitosa:
```json
{
  "user": { "id": "uuid", "email": "usuario@ejemplo.cl" },
  "session": { "access_token": "eyJ...", "expires_at": 1700000000 }
}
```
