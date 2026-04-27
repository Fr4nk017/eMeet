# Eventbrite API Setup

## Cómo obtener el token

1. Ve a [eventbrite.com/platform](https://www.eventbrite.com/platform)
2. Crea una cuenta o inicia sesión
3. **Create a new app** → ponle cualquier nombre (ej: "eMeet local")
4. En el dashboard de tu app, copia el **Private Token**

## Configurar en el proyecto

Agrega esta variable a `apps/app-web/.env.local`:

```env
EVENTBRITE_PRIVATE_TOKEN=tu_token_aqui
```

> Es `EVENTBRITE_PRIVATE_TOKEN` sin `NEXT_PUBLIC_` — el token nunca sale al browser,
> solo lo usa el API route `/api/eventbrite/events` en el servidor.

## Cómo funciona

```
Browser → GET /api/eventbrite/events?lat=-33.45&lng=-70.66&radius=5
              ↓ (server-side, token seguro)
          Eventbrite API → eventos normalizados → Event[]
              ↓
          Se mezclan con los de Google Places en el feed de SwipeCards
```

Los eventos de Eventbrite tienen `id` con prefijo `eb-` para distinguirlos.

## Categorías que mapea

| Eventbrite          | eMeet        |
|---------------------|--------------|
| Music               | musica       |
| Food & Drink        | gastronomia  |
| Arts                | arte         |
| Performing Arts     | teatro       |
| Sports & Fitness    | deporte      |
| Business            | networking   |
| Nightlife           | fiesta       |
| Resto               | cultura      |

## Sin token

Si no se configura `EVENTBRITE_PRIVATE_TOKEN`, el endpoint devuelve `{ events: [], configured: false }`
y la app funciona igual, solo con datos de Google Places.
