import request from 'supertest'
import app from '../app'
import { db, resetDb, seedProfile } from './helpers/mock-db'

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../../../packages/shared/src/middleware/auth', () => ({
  withAuth: (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.slice(7)
    if (!token) return res.status(401).json({ error: 'No autorizado.' })
    const { createMockClient } = require('./helpers/mock-db')
    req.authUser = { id: token }
    req.supabase = createMockClient()
    next()
  },
}))

jest.mock('../../../../packages/shared/src/lib/supabase', () => ({
  createServiceRoleClient: () => require('./helpers/mock-db').createMockClient(),
  createAnonClient: () => require('./helpers/mock-db').createMockClient(),
}))

// ─── Test users / secrets ─────────────────────────────────────────────────────

const USER1          = 'user-1'
const USER2          = 'user-2'
const CLEANUP_SECRET = 'mock-cleanup-secret'

process.env.CLEANUP_SECRET = CLEANUP_SECRET

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  resetDb()
  seedProfile(USER1, 'Usuario Uno')
  seedProfile(USER2, 'Usuario Dos')
})

// ─── Auth guard ───────────────────────────────────────────────────────────────

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

// ─── GET /chat/rooms ──────────────────────────────────────────────────────────

describe('GET /chat/rooms', () => {
  it('devuelve array de salas del usuario', async () => {
    const res = await request(app)
      .get('/chat/rooms')
      .set('Authorization', `Bearer ${USER1}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('devuelve sala con datos correctos tras join', async () => {
    await request(app)
      .post('/chat/rooms/sala-abc/join')
      .set('Authorization', `Bearer ${USER1}`)
      .send({ eventTitle: 'Mi evento' })

    const res = await request(app)
      .get('/chat/rooms')
      .set('Authorization', `Bearer ${USER1}`)
    expect(res.status).toBe(200)
    const sala = res.body.find((r: { id: string }) => r.id === 'sala-abc')
    expect(sala).toBeDefined()
    expect(sala.eventTitle).toBe('Mi evento')
    expect(sala.status).toBe('active')
  })
})

// ─── POST /chat/rooms/:id/join ────────────────────────────────────────────────

describe('POST /chat/rooms/:id/join', () => {
  it('rechaza si falta eventTitle', async () => {
    const res = await request(app)
      .post('/chat/rooms/room-sin-titulo/join')
      .set('Authorization', `Bearer ${USER1}`)
      .send({})
    expect(res.status).toBe(400)
  })

  it('[T1] crea sala al primer like', async () => {
    const roomId = 'room-t1'

    const res = await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${USER1}`)
      .send({
        eventTitle: '[TEST] Sala prueba T1',
        eventAddress: 'Dirección test',
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })

    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)

    const listRes = await request(app)
      .get('/chat/rooms')
      .set('Authorization', `Bearer ${USER1}`)
    const room = listRes.body.find((r: { id: string }) => r.id === roomId)
    expect(room).toBeDefined()
    expect(room.status).toBe('active')
  })

  it('[T2] segundo usuario se une a la misma sala', async () => {
    const roomId = 'room-t2'

    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${USER1}`)
      .send({ eventTitle: '[TEST] Evento compartido T2' })

    const res2 = await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${USER2}`)
      .send({ eventTitle: '[TEST] Evento compartido T2' })

    expect(res2.status).toBe(201)

    const membersRes = await request(app)
      .get(`/chat/rooms/${roomId}/members`)
      .set('Authorization', `Bearer ${USER1}`)

    const members: Array<{ userId: string }> = membersRes.body
    const userIds = members.map(m => m.userId)
    expect(userIds).toContain(USER1)
    expect(userIds).toContain(USER2)
  })

  it('[T3] no duplica membresías con joins repetidos', async () => {
    const roomId = 'room-t3'

    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${USER1}`)
      .send({ eventTitle: '[TEST] No duplicar' })

    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${USER1}`)
      .send({ eventTitle: '[TEST] No duplicar' })

    const membersRes = await request(app)
      .get(`/chat/rooms/${roomId}/members`)
      .set('Authorization', `Bearer ${USER1}`)

    expect(membersRes.status).toBe(200)
    const members: Array<{ userId: string }> = membersRes.body
    expect(members.filter(m => m.userId === USER1)).toHaveLength(1)
  })
})

