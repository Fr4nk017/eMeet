# INFORME DE AVANCE N°1: ESTRATEGIA Y CONCEPTUALIZACIÓN

**Asignatura:** Taller Aplicado de Programación (TPY1101)  
**Proyecto:** eMeet — Plataforma Web de Descubrimiento de Eventos Cercanos  
**Repositorio:** [DanielBravoS88/eMeet_frontend](https://github.com/DanielBravoS88/eMeet_frontend)

---

## 1. INTRODUCCIÓN Y EQUIPO

### 1.1 Resumen Ejecutivo

eMeet es una plataforma web de descubrimiento de eventos cercanos que conecta a usuarios que buscan panoramas con restaurantes, bares, locales y organizadores que necesitan visibilidad. La solución ofrece una interfaz intuitiva tipo "swipe" (deslizar tarjetas), geolocalización, filtros por categoría e intereses personales, y una capa social que permite confirmar asistencia y crear grupos. Su propuesta de valor diferencial radica en centralizar en una sola experiencia la recomendación por cercanía, la personalización por gustos y la dimensión social de los eventos, algo que soluciones existentes como redes sociales o plataformas de venta de entradas no integran de forma unificada. La primera versión (MVP) es una aplicación web responsive, actualmente con datos mock, que ya tiene construidas las pantallas principales: Feed (swipe de eventos), Búsqueda, Guardados y Perfil.

### 1.2 Identificación del Equipo

| Integrante | RUT | Roles en el Proyecto |
|---|---|---|
| **Daniel Bravo** | 16.809.451-5 | QA / Testing / Desarrollador Frontend / Scrum Member |
| **Francisco Levipil** | 21.177.522-K | Product Owner / Líder de Proyecto / DBA / Analista Funcional / Scrum Master |
| **Antonio Vivar** | 16.375.202-6 | Backend Developer / Integración de API / Soporte Técnico / Scrum Member |

**Descripción de Roles:**
- **Francisco Levipil (Product Owner / Scrum Master):** Responsable del backlog, levantamiento funcional, modelado de base de datos y coordinación de entregas. Es el punto de contacto con el docente para validar avances.
- **Daniel Bravo (Frontend / QA):** Responsable del diseño visual, maquetación de componentes React, pruebas funcionales y control de calidad del sistema.
- **Antonio Vivar (Backend / Integración):** Responsable del desarrollo de la API REST, autenticación, integración de servicios externos y despliegue en producción.

---

## 2. CONTEXTO Y PROBLEMÁTICA (IL 1.1)

### 2.1 Descripción de la Problemática

Actualmente, la información sobre eventos locales (gastronómicos, culturales, musicales, deportivos) se encuentra dispersa en múltiples canales: Instagram, Facebook, WhatsApp, carteles físicos y sitios web individuales de los locales, muchos de los cuales no se actualizan con regularidad. Esta dispersión genera tres fricciones principales:

1. **Para el usuario:** Dedica tiempo excesivo buscando en múltiples fuentes, no encuentra actividades compatibles con sus gustos y ubicación, y frecuentemente no se entera de eventos por falta de visibilidad.
2. **Para los negocios y organizadores:** Restaurantes, bares, discotecas y organizadores de eventos no cuentan con una plataforma especializada que conecte su oferta con personas cercanas y con intención real de asistencia. Las campañas en redes sociales son costosas y poco segmentadas.
3. **Para la experiencia social:** La búsqueda de planes colectivos (ir acompañado, armar grupos) no tiene soporte digital adecuado; se resuelve de forma informal por mensajería.

El resultado es una tasa de asistencia a eventos más baja de lo potencial y una pérdida de oportunidad para los negocios locales.

### 2.2 Análisis Causa-Efecto

**Diagrama de Ishikawa (Espina de Pescado):**

```
                        PROBLEMA CENTRAL
               ┌─────────────────────────────┐
               │ Baja asistencia a eventos   │
               │ locales y escasa promoción  │
               │ efectiva de negocios        │
               └─────────────┬───────────────┘
                             │
    ┌────────────────────────┼─────────────────────────────┐
    │                        │                             │
    ▼                        ▼                             ▼
PERSONAS               PROCESO                    PLATAFORMA
────────               ───────                    ──────────
• Desconoce eventos    • Búsqueda manual          • Información dispersa
  cercanos               en múltiples redes         en RRSS, WA, IG
• No sabe con quién    • Sin filtros por          • No hay canal
  asistir               ubicación o gustos          especializado
• Falta de tiempo      • Sin confirmación         • Sitios de locales
  para buscar           de asistencia               desactualizados

    │                        │                             │
    ▼                        ▼                             ▼
NEGOCIOS              TECNOLOGÍA               COMUNICACIÓN
────────              ──────────               ─────────────
• Sin presupuesto     • Sin herramienta        • Boca a boca como
  para marketing        de geolocalización       principal canal
• Sin métricas de     • Sin personalización    • Eventos sin
  alcance               por intereses            segmentación
• Dependen de RRSS    • Sin integración        • Sin notificaciones
  generales             social                   de recordatorio
```

**Árbol de Problemas:**

- **Causas raíz:** Fragmentación de la información de eventos, ausencia de plataforma especializada, falta de personalización, sin componente social de asistencia.
- **Problema central:** Baja visibilidad de eventos locales + alta fricción en la decisión de asistencia.
- **Efectos:** Menor asistencia a eventos, menor rentabilidad de los negocios locales, usuarios con menos vida social activa, oportunidad de mercado desaprovechada.

### 2.3 Estado del Arte y Homologación

| Solución | Geolocalización | Filtros por Intereses | Módulo Social (grupos) | Costo para Negocios | Brecha detectada |
|---|---|---|---|---|---|
| **Facebook Events** | Parcial (ciudad) | Limitado (categorías básicas) | Sí (invitar amigos) | Alto (ads) | No tiene foco en cercanía inmediata ni swipe; algoritmo poco predecible |
| **Eventbrite** | Sí (ciudad/región) | Sí (categorías) | No (solo compra de entradas) | Alto (comisión por venta) | Orientado a venta de tickets; no a descubrimiento casual ni eventos gratuitos |
| **Meetup** | Sí | Sí (intereses) | Sí (grupos temáticos) | Suscripción mensual | No está orientado a eventos de negocio (bares/restaurantes); no tiene swipe ni énfasis en cercanía geoespacial en tiempo real |
| **Google Maps / eventos** | Excelente | No | No | Sin costo extra | Solo listado básico; sin filtros de interés, sin perfil de usuario, sin asistencia social |
| **eMeet (propuesta)** | Sí (GPS + radio) | Sí (gustos, categoría, fecha) | Sí (asistencia + grupos) | Gratuito MVP | **Cubre la brecha:** integra cercanía + personalización + componente social en una sola experiencia, orientada a descubrimiento casual y conversión real |

**Brecha cubierta:** Ninguna solución existente combina en una sola experiencia la recomendación hiperlocal, la personalización por intereses del usuario y la funcionalidad social de grupos/asistencia para eventos cotidianos de bares, restaurantes y organizadores locales.

### 2.4 Situación Inicial (As-Is)

**Diagrama de flujo del proceso actual (sin eMeet):**

```
[Usuario quiere salir o buscar plan]
         │
         ▼
[Revisa Instagram] ──────► [No encuentra nada relevante]
         │                          │
         ▼                          ▼
[Revisa Facebook Events] ──► [Eventos sin ubicación exacta
         │                    o desactualizados]
         ▼
[Busca en Google "eventos hoy Santiago"]
         │
         ▼
[Visita 3-5 sitios web distintos] ──► [Información incompleta,
         │                              sin filtro por gusto]
         ▼
[Pregunta en WhatsApp a amigos]
         │
         ├──► [No recibe respuesta clara]
         │          │
         │          ▼
         │    [Desiste de salir]
         │
         └──► [Acuerdan un lugar sin criterio real de selección]
                    │
                    ▼
             [Asiste al evento con incertidumbre]

Para Negocios:
[Local tiene un evento] → [Publica en Instagram] → [Alcance orgánico limitado]
                        → [Sin métricas de interés real]
                        → [Sin canal segmentado por ubicación y gustos]
```

---

## 3. OBJETIVOS Y ALCANCE (IL 1.2)

### 3.1 Objetivo General

**Desarrollar eMeet**, una plataforma web responsive de descubrimiento de eventos cercanos, que integre geolocalización, personalización por intereses y funcionalidades sociales de asistencia, **en el plazo de 16 semanas académicas** (semestre 2025), permitiendo a usuarios finales descubrir eventos compatibles con sus gustos y a negocios locales promocionar sus actividades de forma segmentada y gratuita en la primera versión.

**(SMART):** Específico (plataforma web de eventos con geolocalización y componente social), Medible (MVP funcional desplegado en la web con al menos 5 módulos operativos), Alcanzable (equipo de 3 personas con stack definido), Relevante (necesidad real del mercado local), Temporal (16 semanas, cierre semestre 2025).

### 3.2 Objetivos Específicos

1. **Implementar un módulo de autenticación seguro** con registro, login, roles de usuario (usuario estándar / administrador de local) y protección de rutas privadas usando JWT.
2. **Desarrollar el módulo de gestión de locales y eventos** (CRUD completo), permitiendo que cada administrador gestione únicamente sus propios eventos.
3. **Implementar búsqueda geoespacial y filtros** por ubicación/radio, categoría, fecha e intereses del perfil de usuario, integrando Google Maps API / Leaflet.
4. **Construir el módulo social** de confirmación de asistencia y creación/gestión de grupos para asistir acompañado.
5. **Desplegar la solución en infraestructura cloud gratuita** (Vercel para frontend, Render/Railway para backend, MongoDB Atlas para base de datos) con acceso público y URL estable para demostración.
6. **Generar documentación técnica completa** (README, manual de usuario básico, evidencias de pruebas) que permita reproducir y evaluar el proyecto.

### 3.3 Alcance Técnico

**Entregables:**
- Aplicación web frontend (React + TypeScript) desplegada en Vercel/Netlify.
- API REST backend (Node.js + Express) desplegada en Render/Railway.
- Base de datos MongoDB Atlas con colecciones: usuarios, locales, eventos, grupos.
- Documentación técnica en README.md.
- Manual de usuario básico.
- Evidencias de pruebas (capturas, resultados Postman, casos de prueba).

**Supuestos:**
- Se cuenta con acceso a una clave de Google Maps API (o se usa Leaflet como alternativa gratuita).
- Cada integrante cuenta con computador personal y conexión a internet estable.
- Los servicios cloud gratuitos (Vercel, Render, MongoDB Atlas) estarán disponibles durante todo el semestre.
- El alcance del MVP no requiere pasarela de pagos.
- Se asume que los datos de eventos iniciales serán ingresados manualmente por el equipo para la demostración.

**Restricciones:**
- Presupuesto para cloud: $0 (se usan exclusivamente capas gratuitas de Vercel, Render y MongoDB Atlas).
- Plazo máximo: 16 semanas académicas (semestre 2025).
- Equipo: 3 integrantes con roles definidos, sin posibilidad de aumentar el equipo.
- No se implementará pasarela de pagos propia ni venta directa de entradas en esta versión.
- No se implementará chat en tiempo real (WebSockets) en el MVP; queda como mejora futura.
- El sistema operará únicamente como aplicación web (no app nativa iOS/Android), aunque con diseño responsive.

---

## 4. PROPUESTA DE SOLUCIÓN Y DISEÑO CONCEPTUAL (IL 1.1 / IL 1.4)

### 4.1 Definición de Requerimientos

#### Requerimientos Funcionales

| N° | Identificador | Descripción | Prioridad |
|---|---|---|---|
| RF01 | AUTH | El sistema debe permitir el registro de usuarios con nombre, correo y contraseña, y el registro de administradores de local con datos adicionales del negocio. | Alta |
| RF02 | AUTH | El sistema debe permitir el inicio de sesión con correo y contraseña, generar un token JWT y mantener la sesión activa durante la navegación. | Alta |
| RF03 | EVENTOS | El sistema debe permitir a administradores de local crear, editar, visualizar y eliminar eventos asociados a su local (CRUD). | Alta |
| RF04 | FEED | El sistema debe mostrar al usuario un feed de eventos cercanos con interfaz de deslizamiento (swipe), mostrando imagen, título, categoría, distancia, fecha y precio. | Alta |
| RF05 | BÚSQUEDA | El sistema debe permitir buscar eventos por texto, filtrar por categoría, rango de fechas y distancia máxima desde la ubicación del usuario. | Alta |
| RF06 | GEOLOC | El sistema debe obtener la ubicación del usuario (GPS/browser) y mostrar eventos ordenados por cercanía en un mapa interactivo. | Alta |
| RF07 | SOCIAL | El sistema debe permitir al usuario confirmar asistencia individual a un evento ("Asistiré"). | Media |
| RF08 | SOCIAL | El sistema debe permitir crear un grupo para asistir a un evento, invitar amigos y gestionar solicitudes de unión (aceptar/rechazar). | Media |
| RF09 | PERFIL | El sistema debe permitir al usuario editar su perfil (foto, bio, ubicación, intereses/gustos). | Media |
| RF10 | GUARDADOS | El sistema debe permitir al usuario guardar eventos en una lista de favoritos y acceder a ella desde la sección "Guardados". | Media |

#### Requerimientos No Funcionales (Atributos de Calidad)

| Atributo | Descripción | Mecanismo de Garantía |
|---|---|---|
| **Seguridad** | Las contraseñas no deben almacenarse en texto plano. Los endpoints privados deben requerir token JWT válido. Se debe usar HTTPS en producción. | Uso de `bcrypt` para hash de contraseñas (saltRounds ≥ 10). Middleware de autenticación en Express que valida el JWT en cada request a rutas protegidas. TLS/SSL provisto por Vercel y Render por defecto. |
| **Confiabilidad** | El sistema debe manejar errores de red y de validación sin colapsar la interfaz. Los datos del usuario deben persistir entre sesiones. | Manejo de errores en frontend con `try/catch` y mensajes descriptivos al usuario. Validación en ambas capas (frontend y backend). Persistencia de sesión con token en `localStorage`. |
| **Precisión** | Los filtros de búsqueda deben retornar únicamente eventos que coincidan con los criterios seleccionados. La geolocalización debe ser precisa al radio definido. | Uso de índices geoespaciales en MongoDB (`2dsphere`) para consultas de proximidad. Validación de parámetros de búsqueda en backend antes de ejecutar la consulta. Tests unitarios sobre la lógica de filtros. |
| **Usabilidad** | La interfaz debe ser responsive y usable en dispositivos móviles (pantallas ≥ 375px). El tiempo de respuesta de la interfaz no debe superar 2 segundos en condiciones normales. | Diseño mobile-first con Tailwind CSS. Viewport configurado en `index.html`. Optimización de bundle con Vite (tree-shaking, code splitting). |
| **Escalabilidad** | La arquitectura debe permitir agregar nuevas funcionalidades sin refactorización mayor. | Separación de capas en backend (rutas, controladores, servicios, modelos). Context API en frontend migrable a Zustand. Módulos independientes por funcionalidad. |

### 4.2 Diseño de Interfaz (Mockups)

El prototipo funcional ya implementado en el repositorio define las siguientes pantallas principales:

**Flujo principal:** `/auth` → `/` (Feed) → `/search` → `/saved` → `/profile`

| Pantalla | Descripción Visual | Estado |
|---|---|---|
| **AuthPage** (`/auth`) | Formulario centrado con campos email/password, toggle Login/Registro, botón primario morado (#7C3AED). Campo "Nombre" visible solo en modo registro. Fondo oscuro (#1A1A2E). | Implementado |
| **FeedPage** (`/`) | Stack de 3 tarjetas superpuestas con imagen de evento, badge de categoría, distancia, precio y botones Nope/Like/Guardar. Animación de rotación proporcional al arrastre (Framer Motion). Indicadores LIKE (verde) / NOPE (rojo) en las esquinas. | Implementado |
| **SearchPage** (`/search`) | Barra de búsqueda superior, chips de categorías horizontales (gastronomía, música, cultura, networking, deporte, fiesta, teatro, arte), grid de 2 columnas con tarjetas de eventos. | Implementado |
| **SavedPage** (`/saved`) | Lista vertical de eventos guardados con diseño side-by-side (imagen izquierda, metadata derecha), botón de eliminar, estado vacío con emoji 🔖. | Implementado |
| **ProfilePage** (`/profile`) | Avatar circular, nombre, bio y ubicación, chips de intereses editables (toggle), estadísticas (likes/guardados), botón Cerrar Sesión. | Implementado |
| **Layout / Navegación** | Bottom Navigation Bar fija con 4 tabs (Home, Search, Saved, Profile) con iconos HeroIcons. En desktop: sidebar con mapa de Bellavista, logo y feature cards. | Implementado |

> **Nota:** El prototipo funcional en código (React + Tailwind + Framer Motion) actúa como wireframe de alta fidelidad. No se requieren archivos externos de Figma para este equipo dado que la construcción directa en código ya representa fielmente el diseño.

### 4.3 Arquitectura y Patrones

**Patrón seleccionado: Arquitectura Cliente-Servidor con Separación por Capas (Layered Architecture)**

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE (Frontend)                        │
│                                                             │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │  Pages   │→ │  Components  │→ │  Context (Estado)  │   │
│  │ (Vistas) │  │ (Reutiliz.)  │  │  AuthContext       │   │
│  └──────────┘  └──────────────┘  └────────────────────┘   │
│         │                                   │               │
│         └───────────────────────────────────┤               │
│                        │                                    │
│                    React Router v6                          │
│                    (SPA, rutas protegidas)                  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP / JSON (Axios)
                         │ HTTPS en producción
┌────────────────────────▼────────────────────────────────────┐
│                    SERVIDOR (Backend)                        │
│                                                             │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Rutas   │→ │Controladores │→ │     Servicios        │  │
│  │ Express  │  │ (Lógica HTTP)|  │ (Lógica de Negocio)  │  │
│  └──────────┘  └──────────────┘  └──────────┬───────────┘  │
│                                             │               │
│                                   ┌─────────▼───────────┐  │
│                                   │  Modelos (Mongoose)  │  │
│                                   └─────────┬────────────┘  │
└─────────────────────────────────────────────┼───────────────┘
                                              │ MongoDB Wire Protocol
┌─────────────────────────────────────────────▼───────────────┐
│                 BASE DE DATOS (MongoDB Atlas)                │
│    Colecciones: users, locals, events, groups               │
└─────────────────────────────────────────────────────────────┘
```

**Justificación:**
- La **Arquitectura Cliente-Servidor** es proporcional a los requerimientos: el frontend (React SPA) consume una API REST, lo que permite desarrollo paralelo y despliegue independiente de cada capa.
- La **separación por capas en backend** (Rutas → Controladores → Servicios → Modelos) facilita el testing unitario de la lógica de negocio sin dependencia de la capa HTTP, y permite que el equipo divida responsabilidades claramente (Antonio: servicios/modelos, Daniel: frontend, Francisco: diseño de esquemas).
- Se descarta **Microservicios** porque la complejidad y el overhead de coordinación serían desproporcionados para un equipo de 3 personas en 16 semanas.
- **Context API** (en lugar de Redux) es suficiente para el estado global actual (autenticación), con posibilidad de migrar a Zustand si el estado crece.

### 4.4 Estrategia Cloud (IL 1.3)

| Aspecto | Detalle |
|---|---|
| **Frontend** | **Vercel** (PaaS) — Deployment automático desde GitHub, CDN global, HTTPS gratuito, soporte nativo para Vite/React. |
| **Backend** | **Render** o **Railway** (PaaS) — Hosting de servidor Node.js/Express, deploys automáticos desde Git, capa gratuita disponible. |
| **Base de Datos** | **MongoDB Atlas** (DBaaS/SaaS) — Cluster gratuito M0 (512 MB), geoindexación nativa para consultas de cercanía. |
| **Almacenamiento de imágenes** | **Cloudinary** (SaaS) — Capa gratuita para carga y transformación de imágenes de eventos. |

**Modelo de Servicio:** Se usa exclusivamente **PaaS (Platform as a Service)** y **SaaS** para evitar la administración de infraestructura (servidores, SO, redes). Esto permite al equipo focalizarse en el desarrollo de la aplicación.

**Justificación de Factibilidad:**
- Todas las plataformas seleccionadas ofrecen capa gratuita suficiente para el MVP: Vercel (banda ancha ilimitada en capa gratuita para proyectos personales), Render (instancias gratuitas con espín automático), MongoDB Atlas (512 MB es más que suficiente para datos de demostración).
- El deploy desde GitHub automatiza la entrega continua: cada push a `main` actualiza el entorno de producción sin intervención manual.
- Los servicios seleccionados no requieren tarjeta de crédito para la capa gratuita, eliminando el riesgo de costo accidental.
- Esta estrategia permite cumplir con los plazos porque elimina tiempo de configuración de infraestructura, dejando el 100% del esfuerzo en código de aplicación.

---

## 5. DESCRIPCIÓN TÉCNICA

### 5.1 Stack Tecnológico

| Capa | Tecnología | Versión | Justificación |
|---|---|---|---|
| **Frontend Framework** | React | 18.3.1 | Ecosistema maduro, componentes reutilizables, Context API para estado global |
| **Lenguaje** | TypeScript | 5.6.2 | Tipado estático previene errores en tiempo de compilación, mejor autocompletado |
| **Build Tool** | Vite | 6.2.0 | HMR casi instantáneo, bundling con ES Modules, sustituye CRA (descontinuado) |
| **Estilos** | Tailwind CSS | 3.4.14 | Utility-first, mobile-first, sin CSS custom adicional, bundle optimizado |
| **Animaciones** | Framer Motion | 11.11.0 | Mecánica de swipe/drag en ~30 líneas, integración nativa con React |
| **Routing** | React Router v6 | 6.27.0 | SPA routing, NavLink con estados activos, rutas protegidas |
| **Iconos** | react-icons (HeroIcons v2) | 5.3.0 | SVG inline, tree-shaking, consistencia visual |
| **Mapas** | @react-google-maps/api / Leaflet | 2.20.8 | Integración de mapas y geolocalización |
| **HTTP Client** | Axios | (pendiente) | Interceptors, manejo de errores centralizado (integración futura con backend) |
| **Backend** | Node.js + Express | LTS / 4.x | Ecosistema JavaScript unificado, amplia documentación, REST API |
| **ODM** | Mongoose | 8.x | Esquemas y validaciones para MongoDB, soporte geoespacial (`2dsphere`) |
| **Autenticación** | bcrypt + jsonwebtoken | LTS | Hash de contraseñas y tokens JWT sin servidor de sesión |
| **Base de Datos** | MongoDB | Atlas (cloud) | Flexibilidad de esquema para etiquetas, intereses y estructuras dinámicas |
| **CSS Transform** | PostCSS + Autoprefixer | 8.x / 10.x | Compatibilidad cross-browser en producción |
| **Lenguajes Markup** | HTML5, CSS3 | — | Estándares web modernos |
| **Diseño UI** | Figma | — | Wireframes y flujo de navegación (prototipo previo a código) |

**Paleta de colores definida:**

| Token | Hex | Uso |
|---|---|---|
| Primary | `#7C3AED` | Botones, bordes activos, badge de categoría |
| Accent | `#F59E0B` | Destacados, iconos de acción |
| Surface | `#1A1A2E` | Fondo principal |
| Card | `#16213E` | Fondo de tarjetas y paneles |
| Muted | `#94A3B8` | Texto secundario, placeholders |

**Modelo de Datos Principal (MongoDB):**

```
Colecciones:
├── users      { _id, name, email, passwordHash, role, location, interests[], avatar, bio }
├── locals     { _id, ownerId→users, name, address, coordinates{lat,lng}, category, description }
├── events     { _id, localId→locals, title, description, category, date, price, imageUrl,
│                coordinates{lat,lng}, attendees[], capacity, tags[] }
└── groups     { _id, eventId→events, creatorId→users, members[], pendingRequests[], name }
```

### 5.2 Repositorio y Versionamiento

**Repositorio:** [https://github.com/DanielBravoS88/eMeet_frontend](https://github.com/DanielBravoS88/eMeet_frontend)

**Estrategia de Ramas (GitFlow adaptado):**

```
main           ──●──────────────────────────────● (producción, solo merges aprobados)
                  \                            /
develop            ●──────────────────────────● (integración continua)
                    \         \         \    /
feature/auth         ●─────●   \         \ /
feature/events           ●─────●           /
feature/search                   ●────────●
```

| Rama | Propósito |
|---|---|
| `main` | Código en producción, siempre estable. Solo recibe merges desde `develop` vía Pull Request. |
| `develop` | Rama de integración. Recibe los merges de cada feature completada y validada. |
| `feature/[nombre]` | Ramas de desarrollo por funcionalidad (ej. `feature/auth`, `feature/eventos`, `feature/busqueda`). |
| `hotfix/[nombre]` | Correcciones urgentes directamente sobre `main`. |

**Convenciones de commits:** Prefijos semánticos: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`.

---

## 6. METODOLOGÍA Y PLANIFICACIÓN (IL 1.4)

### 6.1 Ciclo de Vida del Software

**Ciclo de vida seleccionado: Incremental (con iteraciones Scrum)**

**Justificación:** El modelo incremental es el más adecuado para eMeet porque:
- El sistema se puede descomponer en módulos funcionales independientes que agregan valor por separado (autenticación, eventos, búsqueda, social).
- Cada incremento produce un entregable funcional que puede ser validado por el docente y el equipo antes de avanzar al siguiente.
- Permite adaptarse a cambios en los requerimientos durante el semestre sin descartar el trabajo realizado.
- La complejidad del proyecto (media-alta) no justifica un modelo espiral completo, pero sí requiere más estructura que un modelo lineal cascada.

Se descarta el modelo **Cascada** porque los requerimientos pueden evolucionar durante el desarrollo. Se descarta el modelo **Espiral** por la sobrecarga de análisis de riesgos en cada iteración, innecesaria para un equipo de 3 personas.

### 6.2 Marco de Trabajo Ágil

**Marco seleccionado: Scrum adaptado a equipo pequeño**

**Roles:**
- **Product Owner:** Francisco Levipil — Prioriza el backlog y define los criterios de aceptación de cada historia.
- **Scrum Master:** Francisco Levipil — Facilita las ceremonias y elimina impedimentos.
- **Development Team:** Daniel Bravo + Antonio Vivar (+ Francisco en modelado de datos).

**Sprints:** Quincenales (2 semanas por sprint), con revisión al final de cada uno.

**Ceremonias:**

| Ceremonia | Frecuencia | Participantes | Propósito |
|---|---|---|---|
| **Sprint Planning** | Inicio de cada sprint (quincenal) | Todos | Definir objetivos, seleccionar ítems del backlog y asignar tareas |
| **Daily Stand-up** (adaptado) | 2-3 veces/semana | Todos | Sincronizar avances, identificar bloqueos |
| **Sprint Review** | Fin de cada sprint | Todos + docente (cuando aplique) | Demostrar lo construido, validar con criterios de aceptación |
| **Sprint Retrospective** | Fin de cada sprint | Todos | Identificar mejoras en el proceso para el siguiente sprint |

**Herramientas de gestión:**
- **GitHub:** Control de versiones, Issues para tareas, Pull Requests para revisión de código.
- **Trello / GitHub Projects:** Tablero Kanban (Backlog → En Progreso → En Revisión → Hecho).
- **Postman:** Pruebas de endpoints de la API.
- **WhatsApp / Discord:** Comunicación informal y coordinación diaria.

### 6.3 Planificación Semestral (Carta Gantt)

| Actividad | Responsable | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 | S10 | S11 | S12 | S13 | S14 | S15 | S16 |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Levantamiento y análisis de requerimientos | Francisco + equipo | ██ | ██ | | | | | | | | | | | | | | |
| Diseño funcional, UX y wireframes | Daniel + Francisco | | ██ | ██ | ██ | | | | | | | | | | | | |
| Modelado BD y arquitectura técnica | Francisco + Antonio | | | ██ | ██ | ██ | | | | | | | | | | | |
| Desarrollo: Autenticación, perfiles y roles | Antonio + Daniel | | | | ██ | ██ | ██ | | | | | | | | | | |
| Desarrollo: Locales, eventos y dashboard | Antonio + Daniel | | | | | ██ | ██ | ██ | ██ | | | | | | | | |
| Búsqueda, geolocalización y filtros | Daniel + Antonio | | | | | | ██ | ██ | ██ | ██ | ██ | | | | | | |
| Módulo social: asistencia y grupos | Antonio + Daniel | | | | | | | ██ | ██ | ██ | ██ | ██ | | | | | |
| Pruebas, QA, documentación y ajustes | Daniel (QA) + equipo | | | | | | | | | ██ | ██ | ██ | ██ | ██ | ██ | | |
| Despliegue, demo y presentación final | Equipo completo | | | | | | | | | | | ██ | ██ | ██ | ██ | ██ | ██ |

**Hitos principales:**

| Hito | Semana | Descripción |
|---|---|---|
| **Hito 1** | S3 | Informe de Avance N°1 entregado (Estrategia y Conceptualización) |
| **Hito 2** | S6 | Módulo de autenticación y perfiles funcionando (con tests básicos) |
| **Hito 3** | S10 | Core del sistema: Feed + búsqueda + geolocalización integrados |
| **Hito 4** | S13 | Sistema completo con módulo social y pruebas integrales |
| **Hito 5** | S16 | Presentación final con demo en vivo y documentación entregada |

---

## 7. MECANISMOS DE CONTROL Y CALIDAD

### 7.1 Certificación de Avances

El equipo implementará los siguientes mecanismos para validar que lo construido es correcto:

1. **Revisión quincenal con el docente:** Al final de cada Sprint (cada 2 semanas), se presentará la funcionalidad desarrollada en el sprint. El criterio de aceptación es que la funcionalidad cumple los requerimientos definidos en la planificación y es demostrable en vivo.

2. **Pull Requests obligatorios:** Todo código que se integra a la rama `develop` debe pasar por un Pull Request revisado por al menos otro integrante del equipo. Se revisa: funcionamiento, legibilidad y ausencia de errores conocidos.

3. **Checklist de criterios de aceptación por historia de usuario:** Antes de marcar una tarea como "Hecho" en el tablero Kanban, se verifica que cumple los criterios definidos en el Sprint Planning (ej. "El usuario puede registrarse con email y contraseña, y al iniciar sesión se muestra su nombre en el perfil").

4. **Demo funcional al docente:** En los hitos 2, 3, 4 y 5 se realizará una demostración funcional del sistema en el entorno de producción (URL pública en Vercel), sin necesidad de ejecutarlo localmente.

5. **Repositorio como evidencia de avance:** El historial de commits en GitHub documenta el progreso real del proyecto. Los Issues y el tablero Kanban reflejan el estado actualizado del trabajo.

### 7.2 Plan de Pruebas Inicial

#### Pruebas Unitarias

| Módulo | Qué se prueba | Herramienta | Responsable |
|---|---|---|---|
| Lógica de filtros de búsqueda | Que `filterEvents(query, category)` retorna solo los eventos que coinciden con ambos criterios | Vitest (o Jest) | Daniel |
| Lógica de autenticación (backend) | Que `hashPassword` genera hash diferente al input y que `comparePassword` valida correctamente | Jest / Mocha | Antonio |
| Validación de formularios | Que el formulario de login rechaza email inválido y contraseña corta, mostrando el mensaje correcto | Vitest + Testing Library | Daniel |
| Formato de datos (helpers) | Que `formatPrice(0)` retorna "Gratis", `formatDate(iso)` retorna fecha legible | Vitest | Daniel |
| Modelo de evento (backend) | Que un evento sin campo `title` falla la validación del esquema Mongoose | Jest | Antonio |

#### Pruebas de Integración

| Escenario | Qué se prueba | Herramienta | Responsable |
|---|---|---|---|
| Registro + Login de usuario | POST `/api/auth/register` crea usuario → POST `/api/auth/login` retorna token JWT válido | Postman / Supertest | Antonio |
| Creación de evento por administrador | Con token de admin, POST `/api/events` crea evento y GET `/api/events/:id` lo retorna correctamente | Postman / Supertest | Antonio |
| Filtro geoespacial | GET `/api/events?lat=-33.43&lng=-70.63&radius=5` retorna solo eventos dentro del radio de 5 km | Postman | Antonio + Daniel |
| Protección de rutas | GET `/api/events` sin token retorna 401. Con token válido retorna 200 y lista de eventos. | Postman / Supertest | Antonio |
| Flujo completo en frontend | Login → Feed carga eventos → Swipe right → Guardados muestra el evento → Profile refleja el contador | Prueba manual en navegador | Daniel |
| Confirmación de asistencia | Usuario confirma asistencia a evento → Contador de asistentes aumenta en 1 → Se refleja en la vista de detalle | Postman + navegador | Daniel + Antonio |

**Cobertura objetivo para MVP:** ≥ 60% de cobertura en funciones críticas del backend (autenticación, filtros, CRUD de eventos). Las pruebas de integración cubrirán los 5 flujos principales del sistema.

**Criterio de aceptación de pruebas:** Todos los tests unitarios pasan (0 fallos) antes de cada merge a `develop`. Las pruebas de integración se ejecutan al cierre de cada sprint para verificar que la integración frontend-backend es correcta.

---

*Documento preparado por el equipo eMeet — Taller Aplicado de Programación (TPY1101) — 2025*  
*Integrantes: Daniel Bravo (16.809.451-5) · Francisco Levipil (21.177.522-K) · Antonio Vivar (16.375.202-6)*
