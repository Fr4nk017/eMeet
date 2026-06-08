import request from 'supertest'
import app from '../app'

// ── Constantes ────────────────────────────────────────────────────────────────

const USER_ID    = 'test-user-uuid-9999'
const AUTH_TOKEN = 'mock-valid-token'

process.env.SUPABASE_URL              = 'https://mock.supabase.co'
process.env.SUPABASE_ANON_KEY         = 'mock-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key'

// ── Datos en memoria ──────────────────────────────────────────────────────────

let profilesDb:     any[] = []
let userEventsDb:   any[] = []
let chatRoomsDb:    any[] = []
let roomMembersDb:  any[] = []

function resetDb() {
  profilesDb    = []
  chatRoomsDb   = []
  roomMembersDb = []
  userEventsDb  = [
    {
      id: 'ue-save-1',
      user_id: USER_ID,
      event_id: 'existing-saved-event',
      event_title: '[TEST] Ya guardado',
      action: 'save',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'ue-like-1',
      user_id: USER_ID,
      event_id: 'existing-liked-event',
      event_title: '[TEST] Ya likeado',
      action: 'like',
      created_at: '2024-01-01T00:00:00Z',
    },
  ]
}

resetDb()

// ── Error injection ──────────────────────────────────────────────────────────
// Permite que tests individuales simulen errores de BD sin refactorizar el mock.

interface ErrorInject {
  table: string
  op: 'upsert' | 'insert' | 'delete' | 'select'
  error: any
  maxFires?: number  // cuántas veces inyectar el error (default: infinito)
}

let _injectError: ErrorInject | null = null
let _fireCount = 0

function setError(e: ErrorInject | null) {
  _injectError = e
  _fireCount   = 0
}

// ── Query builder ─────────────────────────────────────────────────────────────

function tableData(table: string): any[] | null {
  if (table === 'profiles')     return profilesDb
  if (table === 'user_events')  return userEventsDb
  if (table === 'chat_rooms')   return chatRoomsDb
  if (table === 'room_members') return roomMembersDb
  return null
}

function buildQuery(table: string) {
  const filters: ((r: any) => boolean)[] = []
  let insertPayload: any  = null
  let upsertPayload: any  = null
  let updatePayload: any  = null
  let deleteMode          = false

  const query: any = {
    select: () => query,
    insert: (data: any) => { insertPayload = data; return query },
    upsert: (data: any, _opts?: any) => { upsertPayload = data; return query },
    update: (data: any) => { updatePayload = data; return query },
    delete: () => { deleteMode = true; return query },
    eq:    (col: string, val: any) => { filters.push(r => r[col] === val); return query },
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
      const r = (tableData(table) ?? []).filter(r => filters.every(f => f(r)))[0]
      return r ? { data: r, error: null } : { data: null, error: { message: 'Not found' } }
    },
    then: (resolve: any) => {
      const ref = tableData(table) ?? []
      const currentOp: ErrorInject['op'] = deleteMode ? 'delete'
        : upsertPayload ? 'upsert'
        : insertPayload ? 'insert'
        : 'select'

      if (
        _injectError &&
        _injectError.table === table &&
        _injectError.op   === currentOp &&
        _fireCount < (_injectError.maxFires ?? Infinity)
      ) {
        _fireCount++
        return resolve({ data: null, error: _injectError.error })
      }

      if (deleteMode) {
        const toDelete = ref.filter(r => filters.every(f => f(r)))
        const ids = new Set(toDelete.map(r => r.id))
        ref.splice(0, ref.length, ...ref.filter(r => !ids.has(r.id)))
        return resolve({ data: toDelete, error: null })
      }

      if (upsertPayload) {
        const items = Array.isArray(upsertPayload) ? upsertPayload : [upsertPayload]
        for (const item of items) {
          const idx = ref.findIndex(r => r.id === item.id)
          if (idx >= 0) Object.assign(ref[idx], item)
          else ref.push({ created_at: new Date().toISOString(), ...item })
        }
        return resolve({ data: items, error: null })
      }

      if (insertPayload) {
        const newRow = { id: `mock-${Date.now()}`, created_at: new Date().toISOString(), ...insertPayload }
        ref.push(newRow)
        return resolve({ data: newRow, error: null })
      }

      const result = ref.filter(r => filters.every(f => f(r)))
      return resolve({ data: result, error: null })
    },
  }
  return query
}

