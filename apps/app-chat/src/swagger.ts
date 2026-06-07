export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'eMeet Chat API',
    version: '1.0.0',
    description: 'Salas de chat, mensajes y gestión de lectura',
  },
  servers: [{ url: '/chat', description: 'Chat service' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
      Room: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          eventTitle: { type: 'string' },
          eventImageUrl: { type: 'string', nullable: true },
          eventAddress: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['active', 'expired', 'deleted'] },
          expiresAt: { type: 'string', format: 'date-time', nullable: true },
          memberCount: { type: 'integer' },
          lastMessage: { type: 'object', nullable: true },
          unreadCount: { type: 'integer' },
        },
      },
      Message: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          roomId: { type: 'string' },
          senderId: { type: 'string', format: 'uuid' },
          senderName: { type: 'string' },
          senderAvatar: { type: 'string', nullable: true },
          text: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      Member: {
        type: 'object',
        properties: {
          userId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          avatarUrl: { type: 'string', nullable: true },
          joinedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/cleanup': {
      post: {
        tags: ['Administración'],
        summary: 'Expirar salas cuyo expires_at ya pasó (cron job)',
        parameters: [{ name: 'x-cleanup-secret', in: 'header', schema: { type: 'string' } }],
        responses: {
          200: { description: 'Limpieza completada', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, expired: { type: 'integer' } } } } } },
          401: { description: 'No autorizado' },
        },
      },
    },
    '/rooms': {
      get: {
        tags: ['Salas'],
        summary: 'Listar salas del usuario autenticado',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Lista de salas',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Room' } } } },
          },
          401: { description: 'No autorizado' },
        },
      },
    },
    '/rooms/{id}/join': {
      post: {
        tags: ['Salas'],
        summary: 'Unirse o crear una sala de chat',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'ID del evento / sala' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['eventTitle'],
                properties: {
                  eventTitle: { type: 'string' },
                  eventImageUrl: { type: 'string' },
                  eventAddress: { type: 'string' },
                  expiresAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Unido a la sala', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } } },
          400: { description: 'eventTitle faltante' },
          500: { description: 'Error del servidor' },
        },
      },
    },
    '/rooms/{id}/leave': {
      delete: {
        tags: ['Salas'],
        summary: 'Salir de una sala de chat',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Salió de la sala' },
          403: { description: 'No es miembro' },
          500: { description: 'Error del servidor' },
        },
      },
    },
    '/rooms/{id}/members': {
      get: {
        tags: ['Salas'],
        summary: 'Listar miembros de una sala',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Lista de miembros', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Member' } } } } },
          403: { description: 'No es miembro' },
        },
      },
    },
    '/rooms/{id}/messages': {
      get: {
        tags: ['Mensajes'],
        summary: 'Obtener mensajes de una sala (paginación por cursor)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 100 } },
          { name: 'before', in: 'query', schema: { type: 'string', format: 'date-time' }, description: 'Cursor: obtener mensajes anteriores a este timestamp' },
        ],
        responses: {
          200: { description: 'Mensajes (orden cronológico ascendente)', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Message' } } } } },
          403: { description: 'No es miembro' },
        },
      },
      post: {
        tags: ['Mensajes'],
        summary: 'Enviar un mensaje a una sala',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } } },
        },
        responses: {
          201: { description: 'Mensaje enviado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } } },
          400: { description: 'Texto vacío' },
          403: { description: 'No es miembro' },
          410: { description: 'Sala cerrada o expirada' },
        },
      },
    },
    '/rooms/{id}/read': {
      post: {
        tags: ['Lectura'],
        summary: 'Marcar sala como leída hasta ahora',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Estado de lectura actualizado' },
          403: { description: 'No es miembro' },
        },
      },
    },
    '/rooms/{id}/unread': {
      get: {
        tags: ['Lectura'],
        summary: 'Obtener conteo de mensajes no leídos en una sala',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Conteo de no leídos',
            content: { 'application/json': { schema: { type: 'object', properties: { roomId: { type: 'string' }, unread: { type: 'integer' } } } } },
          },
        },
      },
    },
    '/unread': {
      get: {
        tags: ['Lectura'],
        summary: 'Conteo de no leídos por sala (todas las salas del usuario)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Array de conteos por sala',
            content: { 'application/json': { schema: { type: 'array', items: { type: 'object', properties: { roomId: { type: 'string' }, unread: { type: 'integer' } } } } } },
          },
        },
      },
    },
  },
}
