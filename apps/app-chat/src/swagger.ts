import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'eMeet Chat API',
      version: '1.0.0',
      description:
        'API del microservicio de chat de eMeet. Todos los endpoints `/chat/*` requieren autenticación Bearer (token de Supabase).',
    },
    servers: [
      { url: 'http://localhost:3005', description: 'Desarrollo local' },
      { url: 'https://e-meet-app-chat.vercel.app', description: 'Producción' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token de acceso de Supabase (obtenido al hacer login)',
        },
      },
      schemas: {
        LastMessage: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            roomId: { type: 'string', format: 'uuid' },
            senderId: { type: 'string', format: 'uuid' },
            senderName: { type: 'string', example: 'Ana García' },
            senderAvatar: { type: 'string', nullable: true, example: 'https://cdn.example.com/avatar.jpg' },
            text: { type: 'string', example: 'Nos vemos mañana!' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        ChatRoom: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: 'ID de la sala (igual al ID del evento)' },
            eventTitle: { type: 'string', example: 'Festival de Jazz 2025' },
            eventImageUrl: { type: 'string', nullable: true, example: 'https://cdn.example.com/event.jpg' },
            eventAddress: { type: 'string', nullable: true, example: 'Parque Simón Bolívar, Bogotá' },
            memberCount: { type: 'integer', example: 12 },
            unreadCount: { type: 'integer', example: 3 },
            lastMessage: { $ref: '#/components/schemas/LastMessage', nullable: true },
          },
        },
        ChatMessage: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            roomId: { type: 'string', format: 'uuid' },
            senderId: { type: 'string', format: 'uuid' },
            senderName: { type: 'string', example: 'Carlos López' },
            senderAvatar: { type: 'string', nullable: true },
            text: { type: 'string', example: 'Hola a todos!' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        UnreadCount: {
          type: 'object',
          properties: {
            roomId: { type: 'string', format: 'uuid' },
            unread: { type: 'integer', example: 5 },
          },
        },
        Error400: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'eventTitle es obligatorio para crear/unir sala.' },
          },
        },
        Error401: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'No autorizado.' },
          },
        },
        Error500: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'No se pudieron cargar las salas de chat.' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './src/app.ts'],
}

export const swaggerSpec = swaggerJsdoc(options)
