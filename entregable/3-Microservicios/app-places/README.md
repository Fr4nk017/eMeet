# eMeet — app-places (Microservicio de Lugares)

Microservicio Express que actúa como proxy hacia Google Places API para buscar locales y venues cercanos. Puerto: **3006**.

## Stack

- Node.js + Express 4.21 + TypeScript 5.6
- Google Maps Places API
- Jest 30 + Supertest 7

## Instalación

```bash
cd apps/app-places
npm install
```

## Variables de entorno

```env
GOOGLE_MAPS_API_KEY=AIzaSy...
FRONTEND_ORIGIN=http://localhost:3000
PORT=3006
```

> No requiere Supabase ni base de datos.

## Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/places/search-nearby` | Público | Buscar venues cercanos |
| GET | `/places/:placeId/details` | Público | Detalles de un local |
| GET | `/places/photo` | Público | Proxy de foto de Google |
| GET | `/health` | Público | Health check |

### POST /places/search-nearby

```json
// Request
{
  "location": { "lat": -33.4364, "lng": -70.6358 },
  "radius": 1000,
  "type": "restaurant"
}

// Response
{
  "places": [
    {
      "placeId": "ChIJ...",
      "name": "Restaurante El Huerto",
      "address": "Orrego Luco 054",
      "rating": 4.5,
      "lat": -33.432,
      "lng": -70.624
    }
  ]
}
```

## Pruebas

Este servicio tiene la mayor cobertura de tests ya que **no requiere credenciales de usuario**:

```bash
npm test
npx jest --coverage --coverageReporters=html
# Ver: coverage/lcov-report/index.html
```

Cobertura real medida: **60% líneas**, **58.4% statements**, **66.7% funciones**.
