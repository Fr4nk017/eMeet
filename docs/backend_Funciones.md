Funcionalidades Específicas

Aquí desglosamos el proceso en funcionalidades técnicas concretas para el desarrollo Fullstack.

A. Módulo de Usuario y Autenticación

· Registro/Login: Con email/contraseña y, idealmente, con redes sociales (Google, Facebook) para facilitar la creación de comunidad.
· Perfil de Usuario:
  · Información básica: Nombre, foto, edad (opcional).
  · Configuración de Gustos: Checkboxes o etiquetas (tags) para seleccionar sus intereses (Música, Comida, Tipo de Local, Ambiente). Este es un punto crítico para el filtrado.
  · Configuración de privacidad (quién puede ver a qué eventos asistes).
· Gestión de Amigos/Contactos (Opcional): La parte social se puede potenciar pudiendo agregar amigos y ver a qué eventos van ellos directamente.

B. Módulo de Locales y Eventos (Para Administradores de Local)

· Registro de Local: Creación de perfil para el negocio con nombre, dirección, teléfono, descripción, fotos, tipo de cocina/música, horario general.
· Geolocalización: Almacenar las coordenadas exactas del local (latitud, longitud) a partir de su dirección.
· Creación y Gestión de Eventos (CRUD):
  · Título, descripción, tipo de evento (concierto, after-office, cena temática).
  · Fecha, hora de inicio y fin.
  · Etiquetas de Gustos: El local puede etiquetar su evento con los mismos gustos que usan los usuarios (ej: #Jazz, #ComidaItaliana) para que sea encontrable.
  · Capacidad máxima (opcional).
  · Precio (si aplica) o enlace a venta de entradas externa.
  · Subida de imágenes del evento.
· Dashboard del Local:
  · Ver listado de sus eventos, pasados y futuros.
  · Ver estadísticas de interés: número de usuarios que han marcado "Asistiré", número de "Grupos de Asistencia" creados, feedback recibido.

C. Módulo Principal de Búsqueda y Descubrimiento (Core de la App)

· Feed Principal / Mapa Interactivo: Vista inicial con eventos cercanos. Se puede alternar entre vista de lista y vista de mapa (usando librerías como Leaflet o Google Maps API).
· Sistema de Filtros Avanzado (Backend y Frontend):
  · Por Distancia: "A 1km", "A 5km", "Toda la ciudad".
  · Por Fecha: "Hoy", "Este fin de semana", "Próximos 7 días".
  · Por Gustos: Checkboxes para seleccionar uno o varios gustos (ej: Música Electrónica + Coctelería). El sistema debe devolver eventos que cumplan con al menos uno de los gustos (o todos, según diseño).
  · Filtro por Tamaño de Grupo:
    · Input para que el usuario indique el tamaño de su grupo (ej: 2 personas, 4 personas, +10 personas).
    · El motor de búsqueda priorizará o filtrará eventos donde ya existan "Grupos de Asistencia" de un tamaño similar, o que por su naturaleza (ej: una cena romántica) sean aptos para grupos pequeños.
· Detalle del Evento:
  · Toda la información del evento (descripción, fecha, local, mapa de ubicación).
  · Sección Social: Lista de usuarios y Grupos de Asistencia que han confirmado.
  · Botones de Acción:
    · "Asistiré" (a nivel individual).
    · "Crear Grupo para este Evento": Permite al usuario crear un grupo público con un nombre y un número máximo de integrantes (ej: "Mesa de 4 para la cena de sushi").
    · "Solicitar Unirse a Grupo": Para unirse a uno de los grupos existentes (sujeto a aprobación del creador del grupo, opcional).
  · Botón "Compartir" el evento en redes sociales o por WhatsApp.

D. Módulo de Interacción Social (La "Red Social")

· Sistema de Grupos de Asistencia:
  · Creación de grupo asociado a un evento específico.
  · Perfil del grupo: Nombre, creador, miembros actuales, límite de miembros.
  · Funcionalidad para que el creador pueda aceptar o rechazar solicitudes de unión.
  · Chat interno del grupo (opcional, pero muy interesante) para que los miembros se coordinen antes del evento.
· Notificaciones (en tiempo real idealmente, con WebSockets):
  · A un usuario cuando alguien solicita unirse a su grupo.
  · A un usuario cuando su solicitud para unirse a un grupo es aceptada.
  · Recordatorios de eventos a los que va a asistir.
  · Notificaciones a los administradores de locales sobre nuevas confirmaciones de asistencia.

E. Módulo de Administración Global

· Panel para el Super Admin:
  · Gestión de usuarios (bloquear, eliminar).
  · Gestión de locales (verificar, aprobar, suspender).
  · Moderación de eventos y grupos (por si hay contenido inapropiado).
  · Visualización de estadísticas generales de la plataforma (usuarios activos, eventos creados, etc.).

Resumen para tu Profesor

Puedes presentar esto como:

1. Introducción: Nombre del proyecto y concepto.
2. Modelo de Negocio: Cómo la aplicación planea ser sostenible.
3. Actores y sus Historias de Usuario (User Stories):
   · Como usuario, quiero filtrar eventos por mis gustos musicales para encontrar planes que realmente me interesen.
   · Como usuario, quiero buscar planes para un grupo de 4 personas para asegurarme de que no iré solo a un lugar donde todos van en pareja.
   · Como dueño de un pub, quiero publicar mis eventos de música en vivo para atraer más clientes.
4. Funcionalidades Clave: Lista de los módulos y características más importantes, destacando el valor diferencial (el filtro por gustos y la agrupación por tamaño de compañía).
