Documento de Requerimientos - Proyecto Emmet

Requerimientos Funcionales (RF)


Módulo 1: Autenticación y Gestión de Usuarios

ID Requerimiento Prioridad
RF-01 El sistema debe permitir el registro de nuevos usuarios con email y contraseña. Alta
RF-02 El sistema debe permitir el inicio de sesión con email y contraseña, devolviendo un token JWT. Alta
RF-03 El sistema debe permitir el registro de dos tipos de usuario: Usuario común y Administrador de local. Alta
RF-04 El sistema debe permitir a los usuarios comunes seleccionar sus gustos/preferencias (ej: música electrónica, jazz, comida mexicana) durante el registro o en su perfil. Alta
RF-05 El sistema debe permitir a los usuarios editar su perfil (nombre, foto, gustos, configuración de privacidad). Media
RF-06 El sistema debe permitir a los usuarios comunes guardar su ubicación actual o configurar una ubicación manualmente. Alta
RF-07 El sistema debe permitir a los administradores de local crear y gestionar el perfil de su negocio (nombre, dirección, descripción, horario, fotos). Alta

Módulo 2: Gestión de Locales y Eventos (Para Admin de Local)

ID Requerimiento Prioridad
RF-08 El sistema debe permitir a los administradores de local crear eventos asociados a su local. Alta
RF-09 Al crear un evento, el sistema debe solicitar: título, descripción, fecha y hora, etiquetas de gustos, capacidad máxima (opcional) y precio (opcional). Alta
RF-10 El sistema debe permitir a los administradores de local editar y eliminar sus propios eventos. Alta
RF-11 El sistema debe mostrar a los administradores de local un dashboard con sus eventos (pasados y futuros) y estadísticas básicas de asistentes. Media

Módulo 3: Búsqueda y Descubrimiento de Eventos (Core)

ID Requerimiento Prioridad
RF-12 El sistema debe mostrar al usuario un listado o mapa de eventos cercanos basados en su ubicación actual o configurada. Alta
RF-13 El sistema debe permitir filtrar eventos por distancia máxima (ej: 1km, 5km, 10km). Alta
RF-14 El sistema debe permitir filtrar eventos por fecha (hoy, este fin de semana, próximos 7 días, rango personalizado). Media
RF-15 El sistema debe permitir filtrar eventos por gustos/preferencias seleccionados por el usuario (ej: mostrar solo eventos de jazz). Alta
RF-16 El sistema debe permitir al usuario indicar el tamaño de su grupo (ej: "Somos 4 personas") y priorizar/mostrar eventos con grupos de tamaño similar. Alta
RF-17 El sistema debe mostrar una vista de detalle de cada evento con toda su información: descripción, local, fecha, mapa de ubicación, asistentes y grupos. Alta

Módulo 4: Interacción Social (Grupos y Asistencia)

ID Requerimiento Prioridad
RF-18 El sistema debe permitir a los usuarios marcar que asistirán a un evento individualmente. Alta
RF-19 El sistema debe permitir a los usuarios crear grupos de asistencia para un evento específico, indicando nombre del grupo y número máximo de integrantes. Alta
RF-20 El sistema debe permitir a otros usuarios solicitar unirse a un grupo de asistencia existente. Alta
RF-21 El sistema debe permitir al creador del grupo aceptar o rechazar solicitudes de unión. Media
RF-22 El sistema debe mostrar en el detalle del evento la lista de asistentes individuales y los grupos creados (con sus miembros actuales y cupo disponible). Alta
RF-23 El sistema debe enviar notificaciones (en la app) cuando un usuario es aceptado en un grupo o cuando alguien solicita unirse a un grupo del usuario. Media

Módulo 5: Administración Global

ID Requerimiento Prioridad
RF-24 El sistema debe contar con un panel de administrador general para gestionar usuarios (bloquear/eliminar). Baja
RF-25 El sistema debe permitir al administrador general gestionar locales (verificar, aprobar, suspender). Baja
RF-26 El sistema debe permitir al administrador general moderar eventos y grupos inapropiados. Baja

---

Requerimientos No Funcionales (RNF)

Los requerimientos no funcionales describen cómo debe ser el sistema en términos de calidad, restricciones y atributos.

1. Usabilidad (UX/UI)

ID Requerimiento Prioridad
RNF-01 La interfaz debe ser responsive, funcionando correctamente en dispositivos móviles, tablets y desktop. Alta
RNF-02 La aplicación debe ser intuitiva, permitiendo a un usuario nuevo realizar las tareas principales (buscar un evento, unirse a un grupo) en menos de 2 minutos sin ayuda. Media
RNF-03 Los tiempos de carga de las páginas principales no deben exceder los 3 segundos en conexiones de banda ancha promedio. Media

2. Rendimiento y Escalabilidad

ID Requerimiento Prioridad
RNF-04 El sistema debe ser capaz de manejar al menos 100 usuarios concurrentes sin degradación significativa del rendimiento (para la versión inicial). Media
RNF-05 Las consultas de búsqueda por ubicación y filtros deben responder en menos de 2 segundos incluso con 10,000 eventos en la base de datos. Alta
RNF-06 La aplicación debe estar preparada para escalar horizontalmente (añadir más servidores) en el futuro. Baja

3. Seguridad

ID Requerimiento Prioridad
RNF-07 Las contraseñas de los usuarios deben almacenarse encriptadas (usando bcrypt o similar). Alta
RNF-08 Todas las rutas privadas deben estar protegidas mediante autenticación JWT, verificando el token en cada petición. Alta
RNF-09 El sistema debe implementar validaciones en el backend para evitar inyecciones SQL/NoSQL y ataques XSS. Alta
RNF-10 Las comunicaciones entre cliente y servidor deben realizarse mediante HTTPS (en producción). Alta

4. Disponibilidad y Fiabilidad

ID Requerimiento Prioridad
RNF-11 El sistema debe tener una disponibilidad objetivo del 99% en horario de evaluación (sin contar mantenimientos programados). Media
RNF-12 El sistema debe manejar errores gracefulmente, mostrando mensajes amigables al usuario y registrando los errores en el backend para depuración. Alta

5. Mantenibilidad y Código

ID Requerimiento Prioridad
RNF-13 El código debe seguir una arquitectura limpia y estar organizado (MVC o similar) para facilitar futuras modificaciones. Alta
RNF-14 El código debe estar comentado en las partes críticas y seguir convenciones de nomenclatura consistentes. Media
RNF-15 El proyecto debe incluir un archivo README.md con instrucciones claras para instalar y ejecutar la aplicación en entorno de desarrollo. Alta

6. Tecnológicos (Stack)

ID Requerimiento Prioridad
RNF-16 El frontend debe desarrollarse con React.js. Alta (si es requisito del curso)
RNF-17 El backend debe desarrollarse con Node.js y Express. Alta (si es requisito del curso)
RNF-18 La base de datos debe ser MongoDB (por flexibilidad con etiquetas) o PostgreSQL (por robustez). A definir. Alta

---

Matriz de Trazabilidad (Ejemplo)

Historia de Usuario Requerimientos relacionados
"Como usuario, quiero buscar eventos cerca de mí" RF-12, RF-13, RNF-05
"Como usuario, quiero filtrar por mis gustos musicales" RF-04, RF-15
"Como usuario, quiero ir con un grupo de 4 personas" RF-16, RF-19, RF-20, RF-21
"Como admin de local, quiero publicar un evento" RF-03, RF-08, RF-09
