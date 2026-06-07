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

beforeEach(() => resetDb())

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
})
