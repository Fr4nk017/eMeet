import 'dotenv/config'
import { describe, expect, it } from '@jest/globals'
import request from 'supertest'
import app from '../app'

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD
const hasAuthTestUser = Boolean(TEST_USER_EMAIL && TEST_USER_PASSWORD)
const itIfAuthUser = hasAuthTestUser ? it : it.skip

describe('POST /auth/login', () => {
  it('rechaza si faltan credenciales', async () => {
    const res = await request(app).post('/auth/login').send({})
    expect(res.status).toBe(400)
  })

  it('rechaza con credenciales incorrectas', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'noexiste@test.com', password: 'contraseña-incorrecta' })
    expect(res.status).toBe(400)
  })

  itIfAuthUser('autentica con credenciales válidas', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD })
    expect(res.status).toBe(200)
    expect(res.body.session?.access_token).toBeDefined()
    expect(res.body.user?.id).toBeDefined()
  })
})

describe('POST /auth/register', () => {
  it('rechaza si faltan campos obligatorios', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'test@test.com' })
    expect(res.status).toBe(400)
  })

  it('rechaza contraseña menor a 6 caracteres', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Test', email: 'test@test.com', password: '123' })
    expect(res.status).toBe(400)
  })
})

describe('GET /auth/session', () => {
  it('devuelve session null si no hay token', async () => {
    const res = await request(app).get('/auth/session')
    expect(res.status).toBe(200)
    expect(res.body.session).toBeNull()
  })

  itIfAuthUser('devuelve session válida con token correcto', async () => {
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD })

    const token = loginRes.body.session?.access_token
    const res = await request(app)
      .get('/auth/session')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.session).not.toBeNull()
  })
})

describe('POST /auth/logout', () => {
  itIfAuthUser('cierra sesión con token válido', async () => {
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD })

    const token = loginRes.body.session?.access_token
    const res = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(204)
  })
})
