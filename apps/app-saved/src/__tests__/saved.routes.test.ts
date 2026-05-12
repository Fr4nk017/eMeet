import 'dotenv/config'
import request from 'supertest'
import { createClient } from '@supabase/supabase-js'
import app from '../app'

const anonClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
)
const serviceClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

let authToken = ''
let testUserId = ''
const TEST_EVENT_ID = `test-event-${Date.now()}`
const TEST_EVENT_TITLE = '[TEST] Evento guardado'

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
  // Limpiar todos los registros de prueba
  await serviceClient.from('user_events').delete()
    .eq('user_id', testUserId)
    .like('event_title', '[TEST]%')
  await serviceClient.from('room_members').delete()
    .eq('room_id', TEST_EVENT_ID)
  await serviceClient.from('chat_rooms').delete()
    .eq('id', TEST_EVENT_ID)
  await anonClient.auth.signOut({ scope: 'local' })
}, 15_000)

describe('POST /events/save', () => {
  it('rechaza sin token', async () => {
    const res = await request(app)
      .post('/events/save')
      .send({ eventId: 'x', eventTitle: 'Test' })
    expect(res.status).toBe(401)
  })

  it('rechaza si faltan campos obligatorios', async () => {
    const res = await request(app)
      .post('/events/save')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ eventId: TEST_EVENT_ID })
    expect(res.status).toBe(400)
  })

  it('guarda un evento correctamente', async () => {
    const res = await request(app)
      .post('/events/save')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ eventId: TEST_EVENT_ID, eventTitle: TEST_EVENT_TITLE, eventAddress: 'Dirección test' })
    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
  })
})

describe('GET /events/saved', () => {
  it('rechaza sin token', async () => {
    const res = await request(app).get('/events/saved')
    expect(res.status).toBe(401)
  })

  it('devuelve los eventos guardados del usuario', async () => {
    const res = await request(app)
      .get('/events/saved')
      .set('Authorization', `Bearer ${authToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    const saved = res.body.find((e: { event_id: string }) => e.event_id === TEST_EVENT_ID)
    expect(saved).toBeDefined()
  })
})

describe('DELETE /events/save/:id', () => {
  it('rechaza sin token', async () => {
    const res = await request(app).delete(`/events/save/${TEST_EVENT_ID}`)
    expect(res.status).toBe(401)
  })

  it('elimina el guardado correctamente', async () => {
    const res = await request(app)
      .delete(`/events/save/${TEST_EVENT_ID}`)
      .set('Authorization', `Bearer ${authToken}`)
    expect(res.status).toBe(204)
  })
})

describe('POST /events/like', () => {
  it('rechaza sin token', async () => {
    const res = await request(app)
      .post('/events/like')
      .send({ eventId: 'x', eventTitle: 'Test' })
    expect(res.status).toBe(401)
  })

  it('rechaza si faltan campos obligatorios', async () => {
    const res = await request(app)
      .post('/events/like')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ eventId: TEST_EVENT_ID })
    expect(res.status).toBe(400)
  })

  it('registra un like correctamente', async () => {
    const res = await request(app)
      .post('/events/like')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ eventId: TEST_EVENT_ID, eventTitle: TEST_EVENT_TITLE })
    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
  })
})

describe('GET /events/liked', () => {
  it('rechaza sin token', async () => {
    const res = await request(app).get('/events/liked')
    expect(res.status).toBe(401)
  })

  it('devuelve los eventos con like del usuario', async () => {
    const res = await request(app)
      .get('/events/liked')
      .set('Authorization', `Bearer ${authToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})
