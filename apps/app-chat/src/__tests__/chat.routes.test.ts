import 'dotenv/config'
import request from 'supertest'
import { createClient } from '@supabase/supabase-js'
import app from '../app'

// ── Clientes Supabase ─────────────────────────────────────────────────────────

const anonClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
)

const anonClient2 = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
)

const svcClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ── Estado de sesión ──────────────────────────────────────────────────────────

let authToken = ''
let authToken2 = ''
let testUserId = ''
let testUserId2 = ''
const hasUser2 = !!(process.env.TEST_USER2_EMAIL && process.env.TEST_USER2_PASSWORD)
const createdRoomIds: string[] = []

// ── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  // Usuario 1
  const { data, error } = await anonClient.auth.signInWithPassword({
    email: process.env.TEST_USER_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  })
  if (error || !data.session) throw new Error(`Login fallido (user1): ${error?.message}`)
  authToken = data.session.access_token
  testUserId = data.user.id

  // Usuario 2 (opcional — se salta si no está configurado)
  if (hasUser2) {
    const { data: d2, error: e2 } = await anonClient2.auth.signInWithPassword({
      email: process.env.TEST_USER2_EMAIL!,
      password: process.env.TEST_USER2_PASSWORD!,
    })
    if (e2 || !d2.session) {
      console.warn(`Login fallido (user2): ${e2?.message} — tests de 2 usuarios se saltarán`)
    } else {
      authToken2 = d2.session.access_token
      testUserId2 = d2.user.id
    }
  }
}, 20_000)

afterAll(async () => {
  if (createdRoomIds.length > 0) {
    await svcClient.from('chat_messages').delete().in('room_id', createdRoomIds)
    await svcClient.from('room_members').delete().in('room_id', createdRoomIds)
    await svcClient.from('chat_rooms').delete().in('id', createdRoomIds)
  }
  await anonClient.auth.signOut({ scope: 'local' })
  if (authToken2) await anonClient2.auth.signOut({ scope: 'local' })
}, 20_000)

// ── Helpers ───────────────────────────────────────────────────────────────────

function skip2(label: string) {
  if (!authToken2) {
    console.warn(`[SKIP] ${label} — TEST_USER2 no configurado`)
    return true
  }
  return false
}

// ── Auth guard ───────────────────────────────────────────────────────────────

describe('Autenticación requerida', () => {
  it('GET /chat/rooms rechaza sin token', async () => {
    const res = await request(app).get('/chat/rooms')
    expect(res.status).toBe(401)
  })

  it('POST /chat/rooms/:id/join rechaza sin token', async () => {
    const res = await request(app).post('/chat/rooms/test-room/join').send({ eventTitle: 'Test' })
    expect(res.status).toBe(401)
  })

  it('GET /chat/rooms/:id/messages rechaza sin token', async () => {
    const res = await request(app).get('/chat/rooms/test/messages')
    expect(res.status).toBe(401)
  })
})

// ── GET /chat/rooms ──────────────────────────────────────────────────────────

