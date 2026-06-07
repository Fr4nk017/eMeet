# app-chat

Microservicio de chat grupal de eMeet. Cada evento tiene una sala de chat a la que se une automáticamente al dar like. Gestiona salas, mensajes, miembros y conteo de no leídos.

- **Puerto**: `3005`
- **Prefijo de rutas**: `/chat`
- **Documentación Swagger**: `http://localhost:3005/docs`

---

## Endpoints

| Método | Ruta                          | Auth  | Descripción                                   |
|--------|-------------------------------|-------|-----------------------------------------------|
| GET    | /chat/rooms                   | Sí    | Lista las salas del usuario autenticado       |
| POST   | /chat/rooms/:id/join          | Sí    | Une al usuario a una sala                     |
| DELETE | /chat/rooms/:id/leave         | Sí    | Sale de una sala                              |
| GET    | /chat/rooms/:id/members       | Sí    | Lista los miembros de una sala                |
| GET    | /chat/rooms/:id/messages      | Sí    | Obtiene mensajes de una sala (paginado)       |
| POST   | /chat/rooms/:id/messages      | Sí    | Envía un mensaje a una sala activa            |
| POST   | /chat/rooms/:id/read          | Sí    | Marca mensajes como leídos                    |
| GET    | /chat/rooms/:id/unread        | Sí    | Conteo de mensajes no leídos en una sala      |
| GET    | /chat/unread                  | Sí    | Conteo total de no leídos del usuario         |
| POST   | /chat/cleanup                 | Cron  | Expira salas vencidas (protegido por secret)  |

---

## Variables de entorno

```env
PORT=3005
FRONTEND_ORIGIN=http://localhost:3000
CLEANUP_SECRET=<secreto-para-el-job-de-limpieza>

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
npm test                  # 47 tests con mocks
npm run test:coverage     # + reporte HTML en coverage/
```

La suite de chat es la más completa del proyecto: cubre autenticación, membresía, mensajería, orden de mensajes, salas expiradas, y casos de error.

### Ejemplo de petición (enviar mensaje)

```bash
curl -X POST http://localhost:3005/chat/rooms/<room-id>/messages \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"text": "¡Nos vemos en el evento!"}'
```

Respuesta:
```json
{
  "id": "uuid",
  "room_id": "uuid-sala",
  "user_id": "uuid-usuario",
  "text": "¡Nos vemos en el evento!",
  "created_at": "2024-01-01T20:00:00Z"
}
```
