export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'eMeet Admin API',
    version: '1.0.0',
    description: 'Gestión de usuarios, eventos y estadísticas (solo administradores)',
  },
  servers: [{ url: '/admin', description: 'Admin service' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['user', 'locatario', 'admin'] },
          is_banned: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Event: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          location: { type: 'string' },
          date: { type: 'string', format: 'date-time' },
          created_by: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/users': {
      get: {
        tags: ['Usuarios'],
        summary: 'Listar todos los usuarios',
        responses: {
          200: {
            description: 'Lista de usuarios',
            content: { 'application/json': { schema: { type: 'object', properties: { users: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } } },
          },
          401: { description: 'No autorizado' },
          403: { description: 'Acceso denegado' },
        },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['Usuarios'],
        summary: 'Obtener usuario por ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Usuario encontrado', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } },
          404: { description: 'No encontrado' },
        },
      },
      put: {
        tags: ['Usuarios'],
        summary: 'Actualizar rol o ban de un usuario',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  role: { type: 'string', enum: ['user', 'locatario', 'admin'] },
                  is_banned: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Usuario actualizado', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' }, message: { type: 'string' } } } } } },
          400: { description: 'Sin campos para actualizar' },
        },
      },
      delete: {
        tags: ['Usuarios'],
        summary: 'Eliminar usuario',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Usuario eliminado', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
          500: { description: 'Error del servidor' },
        },
      },
    },
    '/events': {
      get: {
        tags: ['Eventos'],
        summary: 'Listar todos los eventos',
        responses: {
          200: {
            description: 'Lista de eventos',
            content: { 'application/json': { schema: { type: 'object', properties: { events: { type: 'array', items: { $ref: '#/components/schemas/Event' } }, total: { type: 'integer' } } } } },
          },
        },
      },
    },
    '/events/{id}': {
      delete: {
        tags: ['Eventos'],
        summary: 'Eliminar un evento',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Evento eliminado', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
          500: { description: 'Error del servidor' },
        },
      },
    },
    '/statistics': {
      get: {
        tags: ['Estadísticas'],
        summary: 'Estadísticas generales de la plataforma',
        responses: {
          200: {
            description: 'Estadísticas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    statistics: {
                      type: 'object',
                      properties: {
                        totalUsers: { type: 'integer' },
                        totalEvents: { type: 'integer' },
                        totalLikes: { type: 'integer' },
                        bannedUsers: { type: 'integer' },
                        timestamp: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}
