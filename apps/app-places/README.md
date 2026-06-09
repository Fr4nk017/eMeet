# app-places

Microservicio de búsqueda de lugares de eMeet. Actúa como proxy server-side hacia Google Places API para evitar exponer la API key en el frontend y habilitar caché.

- **Puerto**: `3006`
- **Prefijo de rutas**: `/places`
- **Autenticación**: ninguna (servicio público de descubrimiento)
- **Documentación Swagger**: `http://localhost:3006/docs`

---

## Endpoints

| Método | Ruta                   | Auth | Descripción                                         |
|--------|------------------------|------|-----------------------------------------------------|
| POST   | /places/search-nearby  | No   | Busca lugares cercanos por coordenadas y tipo       |
| GET    | /places/:placeId/details | No | Obtiene detalles de un lugar (horarios, fotos, web) |
| GET    | /places/photo          | No   | Proxy de imágenes de Google Places                  |

---

## Variables de entorno

```env
PORT=3006
FRONTEND_ORIGIN=http://localhost:3000

GOOGLE_MAPS_API_KEY=<tu-api-key-de-google-maps>

SUPABASE_URL=https://<proyecto>.supabase.co
SUPABASE_ANON_KEY=<clave-anon>
SUPABASE_SERVICE_ROLE_KEY=<clave-service-role>
```

> La `GOOGLE_MAPS_API_KEY` debe tener habilitadas las APIs: **Places API (New)** y **Maps JavaScript API**.

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
http://localhost:3006/docs
```

| URL | Descripción |
|-----|-------------|
| `http://localhost:3006/docs` | Swagger UI interactivo |
| `http://localhost:3006/docs/spec` | Spec OpenAPI en JSON |

Este servicio no requiere autenticación — los endpoints se pueden ejecutar directamente desde el Swagger UI.

Para verificar que el servidor responde antes de abrir el browser:

```bash
curl http://localhost:3006/health
# → {"ok":true,"service":"emeet-app-places",...}
```

---

## Pruebas

Este servicio actúa como proxy directo a Google Places API sin lógica propia de negocio, por lo que las pruebas se realizan a nivel de integración usando la Swagger UI.

Para probar manualmente con el servicio corriendo:

```bash
curl -X POST http://localhost:3006/places/search-nearby \
  -H "Content-Type: application/json" \
  -d '{
    "location": { "lat": -33.4372, "lng": -70.6506 },
    "radius": 1000,
    "type": "restaurant"
  }'
```

Respuesta:
```json
{
  "places": [
    {
      "place_id": "ChIJ...",
      "name": "Restaurante Ejemplo",
      "vicinity": "Providencia, Santiago",
      "rating": 4.5
    }
  ]
}
```
