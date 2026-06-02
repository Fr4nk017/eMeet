# 🧪 Chat Realtime Tests

Suites de tests para verificar la funcionalidad de **Supabase Realtime** en el sistema de chat de eMeet.

## 📋 Descripción de Tests

### `chat.realtime.test.ts`
Tests de integración para el comportamiento fundamental del chat con realtime:

- **Message Broadcasting**: Verificar que los mensajes se guardan y recuperan correctamente
- **Message History**: Obtener historial completo con datos de perfil del remitente
- **Room Membership**: Tracking de miembros y auto-limpieza cuando sala queda vacía
- **Unread Count**: Contador de mensajes no leídos y marca de lectura
- **Performance**: Mensajes rápidos sin pérdida de datos, orden preservado
- **Error Handling**: Autenticación, validación, rooms expiradas

### `chat.subscription.test.ts`
Tests simulando el comportamiento real de suscripciones WebSocket:

- **INSERT Event Simulation**: Múltiples usuarios reciben mensajes vía GET (simula realtime)
- **Subscription Channel Management**: Miembros consistentes, dejar sala
- **Optimistic Updates**: Mensajes del usuario visible inmediatamente
- **Read State Sync**: Sincronización de estado de lectura entre usuarios
- **Error Recovery**: Recuperación de errores transientes, reconexión

## 🚀 Ejecutar Tests

```bash
# Todos los tests de chat
npm run test -w app-chat

# Solo realtime
npm run test -- chat.realtime.test.ts

# Solo subscription
npm run test -- chat.subscription.test.ts

# Con cobertura
npm run test:coverage -w app-chat

# Watch mode (desarrollo)
npm run test -- --watch
```

## 📊 Flujo de Tests

```
Setup
  ├─ Autenticar 2 usuarios
  └─ Crear tokens JWT
     │
Tests (sin interferencia entre ellos)
  ├─ Message Broadcasting
  │  ├─ User1 envía → User2 recibe vía GET
  │  ├─ Rapidfire messages
  │  └─ Metadata consistente
  │
  ├─ Room Management
  │  ├─ Miembros correctos
  │  ├─ Unread tracking
  │  └─ Mark as read
  │
  ├─ Optimistic Updates
  │  ├─ Mensaje propio inmediato
  │  └─ Rollback en error
  │
  └─ Error Recovery
     ├─ Transient errors
     └─ Reconnection scenarios
     │
Cleanup
  └─ Sign out
```

## 🔌 Cómo funciona Realtime

En estos tests:

1. **User1 envía** mensaje → Se guarda en BD
2. **Supabase Realtime** publica evento `INSERT` en tabla `chat_messages`
3. **User2 suscrito** recibe evento vía WebSocket
4. **En tests** simulamos esto con `GET /messages` (que recupera el estado actual)

### En Producción (app-web)

```typescript
// ChatContext.tsx
channel.on('postgres_changes', 
  { event: 'INSERT', schema: 'public', table: 'chat_messages' },
  (payload) => {
    // Actualizar UI en tiempo real
    setMessages(prev => [...prev, payload.new])
  }
)
```

## ✅ Casos Cubiertos

| Caso | Describe | Expected |
|------|----------|----------|
| Auth missing | Sin token | 401 Unauthorized |
| Non-member | User no en sala | 403 Forbidden |
| Empty message | Texto vacío | 400 Bad Request |
| Expired room | Sala con fecha pasada | 410 Gone |
| Rapid messages | 10 mensajes simultáneos | Todos guardados, orden preservado |
| Unread count | User2 recibe mensajes de User1 | Count > 0 hasta marcar leído |
| Message metadata | ID, timestamp, sender | Consistente entre visualizadores |
| Disconnect/reconnect | Simular pérdida conexión | Estado consistente |

## 🐛 Debugging

```bash
# Verbose logging
DEBUG=* npm run test

# Single test suite
npm run test -- --testNamePattern="Message Broadcasting"

# Detailed output
npm run test -- --verbose

# Show skipped tests
npm run test -- --listTests
```

## 📝 Variables de Entorno

Los tests usan:

```env
SUPABASE_URL=<tu-url>
SUPABASE_ANON_KEY=<tu-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>
TEST_ADMIN_EMAIL=<admin-email>
TEST_ADMIN_PASSWORD=<admin-password>
TEST_USER_EMAIL=<user-email>
TEST_USER_PASSWORD=<user-password>
```

Definidas en [apps/app-chat/.env](../.env) y [.env.local](.env.local)

## 🎯 Métricas Clave

Estos tests verifican:

- ✅ **Latencia**: Mensaje enviado → Visible en otra sesión < 1s
- ✅ **Confiabilidad**: Sin pérdida de mensajes en operaciones normales
- ✅ **Consistencia**: Mismo contenido en todos los clientes
- ✅ **Escalabilidad**: 10+ mensajes/segundo sin degradación
- ✅ **Recuperabilidad**: Sistema se recupera de errores

## 🔄 CI/CD Integration

En GitHub Actions:

```yaml
- name: Run chat realtime tests
  run: npm run test -w app-chat -- --coverage
  
- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## 📚 Documentación Relacionada

- [Chat API](../src/routes/chat.routes.ts)
- [ChatContext (Cliente)](../../app-web/src/context/ChatContext.tsx)
- [Chat UI](../../app-web/app/chat/)
- [Schema Supabase](../../app-web/docs/supabase_schema.sql#L94)

## 🚨 Troubleshooting

### Tests fallan con "Login failed"

Verificar que las variables de entorno `TEST_*` sean correctas:

```bash
echo $TEST_ADMIN_EMAIL
echo $TEST_USER_EMAIL
```

### Tests lentos

Normal si es primera ejecución (crea tablas/índices). Ejecuciones posteriores serán más rápidas.

### Mensajes duplicados

Limpiar BD entre ejecuciones:

```bash
# Opcionalmente borrar datos de test
npm run db:reset
```

### Errores de CORS

Verificar que `FRONTEND_ORIGINS` en [env.ts](../src/config/env.ts) incluya localhost:3000

---

**Última actualización**: 2026-05-14  
**Estado**: ✅ Completamente funcional
