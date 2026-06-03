export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'eMeet Profile API',
    version: '1.0.0',
    description: 'Gestión del perfil del usuario autenticado',
  },
  servers: [{ url: '/profile', description: 'Profile service' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
      Profile: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          bio: { type: 'string' },
          location: { type: 'string' },
          interests: { type: 'array', items: { type: 'string' } },
          avatar_url: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['user', 'locatario', 'admin'] },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/': {
      get: {
        tags: ['Perfil'],
        summary: 'Obtener perfil del usuario autenticado',
        responses: {
          200: { description: 'Perfil', content: { 'application/json': { schema: { $ref: '#/components/schemas/Profile' } } } },
          404: { description: 'Perfil no encontrado' },
          500: { description: 'Error del servidor' },
        },
      },
      patch: {
        tags: ['Perfil'],
        summary: 'Actualizar perfil (campos opcionales)',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  bio: { type: 'string' },
                  location: { type: 'string' },
                  interests: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Perfil actualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Profile' } } } },
          400: { description: 'Sin campos para actualizar' },
        },
      },
    },
    '/avatar': {
      post: {
        tags: ['Perfil'],
        summary: 'Subir avatar del usuario (base64)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fileBase64'],
                properties: {
                  fileBase64: { type: 'string', description: 'Imagen codificada en base64' },
                  contentType: { type: 'string', default: 'image/jpeg', enum: ['image/jpeg', 'image/png'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Avatar subido', content: { 'application/json': { schema: { type: 'object', properties: { avatarUrl: { type: 'string' } } } } } },
          400: { description: 'fileBase64 faltante' },
          500: { description: 'Error subiendo avatar' },
        },
      },
    },
    '/stats': {
      get: {
        tags: ['Perfil'],
        summary: 'Estadísticas del perfil (seguidores)',
        responses: {
          200: {
            description: 'Estadísticas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { followersCount: { type: 'integer', nullable: true } },
                },
              },
            },
          },
        },
      },
    },
  },
}