describe('GET /chat/rooms', () => {
  it('devuelve array de salas del usuario', async () => {
    const res = await request(app)
      .get('/chat/rooms')
      .set('Authorization', `Bearer ${authToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

// ── [T1] Crea sala al primer like ─────────────────────────────────────────────

describe('POST /chat/rooms/:id/join', () => {
  it('rechaza si falta eventTitle', async () => {
    const res = await request(app)
      .post('/chat/rooms/test-room-sin-titulo/join')
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
    expect(res.status).toBe(400)
  })

  it('[T1] crea sala al primer like', async () => {
    const roomId = `test-t1-${Date.now()}`
    createdRoomIds.push(roomId)

    const res = await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        eventTitle: '[TEST] Sala prueba T1',
        eventAddress: 'Dirección test',
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })

    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)

    const listRes = await request(app)
      .get('/chat/rooms')
      .set('Authorization', `Bearer ${authToken}`)
    const room = listRes.body.find((r: { id: string }) => r.id === roomId)
    expect(room).toBeDefined()
    expect(room.status).toBe('active')
  }, 10_000)

  // ── [T2] Segundo usuario se une a la misma sala ─────────────────────────────

  it('[T2] segundo usuario se une a la misma sala con like al mismo evento', async () => {
    if (skip2('[T2] segundo like → misma sala')) return

    const roomId = `test-t2-${Date.now()}`
    createdRoomIds.push(roomId)

    // User1 crea la sala (simula primer like)
    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ eventTitle: '[TEST] Evento compartido T2' })

    // User2 da like al mismo evento → debe unirse a la misma sala
    const res2 = await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${authToken2}`)
      .send({ eventTitle: '[TEST] Evento compartido T2' })

    expect(res2.status).toBe(201)

    // Ambos deben aparecer como miembros
    const membersRes = await request(app)
      .get(`/chat/rooms/${roomId}/members`)
      .set('Authorization', `Bearer ${authToken}`)

    const members: Array<{ userId: string }> = membersRes.body
    const userIds = members.map((m) => m.userId)
    expect(userIds).toContain(testUserId)
    expect(userIds).toContain(testUserId2)
  }, 15_000)

  // ── [T3] No duplica membresías ──────────────────────────────────────────────

  it('[T3] no duplica membresías con joins repetidos', async () => {
    const roomId = `test-t3-${Date.now()}`
    createdRoomIds.push(roomId)

    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ eventTitle: '[TEST] No duplicar' })

    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ eventTitle: '[TEST] No duplicar' })

    const membersRes = await request(app)
      .get(`/chat/rooms/${roomId}/members`)
      .set('Authorization', `Bearer ${authToken}`)

    expect(membersRes.status).toBe(200)
    const members: Array<{ userId: string }> = membersRes.body
    expect(members.filter((m) => m.userId === testUserId)).toHaveLength(1)
  }, 15_000)
})

// ── GET /chat/rooms/:id/messages ─────────────────────────────────────────────

