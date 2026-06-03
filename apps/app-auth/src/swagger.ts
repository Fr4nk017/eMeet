export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'eMeet Auth API',
    version: '1.0.0',
    description: 'Autenticación y sesiones de usuario',
  },
  servers: [{ url: '/auth', description: 'Auth service' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
      Session: {
        type: 'object',
        properties: {
          user: { type: 'object' },
          access_token: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/login': {
      post: {
        tags: ['Auth'],
        summary: 'Iniciar sesión con email y contraseña',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login exitoso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { type: 'object' },
                    session: { type: 'object' },
                  },
                },
              },
            },
          },
          400: { description: 'Credenciales inválidas', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          429: { description: 'Demasiados intentos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/register': {
      post: {
        tags: ['Auth'],
        summary: 'Registrar nuevo usuario',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                  role: { type: 'string', enum: ['user', 'locatario', 'admin'] },
                  businessName: { type: 'string' },
                  businessLocation: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Usuario registrado', content: { 'application/json': { schema: { type: 'object', properties: { user: { type: 'object' }, session: { type: 'object' } } } } } },
          400: { description: 'Datos inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Cerrar sesión',
        security: [{ bearerAuth: [] }],
        responses: {
          204: { description: 'Sesión cerrada' },
          500: { description: 'Error del servidor', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/session': {
      get: {
        tags: ['Auth'],
        summary: 'Obtener sesión actual',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Sesión activa o null',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    session: { nullable: true, $ref: '#/components/schemas/Session' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/callback': {
      get: {
        tags: ['Auth'],
        summary: 'Callback OAuth / verificación de email',
        parameters: [
          { name: 'code', in: 'query', schema: { type: 'string' }, description: 'Código PKCE de OAuth' },
          { name: 'token_hash', in: 'query', schema: { type: 'string' } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['signup', 'email_change', 'recovery'] } },
          { name: 'next', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          302: { description: 'Redirección al frontend con tokens' },
        },
      },
    },
  },
}
