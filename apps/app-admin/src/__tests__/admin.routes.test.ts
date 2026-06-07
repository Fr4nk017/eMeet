import request from 'supertest'
import app from '../app'

// ── Tokens y constantes ───────────────────────────────────────────────────────

const ADMIN_USER_ID = 'admin-uuid-1234'
const USER_ID       = 'user-uuid-5678'
const ADMIN_TOKEN   = 'mock-admin-token'
const USER_TOKEN    = 'mock-user-token'

process.env.SUPABASE_URL              = 'https://mock.supabase.co'
process.env.SUPABASE_ANON_KEY         = 'mock-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key'

// ── Datos en memoria ──────────────────────────────────────────────────────────

let profilesDb: any[]   = []
let eventsDb:   any[]   = []
let userEventsDb: any[] = []

function resetDb() {
  profilesDb = [
    { id: ADMIN_USER_ID, name: 'Admin User', role: 'admin', is_banned: false, created_at: '2024-01-01T00:00:00Z' },
    { id: USER_ID,       name: 'Regular',    role: 'user',  is_banned: false, created_at: '2024-01-02T00:00:00Z' },
  ]
  eventsDb = [
    {
      id: 'event-1',
      title: '[TEST] Evento admin',
      description: 'Desc',
      address: 'Calle 1',
      event_date: '2099-01-01T00:00:00Z',
      organizer_name: 'Suite',
      created_at: '2024-01-01T00:00:00Z',
    },
  ]
  userEventsDb = [
    { id: 'ue-1', user_id: USER_ID, event_id: 'event-1', action: 'like', created_at: '2024-01-01T00:00:00Z' },
  ]
}

resetDb()

// ── Query builder ─────────────────────────────────────────────────────────────

function tableData(table: string): any[] | null {
  if (table === 'profiles')         return profilesDb
  if (table === 'locatario_events') return eventsDb
  if (table === 'user_events')      return userEventsDb
  return null
}

function buildQuery(table: string) {
  const source       = tableData(table) ?? []
  let rows           = [...source]
  const filters: ((r: any) => boolean)[] = []
  let updatePayload: any = null
  let deleteMode         = false
  let countOnly          = false

  const query: any = {
    select: (fields = '*', opts?: any) => {
      if (opts?.count === 'exact') countOnly = true
      return query
    },
    insert: (data: any) => { query._insertPayload = data; return query },
    delete: () => { deleteMode = true; return query },
    update: (data: any) => { updatePayload = data; return query },
    eq:    (col: string, val: any) => { filters.push(r => r[col] === val); return query },
    neq:   (col: string, val: any) => { filters.push(r => r[col] !== val); return query },
    order: () => query,
    limit: () => query,
    single: async () => {
      if (updatePayload) {
        const ref = tableData(table) ?? []
        const idx = ref.findIndex(r => filters.every(f => f(r)))
        if (idx < 0) return { data: null, error: { message: 'Not found' } }
        ref[idx] = { ...ref[idx], ...updatePayload }
        return { data: ref[idx], error: null }
      }
      const r = rows.filter(r => filters.every(f => f(r)))[0]
      return r ? { data: r, error: null } : { data: null, error: { message: 'Not found' } }
    },
    then: (resolve: any) => {
      if (deleteMode) {
        const ref      = tableData(table) ?? []
        const toDelete = ref.filter(r => filters.every(f => f(r)))
        const ids      = new Set(toDelete.map(r => r.id))
        ref.splice(0, ref.length, ...ref.filter(r => !ids.has(r.id)))
        return resolve({ data: toDelete, error: null })
      }
      if (query._insertPayload) {
        const newRow = { id: `mock-${Date.now()}`, created_at: new Date().toISOString(), ...query._insertPayload }
        tableData(table)?.push(newRow)
        return resolve({ data: newRow, error: null })
      }
      const result = rows.filter(r => filters.every(f => f(r)))
      if (countOnly) return resolve({ data: null, count: result.length, error: null })
      return resolve({ data: result, error: null })
    },
  }
  return query
}

// auth.admin simulado — lee profilesDb en tiempo de llamada, no de definición
const mockAuthAdmin = {
  listUsers: async (_opts?: any) => ({
    data: {
      users: profilesDb.map(p => ({
        id: p.id,
        email: `${p.name.toLowerCase().replace(/\s+/g, '.')}@test.com`,
      })),
    },
    error: null,
  }),
  deleteUser: async (id: string) => {
    const idx = profilesDb.findIndex(p => p.id === id)
    if (idx >= 0) profilesDb.splice(idx, 1)
    return { error: null }
  },
}