// ─── GET /chat/rooms/:id/messages ─────────────────────────────────────────────

describe('GET /chat/rooms/:id/messages', () => {
  it('devuelve mensajes de una sala a miembro', async () => {
    const roomId = 'room-msgs'
    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${USER1}`)
      .send({ eventTitle: '[TEST] Sala mensajes' })

    const res = await request(app)
      .get(`/chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${USER1}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('[T7] bloquea acceso a no-miembros', async () => {
    const roomId = 'room-private'
    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${USER1}`)
      .send({ eventTitle: '[TEST] Sala privada' })

    const res = await request(app)
      .get(`/chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${USER2}`)
    expect(res.status).toBe(403)
  })
})

// ─── POST /chat/rooms/:id/messages ───────────────────────────────────────────

describe('POST /chat/rooms/:id/messages', () => {
  it('rechaza mensaje vacío', async () => {
    const roomId = 'room-msg-empty'
    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${USER1}`)
      .send({ eventTitle: '[TEST] Mensaje vacío' })

    const res = await request(app)
      .post(`/chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${USER1}`)
      .send({ text: '   ' })
    expect(res.status).toBe(400)
  })

  it('[T4] envía y recibe mensaje — ambos usuarios lo ven', async () => {
    const roomId = 'room-send'

    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${USER1}`)
      .send({ eventTitle: '[TEST] Sala envío 2u' })

    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${USER2}`)
      .send({ eventTitle: '[TEST] Sala envío 2u' })

    const sendRes = await request(app)
      .post(`/chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${USER1}`)
      .send({ text: 'Hola desde user1' })
    expect(sendRes.status).toBe(201)
    expect(sendRes.body.text).toBe('Hola desde user1')

    const listRes = await request(app)
      .get(`/chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${USER2}`)
    expect(listRes.status).toBe(200)
    expect(listRes.body.map((m: { text: string }) => m.text)).toContain('Hola desde user1')
  })

  it('[T7] bloquea envío a no-miembros', async () => {
    const roomId = 'room-send-private'
    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${USER1}`)
      .send({ eventTitle: '[TEST] Privado envío' })

    const res = await request(app)
      .post(`/chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${USER2}`)
      .send({ text: 'Intrusión' })
    expect(res.status).toBe(403)
  })
})

// ─── DELETE /chat/rooms/:id/leave ────────────────────────────────────────────

describe('DELETE /chat/rooms/:id/leave', () => {
  it('[T5] usuario sale manualmente sin afectar a otros miembros', async () => {
    const roomId = 'room-leave'

    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${USER1}`)
      .send({ eventTitle: '[TEST] Salida manual' })
    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${USER2}`)
      .send({ eventTitle: '[TEST] Salida manual' })

    const leaveRes = await request(app)
      .delete(`/chat/rooms/${roomId}/leave`)
      .set('Authorization', `Bearer ${USER1}`)
    expect(leaveRes.status).toBe(204)

    const msgRes1 = await request(app)
      .get(`/chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${USER1}`)
    expect(msgRes1.status).toBe(403)

    const msgRes2 = await request(app)
      .get(`/chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${USER2}`)
    expect(msgRes2.status).toBe(200)
  })

  it('[T5b] sala se marca deleted cuando el último miembro sale', async () => {
    const roomId = 'room-last-leave'

    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${USER1}`)
      .send({ eventTitle: '[TEST] Último miembro' })

    await request(app)
      .delete(`/chat/rooms/${roomId}/leave`)
      .set('Authorization', `Bearer ${USER1}`)

    const room = db.chat_rooms.get(roomId)
    expect(room?.status).toBe('deleted')
  })

  it('rechaza salir si no es miembro', async () => {
    const roomId = 'room-leave-nomember'
    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${USER1}`)
      .send({ eventTitle: '[TEST] Leave no-member' })

    const res = await request(app)
      .delete(`/chat/rooms/${roomId}/leave`)
      .set('Authorization', `Bearer ${USER2}`)
    expect(res.status).toBe(403)
  })
})

// ─── POST /chat/cleanup ───────────────────────────────────────────────────────

describe('POST /chat/cleanup', () => {
  it('[T6] expira salas vencidas y devuelve conteo', async () => {
    const roomId = 'room-expire'
    db.chat_rooms.set(roomId, {
      id: roomId,
      event_title: '[TEST] Sala expirada',
      status: 'active',
      expires_at: new Date(Date.now() - 1000).toISOString(),
    })

    const res = await request(app)
      .post('/chat/cleanup')
      .set('x-cleanup-secret', CLEANUP_SECRET)
    expect(res.status).toBe(200)
    expect(typeof res.body.expired).toBe('number')
    expect(res.body.expired).toBeGreaterThanOrEqual(1)

    const room = db.chat_rooms.get(roomId)
    expect(room?.status).toBe('expired')
  })

  it('[T6b] mensajes bloqueados en sala expirada (410)', async () => {
    const roomId = 'room-send-expired'

    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${USER1}`)
      .send({ eventTitle: '[TEST] Expirar envío' })

    const existing = db.chat_rooms.get(roomId)!
    db.chat_rooms.set(roomId, { ...existing, status: 'expired' })

    const res = await request(app)
      .post(`/chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${USER1}`)
      .send({ text: 'Mensaje en sala expirada' })
    expect(res.status).toBe(410)
  })
})

