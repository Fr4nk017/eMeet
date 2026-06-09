# eMeet — app-chat (Microservicio de Chat)

Microservicio Express para salas de chat asociadas a eventos. Cuando un usuario da like a un evento, se crea (o une a) una sala de chat grupal. Puerto: **3005**.

## Stack

- Node.js + Express 4.21 + TypeScript 5.6
- Prisma 5 + PostgreSQL (Supabase)
- Jest 30 + Supertest 7

## Instalación

```bash
cd apps/app-chat
npm install
```

## Variables de entorno

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://...
FRONTEND_ORIGIN=http://localhost:3000
PORT=3005

# Para tests
TEST_USER_EMAIL=usuario@test.com
TEST_USER_PASSWORD=contraseña123
```

## Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/chat/rooms` | Bearer | Listar salas del usuario |
| POST | `/chat/rooms/:id/join` | Bearer | Unirse a sala de un evento |
| GET | `/chat/rooms/:id/messages` | Bearer | Ver mensajes de la sala |
| POST | `/chat/rooms/:id/messages` | Bearer | Enviar mensaje |
| POST | `/chat/rooms/:id/read` | Bearer | Marcar sala como leída |
| GET | `/chat/rooms/:id/unread` | Bearer | Contar no leídos en sala |
| GET | `/chat/unread` | Bearer | Total no leídos (todas las salas) |
| GET | `/health` | Público | Health check |

## Flujo de sala de chat

1. Usuario da like a un evento (app-saved lo llama internamente).
2. app-chat crea `chat_room` con el ID del evento si no existe.
3. Se añade al usuario como `room_member`.
4. Los mensajes quedan en `chat_messages` con referencia a la sala.

## Pruebas

```bash
npm test
npx jest --coverage
```