const mockServiceClient = {
  from:  (table: string) => buildQuery(table),
  auth:  { admin: mockAuthAdmin },
}

const mockUserClient = {
  from: (table: string) => buildQuery(table),
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../../../packages/shared/src/middleware/auth.js', () => ({
  withAuth: (req: any, res: any, next: any) => {
    const header = req.headers.authorization ?? ''
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Falta token de autorización.' })
    }
    const token = header.slice(7)
    if (token === ADMIN_TOKEN) {
      req.authUser = { id: ADMIN_USER_ID, app_metadata: { role: 'admin' }, user_metadata: {} }
      req.supabase = mockUserClient
      return next()
    }
    if (token === USER_TOKEN) {
      req.authUser = { id: USER_ID, app_metadata: {}, user_metadata: {} }
      req.supabase = mockUserClient
      return next()
    }
    return res.status(401).json({ error: 'Sesión inválida o expirada.' })
  },
}))

jest.mock('../../../../packages/shared/src/lib/supabase.js', () => ({
  createServiceRoleClient: () => mockServiceClient,
  createAnonClient:        () => mockUserClient,
}))

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => resetDb())

// ── GET /admin/users ──────────────────────────────────────────────────────────

describe('GET /admin/users', () => {
  it('rechaza sin token', async () => {
    const res = await request(app).get('/admin/users')
    expect(res.status).toBe(401)
  })

  it('rechaza a usuario sin rol admin', async () => {
    const res = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
    expect(res.status).toBe(403)
  })

  it('devuelve lista de usuarios al admin', async () => {
    const res = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.users)).toBe(true)
    expect(res.body.users.length).toBeGreaterThan(0)
  })
})

// ── GET /admin/events ─────────────────────────────────────────────────────────

describe('GET /admin/events', () => {
  it('rechaza sin token', async () => {
    const res = await request(app).get('/admin/events')
    expect(res.status).toBe(401)
  })

  it('devuelve lista de eventos al admin', async () => {
    const res = await request(app)
      .get('/admin/events')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.events)).toBe(true)
    expect(res.body.events.length).toBeGreaterThan(0)
  })
})

// ── GET /admin/statistics ─────────────────────────────────────────────────────

describe('GET /admin/statistics', () => {
  it('rechaza sin token', async () => {
    const res = await request(app).get('/admin/statistics')
    expect(res.status).toBe(401)
  })

  it('devuelve estadísticas al admin', async () => {
    const res = await request(app)
      .get('/admin/statistics')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
    expect(res.status).toBe(200)
    expect(typeof res.body.statistics.totalUsers).toBe('number')
    expect(typeof res.body.statistics.totalEvents).toBe('number')
    expect(typeof res.body.statistics.totalLikes).toBe('number')
    expect(typeof res.body.statistics.bannedUsers).toBe('number')
  })
})

// ── PUT /admin/users/:id ──────────────────────────────────────────────────────

describe('PUT /admin/users/:id', () => {
  it('rechaza sin token', async () => {
    const res = await request(app)
      .put(`/admin/users/${USER_ID}`)
      .send({ role: 'user' })
    expect(res.status).toBe(401)
  })

  it('rechaza si no hay campos para actualizar', async () => {
    const res = await request(app)
      .put(`/admin/users/${USER_ID}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({})
    expect(res.status).toBe(400)
  })

  it('actualiza el rol de un usuario', async () => {
    const res = await request(app)
      .put(`/admin/users/${USER_ID}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ role: 'locatario' })
    expect(res.status).toBe(200)
    expect(res.body.user.role).toBe('locatario')
  })

  it('puede banear a un usuario', async () => {
    const res = await request(app)
      .put(`/admin/users/${USER_ID}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ is_banned: true })
    expect(res.status).toBe(200)
    expect(res.body.user.is_banned).toBe(true)
  })
})

// ── DELETE /admin/events/:id ──────────────────────────────────────────────────

describe('DELETE /admin/events/:id', () => {
  it('rechaza sin token', async () => {
    const res = await request(app).delete('/admin/events/event-1')
    expect(res.status).toBe(401)
  })

  it('elimina un evento', async () => {
    const res = await request(app)
      .delete('/admin/events/event-1')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
    expect(res.status).toBe(200)
    expect(res.body.message).toBeDefined()
  })
})
