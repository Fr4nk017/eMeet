# eMeet - Frontend Plan Actual

> **Nota:** este documento fue ajustado para reflejar el **frontend objetivo y coherente con la arquitectura final**. La integración directa con `Google Places API` se está usando solo como apoyo de desarrollo y **no debe considerarse una dependencia definitiva del frontend**, ya que la consulta de lugares se moverá a la capa backend / BFF.

---

## 1. Stack actual de frontend

| Tecnología | Uso actual en el proyecto |
|---|---|
| **Next.js 14 (App Router)** | Framework principal, rutas y layout de la aplicación |
| **React 18** | Construcción de la interfaz interactiva |
| **TypeScript** | Tipado del código y modelos de datos |
| **Tailwind CSS** | Estilos utilitarios y diseño responsive |
| **Framer Motion** | Animaciones de entrada, transiciones y gestos de swipe |
| **React Icons** | Iconografía de la interfaz |
| **Context API** | Manejo del estado compartido de auth, lugares cercanos y chat |
| **Hooks personalizados** | Encapsulan lógica de filtros, ubicación y comportamiento de UI |
| **PostCSS + Autoprefixer** | Procesamiento de estilos junto a Tailwind |

---

## 2. Principios de desarrollo actuales

- La aplicación usa **Next.js App Router** con páginas en la carpeta `app/`.
- Se prioriza una **UI móvil e interactiva**, enfocada en descubrimiento de panoramas cercanos.
- El estado global actual se maneja con **React Context**, evitando librerías adicionales mientras el MVP se consolida.
- La autenticación y el chat todavía funcionan en modo **mock/local**, mientras se prepara la integración real con backend.
- La consulta de lugares debe consumirse idealmente desde una **capa backend / BFF**, no como responsabilidad definitiva del cliente.
- La interfaz se construye con **componentes reutilizables** y utilidades de Tailwind para mantener consistencia visual.

---

## 3. Estructura real de carpetas

```text
eMeet_frontend/
  app/
    layout.tsx                 # layout global de la app
    page.tsx                   # feed principal
    auth/
      page.tsx                 # login / registro
    search/
      page.tsx                 # exploración de panoramas
    saved/
      page.tsx                 # elementos guardados
    profile/
      page.tsx                 # perfil y preferencias
    chat/
      page.tsx                 # listado de salas/comunidades
      [roomId]/
        page.tsx               # sala de chat individual

  src/
    components/
      BellavistaMap.tsx
      BottomNavBar.tsx
      DistanceFilter.tsx
      Layout.tsx
      PlaceTypeFilters.tsx
      SwipeCard.tsx

    context/
      AuthContext.tsx          # auth mock y usuario actual
      NearbyPlacesContext.tsx  # ubicación, filtros y feed cercano
      ChatContext.tsx          # salas y mensajes mock

    services/
      placesService.ts         # integración temporal usada en desarrollo; migrable al backend / BFF

    data/
      mockEvents.ts            # datos de apoyo para prototipado

    types/
      index.ts                 # tipos compartidos del dominio

    providers/
      AppProviders.tsx         # composición de providers globales
```

---

## 4. Páginas y responsabilidades actuales

### 4.1 Feed principal `/`
- Muestra el contenido principal de descubrimiento.
- Usa ubicación, distancia y tipo de lugar para personalizar resultados.
- Integra acciones como `like`, `save` y acceso a comunidad.
- Debe consumir lugares cercanos desde endpoints internos del backend / BFF.

### 4.2 Autenticación `/auth`
- Permite alternar entre **inicio de sesión** y **registro**.
- Actualmente funciona con lógica mock en `AuthContext`.
- Sirve para validar el flujo de acceso del usuario dentro del MVP.

### 4.3 Exploración `/search`
- Lista panoramas o eventos filtrables por texto y categoría.
- Usa datos mock para explorar la UX de navegación y descubrimiento.
- Permite abrir un detalle visual mediante `SwipeCard`.

### 4.4 Guardados `/saved`
- Muestra elementos guardados por el usuario.
- Actualmente opera con datos locales/mock.
- Sirve como base para futura persistencia real.

### 4.5 Perfil `/profile`
- Permite ver y ajustar intereses y preferencias del usuario.
- Trabaja sobre el estado gestionado desde `AuthContext` y `NearbyPlacesContext`.
- Es la base del sistema de personalización del feed.

### 4.6 Comunidad `/chat`
- Presenta las salas disponibles asociadas a lugares o interacciones.
- Muestra actividad simulada y navegación a conversación individual.

### 4.7 Sala de conversación `/chat/[roomId]`
- Permite enviar y visualizar mensajes dentro de una sala.
- Funciona con estado local desde `ChatContext`.
- Simula la futura integración realtime del backend.

