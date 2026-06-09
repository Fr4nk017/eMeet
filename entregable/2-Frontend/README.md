# eMeet — Frontend (app-web)

Aplicación web frontend de eMeet. Interfaz tipo swipe para descubrir y unirse a eventos locales.

## Stack

| Tecnología | Versión | Uso |
|---|---|---|
| Next.js | 14.2 | Framework React con SSR |
| React | 18.3 | UI library |
| TypeScript | 5.6 | Tipado estático |
| Tailwind CSS | 3.4 | Estilos utility-first |
| Framer Motion | 11.11 | Animaciones de swipe |
| TanStack Query | 5.100 | Data fetching y caché |
| React Hook Form | 7.54 | Formularios |
| @react-google-maps/api | 2.20 | Integración de mapas |

## Instalación

```bash
# Desde la raíz del monorepo
npm install

# Solo el frontend
cd apps/app-web
npm install
```

## Variables de entorno

Crear `apps/app-web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_AUTH_URL=http://localhost:3001
NEXT_PUBLIC_PROFILE_URL=http://localhost:3002
NEXT_PUBLIC_EVENTS_URL=http://localhost:3003
NEXT_PUBLIC_SAVED_URL=http://localhost:3004
NEXT_PUBLIC_CHAT_URL=http://localhost:3005
NEXT_PUBLIC_PLACES_URL=http://localhost:3006
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

## Ejecución

```bash
# Desarrollo (desde raíz — levanta todos los servicios)
npm run dev

# Solo el frontend
cd apps/app-web
npm run dev      # http://localhost:3000

# Build de producción
npm run build
npm start
```

## Estructura de carpetas

```
apps/app-web/
├── src/
│   ├── app/              # App Router de Next.js
│   │   ├── (auth)/       # Rutas públicas: login, register
│   │   ├── (app)/        # Rutas protegidas: feed, profile, saved, chat
│   │   └── layout.tsx    # Layout global
│   ├── components/       # Componentes reutilizables
│   │   ├── SwipeCard.tsx       # Tarjeta swipeable de evento
│   │   ├── EventCard.tsx       # Vista de detalle de evento
│   │   ├── ChatRoom.tsx        # Sala de chat
│   │   └── ProfileForm.tsx     # Formulario de perfil
│   ├── hooks/            # Custom hooks (useAuth, useEvents, useChat)
│   ├── lib/              # Clientes de API y Supabase
│   └── types/            # Tipos TypeScript
├── public/               # Assets estáticos
├── package.json
├── tailwind.config.ts
└── next.config.js
```

## Pantallas principales

| Pantalla | Ruta | Descripción |
|---|---|---|
| Login | `/login` | Acceso con email/contraseña |
| Registro | `/register` | Crear cuenta (user / locatario) |
| Feed | `/` | Swipe de eventos (izquierda = skip, derecha = like) |
| Guardados | `/saved` | Eventos con like y guardados |
| Crear Evento | `/events/new` | Formulario para locatarios |
| Chat | `/chat` | Salas de chat por evento |
| Perfil | `/profile` | Editar perfil e intereses |

## Pruebas

El frontend no tiene tests automatizados propios. Las pruebas se realizan manualmente sobre los flujos principales. Los microservicios tienen sus propias suites de tests con Jest.
