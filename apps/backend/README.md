# eMeet Backend

Backend API para eMeet usando Express + TypeScript + Supabase.

## Ejecutar local

1. Copia `.env.example` a `.env` y completa variables.
2. Instala dependencias:

```bash
npm install
```

3. Modo desarrollo:

```bash
npm run dev
```

4. Build producción:

```bash
npm run build
npm run start
```

## Variables de entorno

```env
PORT=4000
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
FRONTEND_ORIGIN=http://localhost:3000
```

## Autenticación

- Endpoints protegidos requieren header:

```http
Authorization: Bearer <access_token>
```

- El backend valida el token con `supabase.auth.getUser()`.

## Endpoints disponibles

### Auth
- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/logout`
- `GET /auth/session`

### Perfil
- `GET /profile`
- `PATCH /profile`
- `POST /profile/avatar`

### Eventos
- `POST /events/like`
- `POST /events/save`
- `DELETE /events/like/:id`
- `DELETE /events/save/:id`
- `GET /events/liked`
- `GET /events/saved`
- `GET /events/locatario`
- `POST /events/locatario`
- `DELETE /events/locatario/:id`

### Chat
- `GET /chat/rooms`
- `POST /chat/rooms/:id/join`
- `GET /chat/rooms/:id/messages`
- `POST /chat/rooms/:id/messages`
- `POST /chat/rooms/:id/read`
- `GET /chat/rooms/:id/unread`
- `GET /chat/unread`

## Estado de salud
- `GET /health`
