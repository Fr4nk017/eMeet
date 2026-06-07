export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'eMeet Events API',
    version: '1.0.0',
    description: 'Eventos de locatarios: CRUD, subida de media',
  },
  servers: [{ url: '/events', description: 'Events service' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
      Event: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          creator_id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          event_date: { type: 'string', format: 'date-time' },
          address: { type: 'string' },
          price: { type: 'number', nullable: true },
          image_url: { type: 'string', nullable: true },
          video_url: { type: 'string', nullable: true },
          audio_url: { type: 'string', nullable: true },
          organizer_name: { type: 'string' },
          organizer_avatar: { type: 'string', nullable: true },
          lat: { type: 'number', nullable: true },
          lng: { type: 'number', nullable: true },
        },
      },
      EventBody: {
        type: 'object',
        required: ['title', 'description', 'category', 'event_date'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          event_date: { type: 'string', format: 'date-time' },
          address: { type: 'string' },
          price: { type: 'number', nullable: true },
          image_url: { type: 'string', nullable: true },
          video_url: { type: 'string', nullable: true },
          audio_url: { type: 'string', nullable: true },
          organizer_name: { type: 'string' },
          organizer_avatar: { type: 'string', nullable: true },
          lat: { type: 'number', nullable: true },
          lng: { type: 'number', nullable: true },
        },
      },
    },
  },
  paths: {
    '/cleanup': {
      get: {
        tags: ['Administración'],
        summary: 'Eliminar eventos expirados (cron job diario)',
        parameters: [{ name: 'Authorization', in: 'header', schema: { type: 'string' }, description: 'Bearer {CRON_SECRET}' }],
        responses: {
          200: { description: 'Eventos eliminados', content: { 'application/json': { schema: { type: 'object', properties: { deleted: { type: 'integer' }, timestamp: { type: 'string' } } } } } },
          401: { description: 'No autorizado' },
        },
      },
    },
    '/public': {
      get: {
        tags: ['Eventos'],
        summary: 'Listar eventos públicos futuros (sin auth)',
        responses: {
          200: { description: 'Lista de eventos', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Event' } } } } },
        },
      },
    },
    '/locatario': {
      get: {
        tags: ['Locatario'],
        summary: 'Listar eventos del locatario autenticado',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Lista de eventos', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Event' } } } } },
          401: { description: 'No autorizado' },
        },
      },
      post: {
        tags: ['Locatario'],
        summary: 'Crear un nuevo evento',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/EventBody' } } },
        },
        responses: {
          201: { description: 'Evento creado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Event' } } } },
          400: { description: 'Campos requeridos faltantes' },
        },
      },
    },
    '/locatario/{id}': {
      patch: {
        tags: ['Locatario'],
        summary: 'Actualizar un evento del locatario',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/EventBody' } } },
        },
        responses: {
          200: { description: 'Evento actualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Event' } } } },
          400: { description: 'Sin campos para actualizar' },
        },
      },
      delete: {
        tags: ['Locatario'],
        summary: 'Eliminar un evento del locatario',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          204: { description: 'Evento eliminado' },
          500: { description: 'Error del servidor' },
        },
      },
    },
    '/upload-url': {
      post: {
        tags: ['Media'],
        summary: 'Generar URL firmada para subida directa a Supabase Storage',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['mimeType'],
                properties: {
                  fileName: { type: 'string' },
                  mimeType: { type: 'string', example: 'video/mp4' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'URL de subida generada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    signedUrl: { type: 'string' },
                    token: { type: 'string' },
                    path: { type: 'string' },
                    publicUrl: { type: 'string' },
                  },
                },
              },
            },
          },
          400: { description: 'mimeType inválido' },
        },
      },
    },
    '/upload': {
      post: {
        tags: ['Media'],
        summary: 'Subir archivo directamente (≤ 4.5 MB)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { file: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Archivo subido', content: { 'application/json': { schema: { type: 'object', properties: { publicUrl: { type: 'string' } } } } } },
          400: { description: 'Archivo faltante o demasiado grande' },
        },
      },
    },
  },
}
