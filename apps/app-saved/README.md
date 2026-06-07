# app-saved

Microservicio de eventos guardados y likes de eMeet. Registra las interacciones del usuario con eventos (like/save), genera el chat grupal al dar like y produce recomendaciones personalizadas.

- **Puerto**: `3004`
- **Prefijo de rutas**: `/events`
- **Documentación Swagger**: `http://localhost:3004/docs`

---

## Endpoints

| Método | Ruta                     | Auth | Descripción                                       |
|--------|--------------------------|------|---------------------------------------------------|
| POST   | /events/like             | Sí   | Registra un like y crea/une al chat del evento    |
| DELETE | /events/like/:id         | Sí   | Elimina un like                                   |
| GET    | /events/liked            | Sí   | Lista de eventos con like del usuario             |
| POST   | /events/save             | Sí   | Guarda un evento en favoritos                     |
| DELETE | /events/save/:id         | Sí   | Elimina un guardado                               |
| GET    | /events/saved            | Sí   | Lista de eventos guardados del usuario            |
| POST   | /events/recommendations  | Sí   | Genera recomendaciones basadas en likes previos   |

---

## Variables de entorno

```env
PORT=3004
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
npm test                  # 12 tests con mocks
npm run test:coverage     # + reporte HTML en coverage/
```

### Ejemplo de petición (dar like)

```bash
curl -X POST http://localhost:3004/events/like \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "uuid-del-evento",
    "eventTitle": "Noche de Jazz",
    "eventType": "musica",
    "eventLat": -33.4372,
    "eventLng": -70.6506,
    "eventDistance": 800
  }'
```

Respuesta:
```json
{ "ok": true, "chatLinked": true }
```
