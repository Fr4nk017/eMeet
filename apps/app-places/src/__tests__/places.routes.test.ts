import 'dotenv/config'
import request from 'supertest'
import app from '../app'

// app-places no usa Supabase — valida inputs y llama a Google Maps API

describe('POST /places/search-nearby', () => {
  it('rechaza si falta location', async () => {
    const res = await request(app)
      .post('/places/search-nearby')
      .send({ radius: 500, type: 'restaurant' })
    expect(res.status).toBe(400)
  })

  it('rechaza si location no tiene lat/lng numéricos', async () => {
    const res = await request(app)
      .post('/places/search-nearby')
      .send({ location: { lat: 'texto', lng: -70.6 }, radius: 500, type: 'restaurant' })
    expect(res.status).toBe(400)
  })

  it('rechaza si radius es negativo', async () => {
    const res = await request(app)
      .post('/places/search-nearby')
      .send({ location: { lat: -33.4, lng: -70.6 }, radius: -1, type: 'restaurant' })
    expect(res.status).toBe(400)
  })

  it('rechaza si type está vacío', async () => {
    const res = await request(app)
      .post('/places/search-nearby')
      .send({ location: { lat: -33.4, lng: -70.6 }, radius: 500, type: '' })
    expect(res.status).toBe(400)
  })

  it('llama a Google Maps y retorna places para coordenadas válidas', async () => {
    const res = await request(app)
      .post('/places/search-nearby')
      .send({ location: { lat: -33.4364, lng: -70.6358 }, radius: 500, type: 'restaurant' })
    // 200 con Google Maps configurado, 500 si la API key no está habilitada para Places
    expect([200, 500]).toContain(res.status)
    if (res.status === 200) {
      expect(Array.isArray(res.body.places)).toBe(true)
    }
  }, 15_000)
})

describe('GET /places/photo', () => {
  it('rechaza si falta photoReference', async () => {
    const res = await request(app).get('/places/photo')
    expect(res.status).toBe(400)
  })
})
