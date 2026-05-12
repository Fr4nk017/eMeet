import 'dotenv/config'
import request from 'supertest'
import { createClient } from '@supabase/supabase-js'
import app from '../app'

const anonClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
)

let authToken = ''
let testUserId = ''
const createdRoomIds: string[] = []

beforeAll(async () => {
  const { data, error } = await anonClient.auth.signInWithPassword({
    email: process.env.TEST_USER_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  })
  if (error || !data.session) throw new Error(`Login fallido: ${error?.message}`)
  authToken = data.session.access_token
  testUserId = data.user.id
}, 15_000)

afterAll(async () => {
  const serviceClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  if (createdRoomIds.length > 0) {
    await serviceClient.from('room_members').delete().in('room_id', createdRoomIds).eq('user_id', testUserId)
    await serviceClient.from('chat_rooms').delete().in('id', createdRoomIds)
  }
  await anonClient.auth.signOut({ scope: 'local' })
}, 15_000)

describe('GET /chat/rooms', () => {
  it('rechaza sin token', async () => {
    const res = await request(app).get('/chat/rooms')
    expect(res.status).toBe(401)
  })

  it('devuelve lista de salas del usuario', async () => {
    const res = await request(app)
      .get('/chat/rooms')
      .set('Authorization', `Bearer ${authToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

describe('POST /chat/rooms/:id/join', () => {
  it('rechaza sin token', async () => {
    const res = await request(app)
      .post('/chat/rooms/test-room/join')
      .send({ eventTitle: 'Test' })
    expect(res.status).toBe(401)
  })

  it('rechaza si falta eventTitle', async () => {
    const res = await request(app)
      .post('/chat/rooms/test-room-sin-titulo/join')
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
    expect(res.status).toBe(400)
  })

  it('crea sala y une al usuario', async () => {
    const roomId = `test-room-${Date.now()}`
    createdRoomIds.push(roomId)

    const res = await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ eventTitle: '[TEST] Sala de prueba', eventAddress: 'Dirección test' })

    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
  })
})

describe('GET /chat/rooms/:id/messages', () => {
  it('rechaza sin token', async () => {
    const res = await request(app).get('/chat/rooms/cualquier-sala/messages')
    expect(res.status).toBe(401)
  })

  it('devuelve mensajes de una sala', async () => {
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
  })
})

describe('POST /chat/rooms/:id/messages', () => {
  it('rechaza mensaje vacío', async () => {
    const roomId = `test-msg-empty-${Date.now()}`
    createdRoomIds.push(roomId)

    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ eventTitle: '[TEST] Sala mensaje vacío' })

    const res = await request(app)
      .post(`/chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ text: '   ' })

    expect(res.status).toBe(400)
  })

  it('envía mensaje correctamente', async () => {
    const roomId = `test-send-${Date.now()}`
    createdRoomIds.push(roomId)

    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ eventTitle: '[TEST] Sala envío' })

    const res = await request(app)
      .post(`/chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ text: 'Hola desde el test' })

    expect(res.status).toBe(201)
    expect(res.body.text).toBe('Hola desde el test')
  })
})
