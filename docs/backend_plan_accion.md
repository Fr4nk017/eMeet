Plan de Inicio: Proyecto Emmet

Fase 0: Configuración Inicial (La Base)

Objetivo: Tener el entorno de desarrollo listo y las tecnologías base funcionando.

· Definir Stack Tecnológico (Ejemplo):
  · Frontend: React.js + Vite (para rapidez) + Tailwind CSS (para estilos rápidos).
  · Backend: Node.js + Express.
  · Base de Datos: MongoDB (por su flexibilidad con las "etiquetas de gustos") o PostgreSQL (si prefieres SQL). Para empezar, MongoDB es más ágil.
  · Autenticación: JWT (JSON Web Tokens) o Passport.js.
  · Mapas: Leaflet (open source) o Google Maps API (más potente pero con posible costo futuro).
· Tareas:
  · Crear repositorio en GitHub.
  · Inicializar proyecto backend ( npm init, estructurar carpetas: models, routes, controllers, config ).
  · Inicializar proyecto frontend ( npm create vite@latest ).
  · Conectar backend a la base de datos (MongoDB Atlas para no instalar localmente).
  · Crear un script de prueba ("Hola Mundo" desde el backend y que el frontend lo consuma).

Fase 1: Corazón de la App - Usuarios y Locales (MVP)

Objetivo: Tener los dos tipos de usuario base y la creación de eventos funcional.

Sprint 1.1: Autenticación y Perfiles

· Modelos de Datos (Backend):
  · Modelo User:
    · nombre (String)
    · email (String, único)
    · password (String, encriptado)
    · ubicacion (Objeto: { type: 'Point', coordinates: [lng, lat] } ) - Importante para geolocalización.
    · gustos (Array de Strings, ej: ['musica-electronica', 'jazz', 'comida-mexicana'])
    · rol (String: 'usuario' o 'local_admin')
  · Modelo Local:
    · nombreLocal (String)
    · direccion (String)
    · coordenadas (Objeto: { type: 'Point', coordinates: [lng, lat] } )
    · adminId (Referencia al User con rol 'local_admin')
    · telefono (String, opcional)
    · descripcion (String)
· Endpoints de Autenticación (Backend):
  · POST /api/auth/register (crea usuario con rol 'usuario' por defecto).
  · POST /api/auth/register-local (crea usuario con rol 'local_admin' y su perfil de local vinculado).
  · POST /api/auth/login (devuelve un JWT).
· Protección de Rutas: Middleware para verificar el JWT en rutas privadas.
· Frontend Básico:
  · Página de Registro/Login con formularios.
  · Al hacer login, redirigir a un dashboard simple según el rol.

Sprint 1.2: Creación y Listado de Eventos (Funcionalidad Principal)

· Modelo Event (Backend):
  · nombre (String)
  · descripcion (String)
  · fechaHora (Date)
  · localId (Referencia al Local que lo crea)
  · etiquetas (Array de Strings, ej: ['jazz', 'cena'] ) - ¡Aquí conectamos con los gustos del usuario!
  · asistentes (Array de IDs de User) - Lista simple de usuarios que asistirán.
· Endpoints de Eventos (Backend - Protegidos):
  · POST /api/eventos (Solo para 'local_admin'): Crear un nuevo evento.
  · GET /api/eventos (Público/Autenticado): Listar eventos (por ahora todos).
  · GET /api/eventos/:id (Público/Autenticado): Ver detalle de un evento.
  · POST /api/eventos/:id/asistir (Autenticado): Para que un usuario marque que asistirá (añade su ID al array asistentes).
· Frontend Básico:
  · Formulario para que los local_admin creen eventos (solo visible para ellos).
  · Página de inicio (/) que liste todos los eventos en tarjetas (imagen placeholder, nombre, fecha, local).
  · Página de detalle del evento (/evento/:id) que muestre toda la info y un botón "Asistiré".

Fin del MVP Funcional: En este punto ya tienes una aplicación donde los locales pueden publicar eventos y los usuarios pueden verlos y apuntarse. ¡Ya es algo que puedes mostrar!