describe('GET /chat/rooms/:id/messages', () => {
  it('devuelve mensajes de una sala a miembro', async () => {
    const roomId = `test-msgs-${Date.now()}`
    createdRoomIds.push(roomId)

    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ eventTitle: '[TEST] Sala mensajes' })

    const res = await request(app)
      .get(`/chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  }, 15_000)

  it('[T7] bloquea acceso a no-miembros', async () => {
    if (skip2('[T7] bloqueo no-miembro lectura')) return

    const roomId = `test-nonmember-${Date.now()}`
    createdRoomIds.push(roomId)

    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ eventTitle: '[TEST] Sala privada' })

    const res = await request(app)
      .get(`/chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${authToken2}`)

    expect(res.status).toBe(403)
  }, 15_000)
})

// ── POST /chat/rooms/:id/messages ─────────────────────────────────────────────

describe('POST /chat/rooms/:id/messages', () => {
  it('rechaza mensaje vacío', async () => {
    const roomId = `test-msg-empty-${Date.now()}`
    createdRoomIds.push(roomId)

    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ eventTitle: '[TEST] Mensaje vacío' })

    const res = await request(app)
      .post(`/chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ text: '   ' })

    expect(res.status).toBe(400)
  }, 15_000)

  it('[T4] envía y recibe mensaje — ambos usuarios lo ven', async () => {
    if (skip2('[T4] envío+recepción 2 usuarios')) return

    const roomId = `test-send-${Date.now()}`
    createdRoomIds.push(roomId)

    // Ambos usuarios se unen a la sala
    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ eventTitle: '[TEST] Sala envío 2u' })

    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${authToken2}`)
      .send({ eventTitle: '[TEST] Sala envío 2u' })

    // User1 envía mensaje
    const sendRes = await request(app)
      .post(`/chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ text: 'Hola desde user1' })

    expect(sendRes.status).toBe(201)
    expect(sendRes.body.text).toBe('Hola desde user1')

    // User2 lee el mensaje — confirma persistencia (base del tiempo real)
    const listRes = await request(app)
      .get(`/chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${authToken2}`)

    expect(listRes.status).toBe(200)
    const texts = listRes.body.map((m: { text: string }) => m.text)
    expect(texts).toContain('Hola desde user1')
  }, 20_000)

  // ── [T4-RT] Tiempo real con Supabase Realtime ────────────────────────────────

  it('[T4-RT] mensaje de user1 llega en tiempo real a user2 vía Supabase Realtime', async () => {
    if (skip2('[T4-RT] realtime 2 usuarios')) return

    const roomId = `test-rt-${Date.now()}`
    createdRoomIds.push(roomId)

    // Ambos se unen
    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ eventTitle: '[TEST] Sala realtime' })

    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${authToken2}`)
      .send({ eventTitle: '[TEST] Sala realtime' })

    // User2 se suscribe a INSERT en chat_messages
    const receivedText = await new Promise<string | null>((resolve) => {
      let timeoutHandle: ReturnType<typeof setTimeout>

      const channel = anonClient2
        .channel(`rt-test-${roomId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
          (payload) => {
            clearTimeout(timeoutHandle)
            anonClient2.removeChannel(channel)
            resolve((payload.new as { text: string }).text)
          },
        )
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // El timeout empieza sólo cuando la suscripción está confirmada
            timeoutHandle = setTimeout(() => {
              anonClient2.removeChannel(channel)
              resolve(null)
            }, 15_000)

            // User1 envía mensaje después de que user2 esté suscrito
            await request(app)
              .post(`/chat/rooms/${roomId}/messages`)
              .set('Authorization', `Bearer ${authToken}`)
              .send({ text: 'Mensaje en tiempo real' })
          }
        })
    })

    expect(receivedText).toBe('Mensaje en tiempo real')
  }, 30_000)

  it('[T7] bloquea envío a no-miembros', async () => {
    if (skip2('[T7] bloqueo no-miembro envío')) return

    const roomId = `test-send-nonmember-${Date.now()}`
    createdRoomIds.push(roomId)

    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ eventTitle: '[TEST] Privado envío' })

    const res = await request(app)
      .post(`/chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${authToken2}`)
      .send({ text: 'Intrusión' })

    expect(res.status).toBe(403)
  }, 15_000)
})

// ── DELETE /chat/rooms/:id/leave ──────────────────────────────────────────────

