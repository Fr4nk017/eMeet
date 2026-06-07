# app-admin

Microservicio de administración de eMeet. Expone endpoints protegidos para gestionar usuarios, eventos y ver estadísticas globales. Solo accesible para usuarios con rol `admin`.

- **Puerto**: `3007`
- **Prefijo de rutas**: `/admin`
- **Documentación Swagger**: `http://localhost:3007/docs`

---

## Endpoints

| Método | Ruta                  | Auth  | Descripción                                  |
|--------|-----------------------|-------|----------------------------------------------|
| GET    | /admin/users          | Admin | Lista todos los usuarios con email y rol     |
| GET    | /admin/users/:id      | Admin | Detalle de un usuario específico             |
| PUT    | /admin/users/:id      | Admin | Actualiza rol o estado de ban de un usuario  |
| DELETE | /admin/users/:id      | Admin | Elimina un usuario y su cuenta de auth       |
| GET    | /admin/events         | Admin | Lista todos los eventos de locatarios        |
| DELETE | /admin/events/:id     | Admin | Elimina un evento                            |
| GET    | /admin/statistics     | Admin | Estadísticas globales (usuarios, eventos, likes) |

> Todos los endpoints requieren token JWT de un usuario con `role: 'admin'` en su metadata o en la tabla `profiles`.

---

## Variables de entorno

```env
PORT=3007
FRONTEND_ORIGIN=http://localhost:3000

SUPABASE_URL=https://<proyecto>.supabase.co
SUPABASE_ANON_KEY=<clave-anon>
SUPABASE_SERVICE_ROLE_KEY=<clave-service-role>
```

---

## Instalación

```bash
npm install
```

---

## Ejecución

```bash
npm run dev    # desarrollo
npm run build && npm start   # producción
```

---

## Pruebas

```bash
npm test                  # 13 tests con mocks
npm run test:coverage     # + reporte HTML en coverage/
```

La suite cubre: rechazo sin token, rechazo de usuarios sin rol admin, listado de usuarios y eventos, actualización de rol, baneo de usuarios y eliminación de eventos.

### Ejemplo de petición (estadísticas)

```bash
curl http://localhost:3007/admin/statistics \
  -H "Authorization: Bearer <token-admin>"
```

Respuesta:
```json
{
  "statistics": {
    "totalUsers": 142,
    "totalEvents": 38,
    "totalLikes": 891,
    "bannedUsers": 2,
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```