const mockSupabaseClient = { from: (table: string) => buildQuery(table) }
const mockUserClient     = { from: (table: string) => buildQuery(table) }

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
    req.authUser = { id: USER_ID, email: 'test@emeet.cl', user_metadata: { name: 'Test User' } }
    req.supabase = mockUserClient
    next()
  },
}))

jest.mock('../../../../packages/shared/src/lib/supabase.js', () => ({
  createServiceRoleClient: () => mockSupabaseClient,
  createAnonClient:        () => mockUserClient,
}))

jest.mock('@emeet/redis', () => ({
  cacheLikedEvent:        async () => {},
  generateRecommendations: async (_id: string, events: any[], limit = 5) =>
    events.slice(0, limit).map(e => ({ ...e, similarity: 0 })),
}))

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetDb()
  setError(null)
})

// ── POST /events/save ─────────────────────────────────────────────────────────

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
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ eventId: 'solo-id-sin-titulo' })
    expect(res.status).toBe(400)
  })

  it('guarda un evento correctamente', async () => {
    const res = await request(app)
      .post('/events/save')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ eventId: 'new-event-id', eventTitle: '[TEST] Evento guardado', eventAddress: 'Dirección test' })
    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
  })

  it('devuelve 500 si ensureProfile falla', async () => {
    setError({ table: 'profiles', op: 'upsert', error: { message: 'FK violation', code: '23503' } })
    const res = await request(app)
      .post('/events/save')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ eventId: 'x', eventTitle: 'Test' })
    expect(res.status).toBe(500)
  })

  it('devuelve 500 si writeUserEvent falla', async () => {
    setError({ table: 'user_events', op: 'delete', error: { message: 'Permission denied' } })
    const res = await request(app)
      .post('/events/save')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ eventId: 'x', eventTitle: 'Test' })
    expect(res.status).toBe(500)
  })

  it('reintenta con UUID estable si el insert falla con error 22P02', async () => {
    setError({ table: 'user_events', op: 'insert', error: { code: '22P02', message: 'invalid uuid' }, maxFires: 1 })
    const res = await request(app)
      .post('/events/save')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ eventId: 'non-uuid-string-id', eventTitle: 'Test fallback' })
    expect(res.status).toBe(201)
  })
})

// ── GET /events/saved ─────────────────────────────────────────────────────────

describe('GET /events/saved', () => {
  it('rechaza sin token', async () => {
    const res = await request(app).get('/events/saved')
    expect(res.status).toBe(401)
  })

  it('devuelve los eventos guardados del usuario', async () => {
    const res = await request(app)
      .get('/events/saved')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    const saved = res.body.find((e: any) => e.event_id === 'existing-saved-event')
    expect(saved).toBeDefined()
  })

  it('devuelve 500 si falla la consulta a la BD', async () => {
    setError({ table: 'user_events', op: 'select', error: { message: 'Connection error' } })
    const res = await request(app)
      .get('/events/saved')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
    expect(res.status).toBe(500)
  })
})

// ── DELETE /events/save/:id ───────────────────────────────────────────────────

describe('DELETE /events/save/:id', () => {
  it('rechaza sin token', async () => {
    const res = await request(app).delete('/events/save/existing-saved-event')
    expect(res.status).toBe(401)
  })

  it('elimina el guardado correctamente', async () => {
    const res = await request(app)
      .delete('/events/save/existing-saved-event')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
    expect(res.status).toBe(204)
  })

  it('devuelve 500 si hay error de base de datos', async () => {
    setError({ table: 'user_events', op: 'delete', error: { message: 'DB error' } })
    const res = await request(app)
      .delete('/events/save/existing-saved-event')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
    expect(res.status).toBe(500)
  })
})