describe('DELETE /chat/rooms/:id/leave', () => {
  it('[T5] usuario sale manualmente sin afectar a otros miembros', async () => {
    if (skip2('[T5] salida manual con 2 usuarios')) return

    const roomId = `test-leave-${Date.now()}`
    createdRoomIds.push(roomId)

    // Ambos se unen
    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ eventTitle: '[TEST] Salida manual' })

    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${authToken2}`)
      .send({ eventTitle: '[TEST] Salida manual' })

    // User1 sale
    const leaveRes = await request(app)
      .delete(`/chat/rooms/${roomId}/leave`)
      .set('Authorization', `Bearer ${authToken}`)

    expect(leaveRes.status).toBe(204)

    // User1 ya no puede leer mensajes
    const msgRes = await request(app)
      .get(`/chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${authToken}`)
    expect(msgRes.status).toBe(403)

    // User2 sigue siendo miembro y puede leer
    const msgRes2 = await request(app)
      .get(`/chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${authToken2}`)
    expect(msgRes2.status).toBe(200)
  }, 20_000)

  it('[T5b] sala se marca deleted cuando el último miembro sale', async () => {
    const roomId = `test-last-leave-${Date.now()}`
    createdRoomIds.push(roomId)

    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ eventTitle: '[TEST] Último miembro' })

    await request(app)
      .delete(`/chat/rooms/${roomId}/leave`)
      .set('Authorization', `Bearer ${authToken}`)

    const { data } = await svcClient.from('chat_rooms').select('status').eq('id', roomId).single()
    expect(data?.status).toBe('deleted')
  }, 15_000)

  it('rechaza salir si no es miembro', async () => {
    if (skip2('[T7] salir sin ser miembro')) return

    const roomId = `test-leave-nomember-${Date.now()}`
    createdRoomIds.push(roomId)

    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ eventTitle: '[TEST] Leave no-member' })

    const res = await request(app)
      .delete(`/chat/rooms/${roomId}/leave`)
      .set('Authorization', `Bearer ${authToken2}`)

    expect(res.status).toBe(403)
  }, 15_000)
})

// ── [T6] Expiración automática — cleanup ──────────────────────────────────────

describe('POST /chat/cleanup', () => {
  it('[T6] expira salas vencidas y devuelve conteo', async () => {
    const roomId = `test-expire-${Date.now()}`
    createdRoomIds.push(roomId)

    await svcClient.from('chat_rooms').insert({
      id: roomId,
      event_title: '[TEST] Sala expirada',
      status: 'active',
      expires_at: new Date(Date.now() - 1000).toISOString(),
    })

    const secret = process.env.CLEANUP_SECRET ?? ''
    const res = await request(app)
      .post('/chat/cleanup')
      .set('x-cleanup-secret', secret)

    expect(res.status).toBe(200)
    expect(typeof res.body.expired).toBe('number')
    expect(res.body.expired).toBeGreaterThanOrEqual(1)

    const { data } = await svcClient.from('chat_rooms').select('status').eq('id', roomId).single()
    expect(data?.status).toBe('expired')
  }, 15_000)

  it('[T6b] mensajes bloqueados en sala expirada (410)', async () => {
    const roomId = `test-send-expired-${Date.now()}`
    createdRoomIds.push(roomId)

    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ eventTitle: '[TEST] Expirar envío' })

    await svcClient.from('chat_rooms').update({ status: 'expired' }).eq('id', roomId)

    const res = await request(app)
      .post(`/chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ text: 'Mensaje en sala expirada' })

    expect(res.status).toBe(410)
  }, 15_000)
})

// ── [T8] Concurrencia — likes simultáneos ─────────────────────────────────────

describe('Concurrencia: joins simultáneos al mismo evento', () => {
  it('[T8] no duplica membresía con 3 joins paralelos del mismo usuario', async () => {
    const roomId = `test-concurrent-${Date.now()}`
    createdRoomIds.push(roomId)

    await Promise.all([
      request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ eventTitle: '[TEST] Concurrencia' }),
      request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ eventTitle: '[TEST] Concurrencia' }),
      request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ eventTitle: '[TEST] Concurrencia' }),
    ])

    const membersRes = await request(app)
      .get(`/chat/rooms/${roomId}/members`)
      .set('Authorization', `Bearer ${authToken}`)

    expect(membersRes.status).toBe(200)
    const members: Array<{ userId: string }> = membersRes.body
    expect(members.filter((m) => m.userId === testUserId)).toHaveLength(1)
  }, 15_000)

  it('[T8b] dos usuarios hacen like simultáneo — ambos quedan como miembros sin duplicados', async () => {
    if (skip2('[T8b] concurrencia 2 usuarios')) return

    const roomId = `test-concurrent2-${Date.now()}`
    createdRoomIds.push(roomId)

    await Promise.all([
      request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ eventTitle: '[TEST] Concurrencia 2u' }),
      request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ eventTitle: '[TEST] Concurrencia 2u' }),
    ])

    const membersRes = await request(app)
      .get(`/chat/rooms/${roomId}/members`)
      .set('Authorization', `Bearer ${authToken}`)

    const members: Array<{ userId: string }> = membersRes.body
    expect(members.filter((m) => m.userId === testUserId)).toHaveLength(1)
    expect(members.filter((m) => m.userId === testUserId2)).toHaveLength(1)
    expect(members).toHaveLength(2)
  }, 15_000)
})
