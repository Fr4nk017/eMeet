export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'eMeet Saved API',
    version: '1.0.0',
    description: 'Likes, guardados y recomendaciones de eventos',
  },
  servers: [{ url: '/events', description: 'Saved service' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
      UserEvent: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          user_id: { type: 'string', format: 'uuid' },
          event_id: { type: 'string' },
          event_title: { type: 'string' },
          event_image_url: { type: 'string', nullable: true },
          event_address: { type: 'string', nullable: true },
          action: { type: 'string', enum: ['like', 'save'] },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      EventRef: {
        type: 'object',
        required: ['id', 'type', 'lat', 'lng', 'distance'],
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          lat: { type: 'number' },
          lng: { type: 'number' },
          distance: { type: 'number' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/like': {
      post: {
        tags: ['Likes'],
        summary: 'Dar like a un evento (crea sala de chat automáticamente)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['eventId', 'eventTitle'],
                properties: {
                  eventId: { type: 'string' },
                  eventTitle: { type: 'string' },
                  eventImageUrl: { type: 'string' },
                  eventAddress: { type: 'string' },
                  eventType: { type: 'string' },
                  eventLat: { type: 'number' },
                  eventLng: { type: 'number' },
                  eventDistance: { type: 'number' },
                  eventDate: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Like registrado', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, chatLinked: { type: 'boolean' } } } } } },
          400: { description: 'eventId o eventTitle faltantes' },
          500: { description: 'Error del servidor' },
        },
      },
    },
    '/like/{id}': {
      delete: {
        tags: ['Likes'],
        summary: 'Quitar like de un evento',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Like eliminado' },
          500: { description: 'Error del servidor' },
        },
      },
    },
    '/liked': {
      get: {
        tags: ['Likes'],
        summary: 'Listar eventos que le gustan al usuario',
        responses: {
          200: { description: 'Lista de likes', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/UserEvent' } } } } },
        },
      },
    },
    '/save': {
      post: {
        tags: ['Guardados'],
        summary: 'Guardar un evento',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['eventId', 'eventTitle'],
                properties: {
                  eventId: { type: 'string' },
                  eventTitle: { type: 'string' },
                  eventImageUrl: { type: 'string' },
                  eventAddress: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Evento guardado', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } } },
          400: { description: 'eventId o eventTitle faltantes' },
        },
      },
    },
    '/save/{id}': {
      delete: {
        tags: ['Guardados'],
        summary: 'Eliminar un evento guardado',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Guardado eliminado' },
          500: { description: 'Error del servidor' },
        },
      },
    },
    '/saved': {
      get: {
        tags: ['Guardados'],
        summary: 'Listar eventos guardados del usuario',
        responses: {
          200: { description: 'Lista de guardados', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/UserEvent' } } } } },
        },
      },
    },
    '/recommendations': {
      post: {
        tags: ['Recomendaciones'],
        summary: 'Generar recomendaciones basadas en likes anteriores (Redis)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['availableEvents'],
                properties: {
                  availableEvents: { type: 'array', items: { $ref: '#/components/schemas/EventRef' } },
                  limit: { type: 'integer', default: 5, maximum: 10 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Recomendaciones',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    recommendations: { type: 'array', items: { allOf: [{ $ref: '#/components/schemas/EventRef' }, { type: 'object', properties: { similarity: { type: 'number' } } }] } },
                    count: { type: 'integer' },
                  },
                },
              },
            },
          },
          400: { description: 'availableEvents inválido' },
        },
      },
    },
  },
}