// ── POST /events/like ─────────────────────────────────────────────────────────

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
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ eventId: 'solo-id-sin-titulo' })
    expect(res.status).toBe(400)
  })

  it('registra un like correctamente', async () => {
    const res = await request(app)
      .post('/events/like')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({
        eventId: 'new-like-event-id',
        eventTitle: '[TEST] Evento likeado',
        eventType: 'musica',
        eventLat: -33.4,
        eventLng: -70.6,
        eventDistance: 500,
      })
    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
  })

  it('devuelve 500 si ensureProfile falla', async () => {
    setError({ table: 'profiles', op: 'upsert', error: { message: 'DB error', code: '23503' } })
    const res = await request(app)
      .post('/events/like')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ eventId: 'x', eventTitle: 'Test' })
    expect(res.status).toBe(500)
  })

  it('devuelve 500 si writeUserEvent falla', async () => {
    setError({ table: 'user_events', op: 'delete', error: { message: 'Permission denied' } })
    const res = await request(app)
      .post('/events/like')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ eventId: 'x', eventTitle: 'Test' })
    expect(res.status).toBe(500)
  })

  it('registra like aunque falle el upsert del chat room', async () => {
    setError({ table: 'chat_rooms', op: 'upsert', error: { message: 'Chat DB error' } })
    const res = await request(app)
      .post('/events/like')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ eventId: 'x', eventTitle: 'Test' })
    expect(res.status).toBe(201)
    expect(res.body.chatLinked).toBe(false)
  })

  it('registra like aunque falle el upsert de room_members', async () => {
    setError({ table: 'room_members', op: 'upsert', error: { message: 'Room member error' } })
    const res = await request(app)
      .post('/events/like')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ eventId: 'x', eventTitle: 'Test' })
    expect(res.status).toBe(201)
    expect(res.body.chatLinked).toBe(false)
  })

  it('usa payload legacy si el primer upsert de perfil falla con código 42703', async () => {
    setError({ table: 'profiles', op: 'upsert', error: { code: '42703', message: 'column not found' }, maxFires: 1 })
    const res = await request(app)
      .post('/events/like')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ eventId: 'x', eventTitle: 'Test' })
    expect(res.status).toBe(201)
  })
})

// ── GET /events/liked ─────────────────────────────────────────────────────────

describe('GET /events/liked', () => {
  it('rechaza sin token', async () => {
    const res = await request(app).get('/events/liked')
    expect(res.status).toBe(401)
  })

  it('devuelve los eventos con like del usuario', async () => {
    const res = await request(app)
      .get('/events/liked')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    const liked = res.body.find((e: any) => e.event_id === 'existing-liked-event')
    expect(liked).toBeDefined()
  })

  it('devuelve 500 si falla la consulta a la BD', async () => {
    setError({ table: 'user_events', op: 'select', error: { message: 'Connection error' } })
    const res = await request(app)
      .get('/events/liked')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
    expect(res.status).toBe(500)
  })
})

// ── DELETE /events/like/:id ───────────────────────────────────────────────────

describe('DELETE /events/like/:id', () => {
  it('rechaza sin token', async () => {
    const res = await request(app).delete('/events/like/existing-liked-event')
    expect(res.status).toBe(401)
  })

  it('elimina el like correctamente', async () => {
    const res = await request(app)
      .delete('/events/like/existing-liked-event')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
    expect(res.status).toBe(204)
  })

  it('devuelve 500 si hay error de base de datos', async () => {
    setError({ table: 'user_events', op: 'delete', error: { message: 'DB error' } })
    const res = await request(app)
      .delete('/events/like/existing-liked-event')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
    expect(res.status).toBe(500)
  })

  it('reintenta con UUID estable si el primer delete falla con error 22P02', async () => {
    setError({ table: 'user_events', op: 'delete', error: { code: '22P02', message: 'invalid input syntax for uuid' }, maxFires: 1 })
    const res = await request(app)
      .delete('/events/like/non-uuid-event-id')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
    expect(res.status).toBe(204)
  })
})

// ── POST /events/recommendations ─────────────────────────────────────────────

describe('POST /events/recommendations', () => {
  it('rechaza sin token', async () => {
    const res = await request(app)
      .post('/events/recommendations')
      .send({ availableEvents: [] })
    expect(res.status).toBe(401)
  })

  it('rechaza si availableEvents no es un array', async () => {
    const res = await request(app)
      .post('/events/recommendations')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ availableEvents: 'not-an-array' })
    expect(res.status).toBe(400)
  })

  it('rechaza si no se envía availableEvents', async () => {
    const res = await request(app)
      .post('/events/recommendations')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({})
    expect(res.status).toBe(400)
  })

  it('devuelve recomendaciones basadas en eventos disponibles', async () => {
    const availableEvents = [
      { id: 'ev-1', type: 'musica',  lat: -33.4, lng: -70.6, distance: 100 },
      { id: 'ev-2', type: 'cultura', lat: -33.5, lng: -70.7, distance: 200 },
    ]
    const res = await request(app)
      .post('/events/recommendations')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ availableEvents, limit: 2 })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.recommendations)).toBe(true)
    expect(typeof res.body.count).toBe('number')
  })
})
