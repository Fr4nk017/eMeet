# eMeet - Frontend Plan

## 1. Stack de frontend

| Tecnología | Rol |
|---|---|
| **Next.js 14+ App Router** | Framework base, rutas, layouts, SSR/SSG |
| **TypeScript** | Tipado estático en todo el proyecto |
| **Tailwind CSS** | Estilos utilitarios, diseño responsive |
| **shadcn/ui** | Componentes base accesibles y personalizables |
| **Framer Motion** | Animaciones de swipe, transiciones de feed |
| **Zustand** | Estado global ligero (sesión, preferencias UI) |
| **TanStack Query** | Caché y sincronización de datos del servidor |
| **React Hook Form + Zod** | Formularios y validaciones tipadas |
| **Supabase JS SDK** | Auth en cliente, realtime para matches |
| **Prisma Client** | Acceso a base de datos solo desde server |

---

## 2. Principios de desarrollo

- Todo componente de UI que no necesite estado de cliente debe ser **Server Component** por defecto.
- Los Client Components se marcan con `"use client"` solo cuando se necesita interactividad o hooks.
- Nunca llamar a Prisma desde el cliente. Solo desde Server Components, Server Actions o Route Handlers.
- Toda validación de formulario se hace en cliente con Zod y se repite en servidor antes de persistir.
- El feed de swipe y las animaciones son lo único que requiere Framer Motion. No usarlo en otros componentes.

---

## 3. Estructura de carpetas

```text
src/
  app/
    (public)/                  # rutas sin autenticación requerida
      page.tsx                 # landing page
      events/
        page.tsx               # explorador de eventos
        [id]/
          page.tsx             # detalle de evento
      feed/
        page.tsx               # feed tipo TikTok (video swipe)
      auth/
        login/
          page.tsx
        register/
          page.tsx
    (protected)/               # rutas que requieren sesión activa
      matches/
        page.tsx               # lista de matches del usuario
      profile/
        page.tsx               # perfil y preferencias
        edit/
          page.tsx
      community/
        page.tsx               # comunidad por evento
    organizer/                 # rutas exclusivas de organizadores
      dashboard/
        page.tsx
      events/
        new/
          page.tsx
        [id]/
          edit/
            page.tsx
    api/                        # Route Handlers
      auth/
      events/
      feed/
      swipes/
      matches/
      me/

  components/
    ui/                         # shadcn/ui generados
    layout/
      Navbar.tsx
      Sidebar.tsx
      Footer.tsx
    feed/
      VideoCard.tsx             # tarjeta de evento con video
      SwipeFeed.tsx             # contenedor del feed vertical
      SwipeControls.tsx         # botones de like/dislike
    events/
      EventCard.tsx
      EventDetail.tsx
      CategoryFilter.tsx
      EventMap.tsx
    auth/
      LoginForm.tsx
      RegisterForm.tsx
    match/
      MatchCard.tsx
      MatchList.tsx
    profile/
      ProfileForm.tsx
      PreferencesForm.tsx
    organizer/
      EventForm.tsx
      VideoUpload.tsx

  hooks/
    useLocation.ts             # geolocalización del usuario
    useSwipe.ts                # lógica de swipe (like/dislike)
    useSession.ts              # sesión de Supabase Auth
    useNearbyEvents.ts         # fetch de eventos cercanos
    useMatches.ts              # matches del usuario

  lib/
    supabase/
      client.ts                # cliente para componentes de cliente
      server.ts                # cliente para servidor (cookies)
    prisma/
      client.ts                # instancia singleton de Prisma
    validations/
      event.schema.ts
      profile.schema.ts
      auth.schema.ts
    services/
      event.service.ts
      feed.service.ts
      match.service.ts
      user.service.ts

  types/
    event.ts
    user.ts
    match.ts
    category.ts

  styles/
    globals.css
```

---

## 4. Páginas y responsabilidades

### 4.1 Landing page `/`
- Presentación de eMeet.
- CTA para explorar eventos o registrarse.
- No requiere autenticación.
- Server Component estático.

### 4.2 Feed de eventos `/feed`
- Lista vertical de tarjetas con video corto por evento.
- Autoplay del video al aparecer en viewport.
- Swipe derecha = like, swipe izquierda = discard.
- Pide permiso de ubicación al entrar.
- Muestra solo eventos cercanos al usuario.
- Accesible sin registro pero para guardar interacción requiere sesión.
- Client Component con Framer Motion para gestos.

### 4.3 Explorador de eventos `/events`
- Lista visual de eventos publicados.
- Filtros por categoría, fecha y distancia.
- Server Component con filtros en URL params.
- No requiere autenticación.

### 4.4 Detalle de evento `/events/[id]`
- Información completa del evento.
- Video principal y galería de imágenes.
- Botón de interés en asistir.
- Sección de comunidad si el usuario está registrado.
- Server Component con hidratación parcial para zona interactiva.

### 4.5 Login `/auth/login`
- Formulario email y contraseña.
- Auth con Supabase via Server Action.
- Redirección post-login a donde vino el usuario.

### 4.6 Registro `/auth/register`
- Formulario con nombre, email, contraseña.
- Validación Zod en cliente y servidor.
- Server Action que crea cuenta en Supabase Auth.

### 4.7 Matches `/matches`
- Lista de matches del usuario con otros usuarios por evento.
- Solo accesible con sesión activa.
- Realtime via Supabase para notificaciones de nuevos matches.

### 4.8 Perfil y preferencias `/profile`
- Datos del usuario.
- Categorías favoritas.
- Radio máximo de búsqueda.
- Flag de buscar compañia.

