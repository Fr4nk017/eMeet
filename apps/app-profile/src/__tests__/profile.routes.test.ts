import 'dotenv/config'
import request from 'supertest'
import { createClient } from '@supabase/supabase-js'
import app from '../app'

const anonClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
)

let authToken = ''

beforeAll(async () => {
  const { data, error } = await anonClient.auth.signInWithPassword({
    email: process.env.TEST_USER_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  })
  if (error || !data.session) throw new Error(`Login fallido: ${error?.message}`)
  authToken = data.session.access_token
}, 15_000)

afterAll(async () => {
  await anonClient.auth.signOut({ scope: 'local' })
})

describe('GET /profile', () => {
  it('rechaza sin token', async () => {
    const res = await request(app).get('/profile')
    expect(res.status).toBe(401)
  })

  it('devuelve el perfil del usuario autenticado', async () => {
    const res = await request(app)
      .get('/profile')
      .set('Authorization', `Bearer ${authToken}`)
    expect([200, 404]).toContain(res.status)
    if (res.status === 200) {
      expect(res.body.id).toBeDefined()
    }
  })
})

describe('PATCH /profile', () => {
  it('rechaza sin token', async () => {
    const res = await request(app).patch('/profile').send({ bio: 'test' })
    expect(res.status).toBe(401)
  })

  it('rechaza si no hay campos para actualizar', async () => {
    const res = await request(app)
      .patch('/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
    expect(res.status).toBe(400)
  })

  it('actualiza el campo bio correctamente', async () => {
    const res = await request(app)
      .patch('/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ bio: 'Bio actualizada por test' })
    expect(res.status).toBe(200)
    expect(res.body.bio).toBe('Bio actualizada por test')
  })
})

describe('GET /profile/stats', () => {
  it('rechaza sin token', async () => {
    const res = await request(app).get('/profile/stats')
    expect(res.status).toBe(401)
  })

  it('devuelve estadísticas del perfil', async () => {
    const res = await request(app)
      .get('/profile/stats')
      .set('Authorization', `Bearer ${authToken}`)
    expect(res.status).toBe(200)
    expect(typeof res.body.followersCount === 'number' || res.body.followersCount === null).toBe(true)
  })
})
