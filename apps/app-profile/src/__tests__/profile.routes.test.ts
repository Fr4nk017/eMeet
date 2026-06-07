import request from 'supertest'
import app from '../app'

// ── Constantes ────────────────────────────────────────────────────────────────

const USER_ID    = 'test-user-uuid-1234'
const AUTH_TOKEN = 'mock-valid-token'

process.env.SUPABASE_URL              = 'https://mock.supabase.co'
process.env.SUPABASE_ANON_KEY         = 'mock-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key'

// ── Datos en memoria ──────────────────────────────────────────────────────────

let profilesDb: any[] = []

function resetDb() {
  profilesDb = [
    {
      id: USER_ID,
      name: 'Test User',
      bio: 'Bio inicial',
      location: 'Santiago',
      interests: [],
      avatar_url: null,
      created_at: '2024-01-01T00:00:00Z',
    },
  ]
}

resetDb()

// ── Query builder ─────────────────────────────────────────────────────────────

function buildQuery(table: string) {
  const filters: ((r: any) => boolean)[] = []
  let updatePayload: any = null
  let countOnly          = false

  const query: any = {
    select: (_fields = '*', opts?: any) => {
      if (opts?.count === 'exact') countOnly = true
      return query
    },
    update: (data: any) => { updatePayload = data; return query },
    eq:     (col: string, val: any) => { filters.push(r => r[col] === val); return query },
    order:  () => query,
    single: async () => {
      if (updatePayload) {
        const idx = profilesDb.findIndex(r => filters.every(f => f(r)))
        if (idx < 0) return { data: null, error: { message: 'Not found' } }
        profilesDb[idx] = { ...profilesDb[idx], ...updatePayload }
        return { data: profilesDb[idx], error: null }
      }
      const r = profilesDb.filter(r => filters.every(f => f(r)))[0]
      return r ? { data: r, error: null } : { data: null, error: { message: 'Not found' } }
    },
    maybeSingle: async () => {
      const r = profilesDb.filter(r => filters.every(f => f(r)))[0]
      return { data: r ?? null, error: null }
    },
    then: (resolve: any) => {
      if (table === 'profile_followers') {
        // La tabla puede no existir; devolvemos count 0 como si estuviera vacía
        if (countOnly) return resolve({ data: null, count: 0, error: null })
        return resolve({ data: [], error: null })
      }
      const result = profilesDb.filter(r => filters.every(f => f(r)))
      if (countOnly) return resolve({ data: null, count: result.length, error: null })
      return resolve({ data: result, error: null })
    },
  }
  return query
}

const mockUserClient = { from: (table: string) => buildQuery(table) }

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../../../packages/shared/src/middleware/auth.js', () => ({
  withAuth: (req: any, res: any, next: any) => {
    const header = req.headers.authorization ?? ''
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Falta token de autorización.' })
    }
    const token = header.slice(7)
    if (token !== AUTH_TOKEN) {
      return res.status(401).json({ error: 'Sesión inválida o expirada.' })
    }
    req.authUser = { id: USER_ID, email: 'test@emeet.cl' }
    req.supabase = mockUserClient
    next()
  },
}))

jest.mock('../../../../packages/shared/src/lib/supabase.js', () => ({
  createServiceRoleClient: () => mockUserClient,
  createAnonClient:        () => mockUserClient,
}))

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => resetDb())

// ── GET /profile ──────────────────────────────────────────────────────────────

describe('GET /profile', () => {
  it('rechaza sin token', async () => {
    const res = await request(app).get('/profile')
    expect(res.status).toBe(401)
  })

  it('devuelve el perfil del usuario autenticado', async () => {
    const res = await request(app)
      .get('/profile')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(USER_ID)
  })

  it('devuelve 404 si el perfil no existe', async () => {
    profilesDb = [] // vaciar la DB
    const res = await request(app)
      .get('/profile')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
    expect(res.status).toBe(404)
  })
})

// ── PATCH /profile ────────────────────────────────────────────────────────────

describe('PATCH /profile', () => {
  it('rechaza sin token', async () => {
    const res = await request(app).patch('/profile').send({ bio: 'test' })
    expect(res.status).toBe(401)
  })

  it('rechaza si no hay campos para actualizar', async () => {
    const res = await request(app)
      .patch('/profile')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({})
    expect(res.status).toBe(400)
  })

  it('actualiza el campo bio correctamente', async () => {
    const res = await request(app)
      .patch('/profile')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ bio: 'Bio actualizada por test' })
    expect(res.status).toBe(200)
    expect(res.body.bio).toBe('Bio actualizada por test')
  })

  it('actualiza múltiples campos a la vez', async () => {
    const res = await request(app)
      .patch('/profile')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ name: 'Nuevo nombre', location: 'Valparaíso' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Nuevo nombre')
    expect(res.body.location).toBe('Valparaíso')
  })
})

// ── GET /profile/stats ────────────────────────────────────────────────────────

describe('GET /profile/stats', () => {
  it('rechaza sin token', async () => {
    const res = await request(app).get('/profile/stats')
    expect(res.status).toBe(401)
  })

  it('devuelve estadísticas del perfil', async () => {
    const res = await request(app)
      .get('/profile/stats')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
    expect(res.status).toBe(200)
    expect(
      typeof res.body.followersCount === 'number' || res.body.followersCount === null
    ).toBe(true)
  })
})