### 4.9 Dashboard organizador `/organizer/dashboard`
- Vista de eventos publicados del organizador.
- Estadísticas básicas por evento.
- Acciones de publicar, editar, pausar.

### 4.10 Crear / editar evento `/organizer/events/new`
- Formulario completo para publicar evento.
- Subida de video corto (máx 45 seg) y cover image.
- Selección de categoría y ubicación en mapa.
- Validación completa antes de guardar.

---

## 5. Flujos críticos de UI

### 5.1 Flujo de geolocalización
```
Usuario entra a /feed
  → useLocation() solicita permiso de ubicación
  → si acepta: guarda lat/lng en Zustand
  → useNearbyEvents fetcha eventos filtrados por radio
  → si rechaza: muestra feed sin filtro de ubicación con aviso
```

### 5.2 Flujo de swipe con video
```
SwipeFeed renderiza lista de VideoCard en columna vertical
  → cada VideoCard muestra un <video> con autoplay muted
  → useSwipe detecta gestos con Framer Motion drag
  → swipe derecha (x > threshold): POST /api/swipes action=right
  → swipe izquierda (x < -threshold): POST /api/swipes action=left
  → si no hay sesión: muestra modal de login al intentar swipe right
  → la tarjeta se elimina del feed con animación de salida
```

### 5.3 Flujo de match
```
Usuario hace swipe right en evento
  → se guarda event_swipe con action=right y wants_company=true
  → servidor comprueba si hay otro usuario con mismo evento y wants_company=true
  → si hay match: se crea user_match con status=pending
  → Supabase Realtime notifica al usuario en /matches
  → el otro usuario recibe notificación y puede aceptar o rechazar
```

### 5.4 Flujo de autenticación
```
Server Action de login/register
  → valida datos con Zod
  → llama a supabase.auth.signInWithPassword o signUp
  → setea cookie de sesión httpOnly
  → middleware de Next.js protege rutas de /protected y /organizer
  → useSession en cliente lee la sesión desde Supabase
```

---

## 6. Componente VideoCard (diseño esperado)

El componente central del producto. Debe:
- Ocupar el 100% del viewport en mobile.
- Mostrar video de fondo en loop con muted y autoplay.
- Overlay con: nombre del evento, organizador, categoría, distancia, precio.
- Indicadores visuales de swipe (corazón verde / X roja) al arrastrar.
- Soporte de teclado y botones de acción para accesibilidad.

```
┌─────────────────────────────┐
│                             │
│    [VIDEO autoplay loop]    │
│                             │
│                             │
│  ● Gastronomía  📍 1.2 km  │
│                             │
│  Noche de tapas             │
│  El Rincón de Pablo         │
│  Sábado 22 Mar · $15        │
│                             │
│  [✕ Discard] [♥ Me interesa]│
└─────────────────────────────┘
```

---

## 7. Gestión de estado

| Estado | Herramienta | Razón |
|---|---|---|
| Sesión de usuario | Zustand + Supabase | Persistir entre navegaciones |
| Ubicación del usuario | Zustand | Usar en varios componentes |
| Feed de eventos | TanStack Query | Caché y paginación eficiente |
| Preferencias de usuario | TanStack Query | Sincronizado con servidor |
| Matches en tiempo real | Supabase Realtime | Notificaciones instantáneas |
| Estado del formulario | React Hook Form | Aislado por formulario |

---

## 8. Autenticación y protección de rutas

El middleware de Next.js lee la cookie de sesión de Supabase y redirige:

```text
/matches, /profile, /community  → requieren sesión activa
/organizer/*                    → requieren rol = organizer
```

```typescript
// middleware.ts en la raíz del proyecto
export const config = {
  matcher: [
    '/(protected)/:path*',
    '/organizer/:path*',
  ],
}
```

---

## 9. Consideraciones de rendimiento

- Usar `next/image` para todas las imágenes. Nunca `<img>` directo.
- Usar `next/dynamic` para importar `SwipeFeed` y evitar SSR en el feed de video.
- Paginar el feed de eventos (máx 10 por request).
- Suspense + loading.tsx en todas las rutas de datos dinámicos.
- Videos se reproducen solo en el card activo (IntersectionObserver).

---

## 10. Variables de entorno necesarias en cliente

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=
```

Solo las variables `NEXT_PUBLIC_` son accesibles desde el navegador.

---

## 11. Orden de desarrollo recomendado

### Parte 1 — Base del proyecto
- Inicializar proyecto Next.js con TypeScript y Tailwind.
- Instalar y configurar shadcn/ui.
- Conectar Supabase Auth (login y registro funcionando).
- Middleware de protección de rutas.
- Layout base con Navbar.

### Parte 2 — Explorador de eventos
- Página `/events` con listado de eventos desde Supabase.
- Filtros por categoría via URL params.
- Página `/events/[id]` con detalle completo.
- Componente `EventCard` y `CategoryFilter`.

### Parte 3 — Feed de video swipe
- Componente `VideoCard` con video y overlay de datos.
- `SwipeFeed` con scroll vertical tipo TikTok.
- Integración de `useLocation` para geolocalización.
- Animaciones de swipe con Framer Motion.
- Registro de swipes en base de datos.

### Parte 4 — Match y comunidad
- Lógica de match por evento en servidor.
- Página `/matches` con lista de matches.
- Realtime de Supabase para notificaciones.
- Aceptar / rechazar match.

### Parte 5 — Panel de organizador
- Dashboard con eventos propios.
- Formulario de creación de evento con upload de video e imagen.
- Gestión de estado de publicación.

### Parte 6 — Perfil y preferencias
- Página de perfil editable.
- Configuración de preferencias de categorías y radio.
- Avatar upload con Supabase Storage.
