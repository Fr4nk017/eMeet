# app-events

Microservicio de gestión de eventos de eMeet. Expone eventos públicos para el mapa y permite a locatarios crear y administrar sus propios eventos.

- **Puerto**: `3003`
- **Prefijo de rutas**: `/events`
- **Documentación Swagger**: `http://localhost:3003/docs`

---

## Endpoints

| Método | Ruta                    | Auth      | Descripción                                  |
|--------|-------------------------|-----------|----------------------------------------------|
| GET    | /events/public          | No        | Lista eventos futuros (para el mapa público) |
| GET    | /events/locatario       | Sí        | Eventos del locatario autenticado            |
| POST   | /events/locatario       | Sí        | Crea un nuevo evento                         |
| PATCH  | /events/locatario/:id   | Sí        | Actualiza un evento propio                   |
| DELETE | /events/locatario/:id   | Sí        | Elimina un evento propio                     |
| POST   | /events/upload-url      | Sí        | Genera URL firmada para subir media a S3     |
| POST   | /events/upload          | Sí        | Sube un archivo multimedia al evento         |
| GET    | /events/cleanup         | Cron      | Elimina eventos pasados (protegido por secret)|

---

## Variables de entorno

```env
PORT=3003
FRONTEND_ORIGIN=http://localhost:3000
CRON_SECRET=<secreto-para-el-job-de-limpieza>

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

## Probar con Swagger

Con el servidor corriendo (`npm run dev`), abre el browser en:

```
http://localhost:3003/docs
```

| URL | Descripción |
|-----|-------------|
| `http://localhost:3003/docs` | Swagger UI interactivo |
| `http://localhost:3003/docs/spec` | Spec OpenAPI en JSON |

**Endpoints con autenticación:** haz clic en **Authorize** e ingresa `Bearer <token>` (token obtenido desde `POST /auth/login` en app-auth).

Para verificar que el servidor responde antes de abrir el browser:

```bash
curl http://localhost:3003/health
# → {"ok":true,"service":"emeet-app-events",...}
```

---

## Pruebas

```bash
npm test                  # 11 tests con mocks
npm run test:coverage     # + reporte HTML en coverage/
```

### Ejemplo de petición (crear evento)

```bash
curl -X POST http://localhost:3003/events/locatario \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Noche de Jazz",
    "description": "Evento de música en vivo",
    "category": "musica",
    "event_date": "2099-03-15T20:00:00Z",
    "address": "Teatinos 120, Santiago",
    "organizer_name": "Jazz Club"
  }'
```

Respuesta:
```json
{
  "id": "uuid",
  "title": "Noche de Jazz",
  "category": "musica",
  "event_date": "2099-03-15T20:00:00Z"
}
```
