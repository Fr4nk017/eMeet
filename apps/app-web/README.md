# eMeet Frontend

> Plataforma de descubrimiento de eventos locales con mecánica de swipe tipo Tinder.

---

## Índice

- [Descripción del proyecto](#descripción-del-proyecto)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Arquitectura y decisiones técnicas](#arquitectura-y-decisiones-técnicas)
- [Pantallas](#pantallas)
- [Instalación y uso](#instalación-y-uso)
- [Variables de entorno](#variables-de-entorno)
- [Roadmap y próximos pasos](#roadmap-y-próximos-pasos)

---

## Descripción del proyecto

**eMeet** conecta a personas con eventos cercanos (gastronomía, música, cultura, networking, etc.) a través de una experiencia móvil-first con mecánica de swipe. El usuario evalúa eventos deslizando tarjetas:

- → **Swipe right** (o botón verde): le interesa el evento.
- ← **Swipe left** (o botón ×): lo descarta.
- 🔖 **Bookmark**: lo guarda para ver después.

---

## Stack tecnológico

| Tecnología | Versión | Rol |
|---|---|---|
| **React** | 18.3 | UI declarativa basada en componentes |
| **TypeScript** | 5.6 | Tipado estático — reduce errores en tiempo de desarrollo |
| **Vite** | 6.4 | Bundler + servidor de desarrollo ultrarrápido (HMR) |
| **Tailwind CSS** | 3.4 | Utilidades CSS inline — evita escribir CSS custom para estilos repetitivos |
| **Framer Motion** | 11 | Animaciones declarativas y gestos de arrastre (swipe) |
| **React Router v6** | 6.27 | Navegación SPA entre pantallas |
| **lucide-react** | 0.540 | Set de iconos SVG optimizado para tree-shaking |
| **@react-google-maps/api** | 2.20.8 | Integración de Google Maps con Places API (búsqueda de locales cercanos) |

### ¿Por qué Vite y no Create React App?

Vite usa ES Modules nativos del navegador durante el desarrollo, lo que da tiempos de arranque y recarga casi instantáneos. Create React App (CRA) está descontinuado desde 2023.

### ¿Por qué Framer Motion para el swipe?

La librería expone `motion.div` con `drag`, `useMotionValue` y `useTransform`, que permiten crear el efecto de arrastre con rotación proporcional y umbral de salida en ~30 líneas de código, sin necesidad de listeners manuales de touch/mouse.

---

## Estructura del proyecto

```
src/
├── App.tsx                  # Raíz: BrowserRouter + AuthProvider + Routes
├── main.tsx                 # Entry point de React DOM
├── index.css                # Tailwind base + estilos globales
│
├── types/
│   └── index.ts             # Tipos TypeScript centrales (Event, User, etc.)
│
├── data/
│   └── mockEvents.ts        # Datos mock + helpers (formatPrice, formatDate)
│
├── context/
│   └── AuthContext.tsx      # Estado global de autenticación (Context API)
│
├── components/
│   ├── Layout.tsx           # Wrapper con header, BottomNavBar y sidebar de mapa
│   ├── BottomNavBar.tsx     # Navegación inferior fija con NavLink activos
│   ├── SwipeCard.tsx        # Tarjeta de evento con arrastre Framer Motion
│   └── BellavistaMap.tsx    # Mapa Google Maps con Places API (locales cercanos)
│
└── pages/
    ├── FeedPage.tsx         # Pantalla principal: stack de swipe
    ├── AuthPage.tsx         # Login / Registro
    ├── SearchPage.tsx       # Búsqueda y filtros por categoría
    ├── SavedPage.tsx        # Eventos guardados
    └── ProfilePage.tsx      # Perfil del usuario
```

---

## Arquitectura y decisiones técnicas

### Gestión de estado

Se usa **React Context API** (sin Redux ni Zustand) porque el estado global actual es simple: solo el usuario autenticado. Cuando la app crezca y haya más estado compartido (filtros, eventos favoritos sincronizados), se puede migrar a Zustand con una refactorización mínima.

```
AuthContext
  └── user: User | null
  └── isAuthenticated: boolean
  └── login() / register() / logout() / updateUser()
```

### Mecánica de swipe

```
FeedPage
  └── events: Event[]           ← array completo pendiente de evaluar
        └── visibleEvents[0..2] ← los primeros 3 son el "stack" visible
              └── SwipeCard (stackIndex=0) ← carta activa e interactuable
              └── SwipeCard (stackIndex=1) ← carta de fondo, escala 0.96
              └── SwipeCard (stackIndex=2) ← carta de fondo, escala 0.92
```

El `stackIndex` controla:
- `z-index` (quién queda arriba)
- `scale` (efecto de profundidad)
- `pointerEvents` (solo la carta top recibe eventos)

Al hacer swipe, Framer Motion anima la carta hacia fuera del viewport y el callback (`onSwipeRight` / `onSwipeLeft`) filtra esa carta del array, haciendo que la siguiente suba automáticamente al tope.

### Rutas protegidas

```tsx
<Route path="/" element={
  <ProtectedRoute>
    <FeedPage />
  </ProtectedRoute>
} />
```

`ProtectedRoute` lee `isAuthenticated` del `AuthContext`. Si es `false`, redirige a `/auth` con `<Navigate replace />`.

### Paleta de colores (Tailwind extendida)

| Token | Hex | Uso |
|---|---|---|
| `primary` | `#7C3AED` | Violeta — color de marca principal |
| `primary-light` | `#A78BFA` | Iconos, texto destacado |
| `primary-dark` | `#5B21B6` | Estados hover |
| `accent` | `#F59E0B` | Amarillo dorado — badges especiales |
| `surface` | `#1A1A2E` | Fondo oscuro de la app |
| `card` | `#16213E` | Fondo de tarjetas y componentes |
| `muted` | `#94A3B8` | Texto secundario |

---

## Pantallas

### `/auth` — Login / Registro

Toggle entre los dos modos. Validación en el cliente antes de llamar al auth. En producción: `POST /api/auth/login` y `POST /api/auth/register`.

### `/` — Feed (pantalla principal)

Stack de tarjetas con swipe. Muestra máximo 3 tarjetas apiladas. Incluye:
- Toast de feedback verde/rojo tras cada swipe.
- Estado vacío con opción de reiniciar.
- Contador de eventos restantes e interesados.

### `/search` — Explorar

- Barra de búsqueda por texto (título + tags).
- Chips de filtro por categoría.
- Grid de 2 columnas con tarjetas compactas.
- Al tocar una tarjeta → modal con la SwipeCard completa.

### `/saved` — Guardados

Lista de eventos marcados con bookmark. Cada ítem muestra imagen lateral + metadata. Permite quitar de guardados.

### `/profile` — Perfil

- Avatar, nombre, bio, ubicación.
- Intereses editables (chips toggle).
- Estadísticas (likes, guardados).
- Botón de cerrar sesión.

---

## Instalación y uso

```bash
# Clonar e instalar dependencias
npm install

# Servidor de desarrollo (http://localhost:5173)
npm run dev

# Build de producción
npm run build

# Previsualizar el build
npm run preview
```

---

## Variables de entorno

Copiar `.env.example` como `.env.local` y completar los valores reales:

```bash
cp .env.example .env.local
```

Editar `.env.local`:

```env
# Clave de Google Maps JavaScript API + Places API
VITE_GOOGLE_MAPS_API_KEY=tu_clave_aqui

# URL base de la API REST (cuando se integre el backend)
# VITE_API_URL=https://api.emeet.cl
```

### Cómo obtener la API key de Google Maps

1. Ir a [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Crear un proyecto (o usar uno existente)
3. Habilitar las APIs: **Maps JavaScript API** y **Places API**
4. Generar una API key y (recomendado) restringirla a tu dominio

> **Nota:** Todas las variables expuestas al cliente deben tener el prefijo `VITE_`. El archivo `.env.local` nunca debe subirse a git (ya está en `.gitignore`).

---

## Roadmap y próximos pasos

| Prioridad | Feature |
|---|---|
| 🔴 Alta | Integración con API REST (reemplazar mock data) |
| ✅ Hecho | Mapa interactivo de eventos cercanos (Google Maps + Places API) |
| 🟡 Media | Sistema de notificaciones (recordatorios de eventos guardados) |
| 🟡 Media | Detalle expandido de evento (pantalla completa con info extra) |
| 🟡 Media | Filtro por radio de distancia y precio |
| 🟢 Baja | Chat / grupo de asistentes de un evento |
| 🟢 Baja | Modo oscuro / claro |
| 🟢 Baja | PWA (Progressive Web App) para instalar en móvil |