---

## 5. Flujos críticos actualmente implementados

### 5.1 Flujo de geolocalización y lugares cercanos
```text
Usuario entra al feed
  → NearbyPlacesContext obtiene ubicación del navegador
  → el frontend envía ubicación y filtros a un endpoint interno
  → backend / BFF consulta el servicio externo de lugares
  → backend normaliza y filtra la respuesta
  → el frontend muestra tarjetas interactivas con resultados relevantes
```

### 5.2 Flujo de interacción con tarjetas
```text
Usuario visualiza una SwipeCard
  → puede marcar like, descartar o guardar
  → la interfaz responde con animaciones y feedback visual
  → si el lugar tiene sitio web, se puede abrir desde la tarjeta
  → si hay interés social, se enlaza a la comunidad/chat asociada
```

### 5.3 Flujo de autenticación mock
```text
Usuario entra a /auth
  → selecciona login o registro
  → AuthContext simula la validación
  → se actualiza el estado isAuthenticated
  → el usuario es redirigido a la experiencia principal
```

### 5.4 Flujo de comunidad / chat
```text
Usuario entra a /chat
  → visualiza salas disponibles
  → selecciona una sala concreta
  → envía mensajes en la vista /chat/[roomId]
  → ChatContext actualiza los mensajes y el estado de lectura localmente
```

---

## 6. Componentes clave de la interfaz

| Componente | Rol actual |
|---|---|
| `Layout.tsx` | Estructura general de la interfaz y navegación base |
| `BottomNavBar.tsx` | Navegación inferior orientada a mobile |
| `SwipeCard.tsx` | Tarjeta principal para mostrar un panorama/lugar y sus acciones |
| `DistanceFilter.tsx` | Ajuste del radio de búsqueda según preferencia del usuario |
| `PlaceTypeFilters.tsx` | Filtros por categorías de lugares como café, bar o restaurante |
| `BellavistaMap.tsx` | Representación visual del mapa y contexto geográfico |

---

## 7. Gestión de estado actual

| Estado | Herramienta actual | Propósito |
|---|---|---|
| Usuario autenticado | `AuthContext` | Manejar sesión mock, perfil e intereses |
| Lugares cercanos y filtros | `NearbyPlacesContext` | Ubicación, radio de búsqueda, tipos y resultados |
| Chat y salas | `ChatContext` | Mensajes, comunidades y lectura local |
| Estado visual local | `useState` / `useMemo` / `useCallback` | Interacciones de cada pantalla y componentes |

---

## 8. Integraciones y variables de entorno del frontend

En la arquitectura objetivo, el frontend **no debería exponer claves sensibles de servicios externos**. La consulta de lugares cercanos debe realizarse a través del backend / BFF, y no directamente desde el navegador.

```env
NEXT_PUBLIC_APP_URL=
```

> Las credenciales de `Google Places API` y otros servicios externos deben permanecer del lado servidor. El frontend solo debería consumir endpoints internos seguros.

---

## 9. Consideraciones de rendimiento actuales

- Mantener el feed centrado en los lugares realmente relevantes para evitar sobrecarga visual.
- Filtrar tipos no útiles desde `placesService.ts` para mejorar calidad de resultados.
- Reutilizar componentes y estilos con Tailwind para reducir complejidad de mantenimiento.
- Evitar dependencias adicionales mientras el MVP siga en fase de consolidación.
- Usar la arquitectura de `app/` de Next.js para mantener rutas y vistas organizadas.

---

## 10. Próximos pasos recomendados para este frontend

### Etapa 1 — Consolidación del MVP actual
- mantener el flujo de descubrimiento, guardado y perfil;
- pulir responsive design y consistencia visual;
- mejorar mensajes de error, estados vacíos y feedback al usuario.

### Etapa 2 — Conexión con backend real
- reemplazar `AuthContext` mock por autenticación real con `Supabase Auth`;
- persistir likes, favoritos y preferencias;
- conectar comunidades/chat con almacenamiento y realtime reales.

### Etapa 3 — Escalado funcional
- agregar historial de interacciones;
- habilitar promociones, cupones o QR;
- mejorar personalización del feed con datos persistidos.

---

## 11. Resumen técnico

El frontend actual de `eMeet` está construido como un **MVP funcional en Next.js**, con una experiencia visual moderna apoyada en **Tailwind CSS**, **Framer Motion** y **React Context**. La base está orientada a validar la experiencia de descubrimiento social de panoramas cercanos, dejando la integración de servicios externos sensibles y la persistencia real a cargo del backend propuesto.
