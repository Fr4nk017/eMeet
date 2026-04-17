---
name: expert-developer-nextjs14-fullstack-emeet
description: 'Workflow senior full-stack para proyectos Next.js 14 App Router con React 18, TypeScript estricto, Tailwind, Framer Motion, Supabase, Prisma, Google Places y Vercel. Usar al implementar features, refactors, reviews, decisiones tecnicas, route handlers seguros, flujos tipados y UI lista para produccion en este workspace frontend de eMeet, manteniendo la logica y arquitectura backend actual.'
argument-hint: 'Describe la tarea, rutas/archivos afectados, requisitos de auth, fuente de datos y expectativa de UI.'
user-invocable: true
---

# Expert Developer - Next.js 14 Full-Stack App

## Resultado
Producir implementaciones seguras, tipadas y mantenibles para este proyecto con decisiones server-first, validaciones explicitas de auth, minimo runtime en cliente y limites claros entre UI y logica.

## Usa Este Skill Cuando
- Construyas o refactorices features en Next.js 14 App Router.
- Debas decidir entre Server Components, Client Components, Server Actions y Route Handlers.
- Integres Supabase, Prisma o Google Places con reglas de seguridad estrictas.
- Implementes UI responsive con Tailwind y animaciones opcionales con Framer Motion.
- Hagas revision de calidad antes de merge.

## Entradas Requeridas
- Objetivo de negocio y criterios de aceptacion.
- Rutas y carpetas objetivo.
- Requisitos de auth (publica, protegida, por rol).
- Fuente(s) de datos: Prisma, Supabase, API externa.
- Expectativas de rendering y cache (SSR, SSG, ISR, streaming).

## Restricciones Del Proyecto
- Priorizar el workspace frontend: eMeet_frontend.
- TypeScript con strict: true. Evitar any.
- Servidor por defecto. Usar use client solo cuando sea necesario.
- No duplicar logica de negocio; extraer hooks/utils si se repite mas de 2 veces.
- Manejo explicito de errores y validacion de entradas.
- Mantener la logica actual del backend.
- No cambiar la arquitectura vigente del backend salvo solicitud explicita del usuario.

## Matriz De Decisiones

### 1) Runtime Boundary
- Si el codigo necesita eventos del DOM, useState, useEffect, APIs del navegador o handlers de gestos -> Client Component.
- En caso contrario -> Server Component.
- Si una mutacion debe ejecutarse desde UI con confianza del servidor -> Server Action o Route Handler protegido.

### 2) Data Fetching Strategy
- Datos ligados a usuario/sesion y frescos por request -> SSR.
- Contenido mayormente estatico -> SSG.
- Frescura por ventana de tiempo aceptable -> ISR (revalidate).
- Secciones lentas e independientes -> streaming con limites de Suspense/loading.

### 3) API Access Boundary
- Google Places -> wrapper solo servidor en lib/google-places/.
- Supabase service role -> cliente solo servidor.
- Supabase anon -> cliente browser cuando sea necesario para interacciones del cliente.

### 4) Security Branching
- Ruta/handler protegido -> validar sesion (getUser()) primero.
- Operacion sensible -> sanitizar input y aplicar autorizacion del lado servidor.
- Recurso privado en Storage -> URLs firmadas.

## Flujo De Implementacion
1. Definir contrato de la feature:
   - Entradas, salidas, estados de error, loading y vacio.
   - Contratos de tipos en src/types/ (o tipos locales si el alcance es muy acotado).
2. Elegir modelo de componentes:
   - Comenzar con Server Component.
   - Agregar use client solo para hojas interactivas.
3. Construir capa de datos:
   - Prisma: select/include explicitos, usar $transaction() para escrituras de multiples pasos.
   - Supabase: usar cliente servidor/cliente segun runtime.
   - APIs externas: wrappers tipados, nunca exponer secretos.
4. Agregar auth/autorizacion:
   - Validar identidad en puntos de entrada del servidor.
   - Retornar rutas explicitas 401/403/404/500 cuando aplique.
5. Construir capa de UI:
   - Clases Tailwind mobile-first con breakpoints responsive.
   - Usar cn() para clases condicionales.
   - Mantener la logica de negocio fuera del JSX; mover a hooks/utils.
6. Agregar animacion cuando aporte valor UX:
   - Variants reutilizables de Framer Motion fuera de los componentes.
   - AnimatePresence para transiciones de entrada/salida.
7. Tratar errores de forma explicita:
   - Ramas try/catch tipadas.
   - Mensajes seguros para usuario + detalles en logs para debugging.
8. Validar quality gates:
   - Typecheck en verde.
   - Lint en verde.
   - Sin bypass de auth, sin secretos filtrados, sin logica duplicada.
   - Sin modificar arquitectura backend existente.

## Contrato De Salida Para Generacion De Codigo
Al generar o editar codigo, siempre:
- Indicar si el archivo es Server Component o Client Component.
- Mostrar imports completos con rutas del proyecto.
- Incluir validacion de sesion para flujos protegidos.
- Usar tipado estricto de punta a punta.
- Incluir fragmento relevante de Prisma schema cuando la forma de datos lo requiera.
- Usar variants de Framer Motion cuando haya animacion no trivial.
- Usar cn() para composicion condicional de clases Tailwind.
- Preservar logica backend y evitar cambios arquitectonicos no solicitados.

## Checklist De Cierre
- Modelo de rendering correcto seleccionado (server-first).
- use client solo donde es necesario.
- Auth y autorizacion verificadas en limites de servidor.
- API keys externas nunca expuestas al navegador.
- Tipos exportados/reutilizados de forma consistente.
- Logica repetida extraida a hook/util.
- Estados de loading/error/vacio cubiertos.
- Comportamiento responsive validado en mobile y desktop.
- Sin cambios de arquitectura backend.

## Reglas Ante Ambiguedad
Si falta contexto clave, preguntar antes de asumir:
- Comportamiento UX esperado y edge cases.
- Reglas de ownership de datos y autorizacion.
- Objetivo de performance y estrategia de cache.
- Si el alcance incluye cambios backend y si son solo de logica sin tocar arquitectura.
