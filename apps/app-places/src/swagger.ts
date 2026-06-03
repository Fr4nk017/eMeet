export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'eMeet Places API',
    version: '1.0.0',
    description: 'Búsqueda de lugares cercanos y detalles via Google Maps',
  },
  servers: [{ url: '/places', description: 'Places service' }],
  components: {
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
      Location: {
        type: 'object',
        required: ['lat', 'lng'],
        properties: {
          lat: { type: 'number' },
          lng: { type: 'number' },
        },
      },
    },
  },
  paths: {
    '/search-nearby': {
      post: {
        tags: ['Places'],
        summary: 'Buscar lugares cercanos (Google Places Nearby Search)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['location', 'radius', 'type'],
                properties: {
                  location: { $ref: '#/components/schemas/Location' },
                  radius: { type: 'number', description: 'Radio en metros' },
                  type: { type: 'string', example: 'restaurant', description: 'Tipo de lugar según Google Places' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Lista de lugares',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { places: { type: 'array', items: { type: 'object' } } },
                },
              },
            },
          },
          400: { description: 'Parámetros inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          500: { description: 'Error de Google Maps API' },
        },
      },
    },
    '/{placeId}/details': {
      get: {
        tags: ['Places'],
        summary: 'Obtener detalles de un lugar',
        parameters: [
          {
            name: 'placeId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Google Place ID',
          },
        ],
        responses: {
          200: {
            description: 'Detalles del lugar',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { details: { type: 'object', nullable: true } },
                },
              },
            },
          },
          400: { description: 'placeId inválido' },
          500: { description: 'Error de Google Maps API' },
        },
      },
    },
    '/photo': {
      get: {
        tags: ['Places'],
        summary: 'Proxy de foto de Google Places',
        parameters: [
          { name: 'photoReference', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'maxWidth', in: 'query', schema: { type: 'integer', default: 400 } },
        ],
        responses: {
          200: { description: 'Imagen', content: { 'image/*': { schema: { type: 'string', format: 'binary' } } } },
          400: { description: 'photoReference inválida' },
          500: { description: 'Error obteniendo foto' },
        },
      },
    },
  },
}
