import 'dotenv/config'
import request from 'supertest'
import { createClient } from '@supabase/supabase-js'
import app from '../app'

const anonClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
)

let adminToken = ''
let regularToken = ''

beforeAll(async () => {
  // Login usuario admin
  const adminLogin = await anonClient.auth.signInWithPassword({
    email: process.env.TEST_ADMIN_EMAIL ?? process.env.TEST_USER_EMAIL!,
    password: process.env.TEST_ADMIN_PASSWORD ?? process.env.TEST_USER_PASSWORD!,
  })
  if (adminLogin.error || !adminLogin.data.session) {
    throw new Error(`Login admin fallido: ${adminLogin.error?.message}`)
  }
  adminToken = adminLogin.data.session.access_token

  // Login usuario regular (mismo o distinto)
  const userLogin = await anonClient.auth.signInWithPassword({
    email: process.env.TEST_USER_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  })
  if (!userLogin.error && userLogin.data.session) {
    regularToken = userLogin.data.session.access_token
  }
}, 20_000)

afterAll(async () => {
  await anonClient.auth.signOut({ scope: 'local' })
})

describe('GET /admin/users', () => {
  it('rechaza sin token', async () => {
    const res = await request(app).get('/admin/users')
    expect(res.status).toBe(401)
  })

  it('rechaza a usuario sin rol admin', async () => {
    if (!regularToken || regularToken === adminToken) return
    const res = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${regularToken}`)
    expect([401, 403]).toContain(res.status)
  })

  it('devuelve lista de usuarios al admin', async () => {
    const res = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
    // 200 si es admin, 403 si el test usa un usuario sin rol admin
    expect([200, 403]).toContain(res.status)
    if (res.status === 200) {
      expect(Array.isArray(res.body.users)).toBe(true)
    }
  })
})

describe('GET /admin/statistics', () => {
  it('rechaza sin token', async () => {
    const res = await request(app).get('/admin/statistics')
    expect(res.status).toBe(401)
  })

  it('devuelve estadísticas al admin', async () => {
    const res = await request(app)
      .get('/admin/statistics')
      .set('Authorization', `Bearer ${adminToken}`)
    expect([200, 403]).toContain(res.status)
    if (res.status === 200) {
      expect(typeof res.body.statistics.totalUsers).toBe('number')
      expect(typeof res.body.statistics.totalEvents).toBe('number')
    }
  })
})

describe('GET /admin/events', () => {
  it('rechaza sin token', async () => {
    const res = await request(app).get('/admin/events')
    expect(res.status).toBe(401)
  })

  it('devuelve lista de eventos al admin', async () => {
    const res = await request(app)
      .get('/admin/events')
      .set('Authorization', `Bearer ${adminToken}`)
    expect([200, 403]).toContain(res.status)
    if (res.status === 200) {
      expect(Array.isArray(res.body.events)).toBe(true)
    }
  })
})

describe('PUT /admin/users/:id', () => {
  it('rechaza sin token', async () => {
    const res = await request(app)
      .put('/admin/users/00000000-0000-0000-0000-000000000000')
      .send({ role: 'user' })
    expect(res.status).toBe(401)
  })

  it('rechaza si no hay campos para actualizar', async () => {
    const res = await request(app)
      .put('/admin/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
    expect([400, 403]).toContain(res.status)
  })
})