// ─── Concurrencia ─────────────────────────────────────────────────────────────

describe('Concurrencia: joins simultáneos al mismo evento', () => {
  it('[T8] no duplica membresía con 3 joins paralelos del mismo usuario', async () => {
    const roomId = 'room-concurrent'

    await Promise.all([
      request(app).post(`/chat/rooms/${roomId}/join`).set('Authorization', `Bearer ${USER1}`).send({ eventTitle: '[TEST] Concurrencia' }),
      request(app).post(`/chat/rooms/${roomId}/join`).set('Authorization', `Bearer ${USER1}`).send({ eventTitle: '[TEST] Concurrencia' }),
      request(app).post(`/chat/rooms/${roomId}/join`).set('Authorization', `Bearer ${USER1}`).send({ eventTitle: '[TEST] Concurrencia' }),
    ])

    const membersRes = await request(app)
      .get(`/chat/rooms/${roomId}/members`)
      .set('Authorization', `Bearer ${USER1}`)
    expect(membersRes.status).toBe(200)
    const members: Array<{ userId: string }> = membersRes.body
    expect(members.filter(m => m.userId === USER1)).toHaveLength(1)
  })

  it('[T8b] dos usuarios hacen like simultáneo — ambos quedan como miembros sin duplicados', async () => {
    const roomId = 'room-concurrent-2u'

    await Promise.all([
      request(app).post(`/chat/rooms/${roomId}/join`).set('Authorization', `Bearer ${USER1}`).send({ eventTitle: '[TEST] Concurrencia 2u' }),
      request(app).post(`/chat/rooms/${roomId}/join`).set('Authorization', `Bearer ${USER2}`).send({ eventTitle: '[TEST] Concurrencia 2u' }),
    ])

    const membersRes = await request(app)
      .get(`/chat/rooms/${roomId}/members`)
      .set('Authorization', `Bearer ${USER1}`)
    const members: Array<{ userId: string }> = membersRes.body
    expect(members.filter(m => m.userId === USER1)).toHaveLength(1)
    expect(members.filter(m => m.userId === USER2)).toHaveLength(1)
    expect(members).toHaveLength(2)
  })
})
