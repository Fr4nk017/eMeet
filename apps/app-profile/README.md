# app-profile

Microservicio de perfil de usuario de eMeet. Permite consultar y actualizar el perfil, subir avatar y obtener estadísticas.

- **Puerto**: `3002`
- **Prefijo de rutas**: `/profile`
- **Documentación Swagger**: `http://localhost:3002/docs`

---

## Endpoints

| Método | Ruta             | Auth | Descripción                              |
|--------|------------------|------|------------------------------------------|
| GET    | /profile         | Sí   | Devuelve el perfil del usuario autenticado |
| PATCH  | /profile         | Sí   | Actualiza nombre, bio, ubicación e intereses |
| POST   | /profile/avatar  | Sí   | Sube una foto de perfil (base64)         |
| GET    | /profile/stats   | Sí   | Devuelve estadísticas del perfil (followers) |

---

## Variables de entorno

```env
PORT=3002
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
npm test                  # tests con mocks
npm run test:coverage     # + reporte HTML en coverage/
```

### Ejemplo de petición (actualizar bio)

```bash
curl -X PATCH http://localhost:3002/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"bio": "Amante de la música y los eventos."}'
```

Respuesta:
```json
{
  "id": "uuid",
  "name": "Francisco",
  "bio": "Amante de la música y los eventos.",
  "location": "Santiago"
}
```
