import 'dotenv/config'
import request from 'supertest'
import app from '../app'

const mockFetch = jest.fn()
global.fetch = mockFetch

const NEARBY_OK_RESPONSE = {
  results: [
    {
      place_id: 'ChIJ_abc123',
      name: 'Restaurante Test',
      geometry: { location: { lat: -33.4364, lng: -70.6358 } },
      rating: 4.5,
      types: ['restaurant', 'food'],
    },
  ],
}

const PHOTO_BUFFER = Buffer.from('fake-image-data')

beforeEach(() => {
  mockFetch.mockReset()
})

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

  it('retorna places cuando Google responde correctamente', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => NEARBY_OK_RESPONSE,
    } as Response)

    const res = await request(app)
      .post('/places/search-nearby')
      .send({ location: { lat: -33.4364, lng: -70.6358 }, radius: 500, type: 'restaurant' })

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.places)).toBe(true)
    expect(res.body.places).toHaveLength(1)
    expect(res.body.places[0].name).toBe('Restaurante Test')
  })

  it('retorna 200 con array vacío si Google no encuentra resultados', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ results: [] }),
    } as Response)

    const res = await request(app)
      .post('/places/search-nearby')
      .send({ location: { lat: -33.4364, lng: -70.6358 }, radius: 500, type: 'restaurant' })

    expect(res.status).toBe(200)
    expect(res.body.places).toEqual([])
  })

  it('retorna 500 si Google devuelve error_message', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        results: [],
        error_message: 'API key inválida o sin permisos para Places API',
      }),
    } as Response)

    const res = await request(app)
      .post('/places/search-nearby')
      .send({ location: { lat: -33.4364, lng: -70.6358 }, radius: 500, type: 'restaurant' })

    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/API key|permisos/i)
  })

  it('retorna 500 si fetch lanza una excepción de red', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const res = await request(app)
      .post('/places/search-nearby')
      .send({ location: { lat: -33.4364, lng: -70.6358 }, radius: 500, type: 'restaurant' })

    expect(res.status).toBe(500)
  })
})

describe('GET /places/photo', () => {
  it('rechaza si falta photoReference', async () => {
    const res = await request(app).get('/places/photo')
    expect(res.status).toBe(400)
  })

  it('retorna la imagen si Google responde correctamente', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'image/jpeg' },
      arrayBuffer: async () => PHOTO_BUFFER.buffer,
    } as unknown as Response)

    const res = await request(app)
      .get('/places/photo')
      .query({ photoReference: 'ref-abc123', maxWidth: '400' })

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('image/jpeg')
  })

  it('retorna 500 si Google rechaza la foto', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: { get: () => null },
    } as unknown as Response)

    const res = await request(app)
      .get('/places/photo')
      .query({ photoReference: 'ref-invalida' })

    expect(res.status).toBe(403)
  })
})