Fase 2: El Valor Diferencial - Búsqueda Inteligente y Social (Versión 1.0)

Objetivo: Implementar las características que hacen única a Emmet.

Sprint 2.1: Geolocalización y Búsqueda por Cercanía

· Backend:
  · Modificar el endpoint GET /api/eventos para que acepte la ubicación del usuario (?lng=...&lat=...) y una distancia máxima (?maxDist=5000 para 5km).
  · Usar el operador $geoNear de MongoDB (o consultas espaciales en PostgreSQL) para devolver SOLO los eventos de locales dentro de ese radio.
· Frontend:
  · Al cargar la app, pedir permiso de ubicación al usuario.
  · Si concede permiso, enviar esas coordenadas en las peticiones de búsqueda.
  · Si no concede, mostrar un campo para que escriba una dirección y la conviertas a coordenadas (geocoding).
  · Añadir un slider o selector de distancia en la interfaz (ej: "A 1km", "A 5km").

Sprint 2.2: Filtrado por Gustos y Tamaño de Grupo

· Backend:
  · Modificar GET /api/eventos para aceptar ?gustos=... (array) y ?tamanoGrupo=... (número).
  · Filtro por Gustos: Buscar eventos donde sus etiquetas tengan al menos una coincidencia con los gustos enviados.
  · Filtro por Tamaño de Grupo: ¡Aquí viene la lógica especial!
    · Necesitamos un nuevo modelo GrupoAsistencia.
    · Modelo GrupoAsistencia:
      · nombreGrupo (String)
      · eventoId (Referencia a Event)
      · creadorId (Referencia a User)
      · miembros (Array de IDs de User)
      · tamanoMaximo (Number, ej: 4)
      · tamanoActual (Number, se calcula del array miembros)
    · Endpoints para crear grupos y unirse.
    · En la búsqueda, si el usuario envía tamanoGrupo: 4, podríamos priorizar eventos que ya tengan grupos creados con tamanoActual < tamanoMaximo y que su tamanoMaximo sea cercano a 4.
· Frontend:
  · Página de perfil para que el usuario seleccione sus gustos (con checkboxes o tags bonitos).
  · En la página de inicio, añadir una barra de filtros lateral o superior:
    · Selector múltiple de "Gustos" (basado en los gustos del usuario o en todos disponibles).
    · Input numérico para "¿Cuántos son?" (tamaño del grupo).
  · En el detalle del evento:
    · Mostrar la lista de asistentes individuales.
    · Nueva Sección: "Grupos para este evento" con botones para "Crear Grupo" y "Solicitar unirme".
    · Si el usuario crea un grupo, un pequeño formulario para poner nombre y tamaño máximo.

Fase 3: Pulido y Detalles (Mejoras)

Objetivo: Hacer la app más usable, atractiva y robusta.

· Notificaciones en tiempo real (Opcional pero Genial): Usar Socket.io para que cuando alguien se una a tu grupo, te llegue una notificación al instante.
· Sistema de Amigos: Poder agregar otros usuarios y ver en el feed "Tus amigos irán a..." para dar confianza.
· Mapa Interactivo: Reemplazar la lista de eventos en la home con un mapa que muestre "pins" de los eventos cercanos.
· Subida de Imágenes: Usar Cloudinary o similar para que los locales puedan subir fotos de sus eventos.
· Diseño y UX: Mejorar la interfaz con Tailwind, hacerla responsive para móviles (¡casi todos buscarán planes desde el celular!).

---

Cronograma Sugerido (para 8-10 semanas)

· Semanas 1-2: Fase 0 y Fase 1.1 (Autenticación y Perfiles). Base sólida.
· Semanas 3-4: Fase 1.2 (Eventos y Asistencia). MVP listo.
· Semanas 5-6: Fase 2.1 y 2.2 (Geolocalización y Filtros). Corazón de la idea.
· Semana 7: Fase 2.2 (Lógica de Grupos). Funcionalidad social.
· Semana 8: Fase 3 (Pulido, pruebas y despliegue). App presentable.
