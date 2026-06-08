import request from 'supertest'
import app from '../app'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const TEST_USER_ID = 'test-user-uuid-1234'
const AUTH_TOKEN   = 'mock-valid-token'
const CRON_SECRET  = 'mock-cron-secret'

process.env.CRON_SECRET    = CRON_SECRET
process.env.SUPABASE_URL   = 'https://mock.supabase.co'
process.env.SUPABASE_ANON_KEY          = 'mock-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY  = 'mock-service-key'

// Mock del middleware de auth — inyecta usuario falso si el token es válido
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
    req.authUser = { id: TEST_USER_ID, email: 'test@emeet.cl' }
    req.supabase = mockSupabaseUserClient
    next()
  },
}))

// Datos en memoria que simulan la base de datos
let eventsDb: any[] = []

function resetDb() {
  eventsDb = [
    {
      id: 'past-event-id',
      creator_id: TEST_USER_ID,
      title: '[TEST] Evento pasado',
      description: 'Pasado',
      category: 'musica',
      event_date: '2000-01-01T00:00:00Z',
      address: 'Calle Test 123',
      organizer_name: 'Test Suite',
      price: null, image_url: null, video_url: null, audio_url: null,
      organizer_avatar: null, lat: null, lng: null,
      created_at: '2000-01-01T00:00:00Z',
    },
    {
      id: 'future-event-id',
      creator_id: TEST_USER_ID,
      title: '[TEST] Evento futuro',
      description: 'Futuro',
      category: 'cultura',
      event_date: '2099-12-31T23:59:00Z',
      address: 'Av. Providencia 1234',
      organizer_name: 'Test Suite',
      price: null, image_url: null, video_url: null, audio_url: null,
      organizer_avatar: null, lat: null, lng: null,
      created_at: '2024-01-01T00:00:00Z',
    },
  ]
}

resetDb()

// ── Error injection ──────────────────────────────────────────────────────────

interface ErrorInject {
  table: string
  op: 'insert' | 'update' | 'delete' | 'select'
  error: any
}

let _injectError: ErrorInject | null = null

function setError(e: ErrorInject | null) {
  _injectError = e
}

// ── Builder de query ──────────────────────────────────────────────────────────

function buildQuery(table: string) {
  let rows = [...eventsDb]
  let filters: ((r: any) => boolean)[] = []
  let insertPayload: any = null
  let updateMode        = false
  let deleteMode        = false
  let selectFields      = '*'

  const query: any = {
    select: (fields = '*') => { selectFields = fields; return query },
    insert: (data: any) => { insertPayload = data; updateMode = false; return query },
    delete: () => { deleteMode = true; return query },
    update: (data: any) => { insertPayload = data; updateMode = true; return query },
    eq:  (col: string, val: any) => { filters.push(r => r[col] === val); return query },
    neq: (col: string, val: any) => { filters.push(r => r[col] !== val); return query },
    gte: (col: string, val: any) => { filters.push(r => r[col] >= val); return query },
    lt:  (col: string, val: any) => { filters.push(r => r[col] <  val); return query },
    in:  (col: string, vals: any[]) => { filters.push(r => vals.includes(r[col])); return query },
    order: () => query,
    limit: () => query,
    single: async () => {
      const currentOp = updateMode ? 'update' : insertPayload ? 'insert' : 'select'
      if (_injectError && _injectError.table === table && _injectError.op === currentOp) {
        return { data: null, error: _injectError.error }
      }
      if (insertPayload) {
        const newRow = { id: `mock-id-${Date.now()}`, created_at: new Date().toISOString(), ...insertPayload }
        eventsDb.push(newRow)
        return { data: newRow, error: null }
      }
      const r = rows.filter(r => filters.every(f => f(r)))[0]
      return r ? { data: r, error: null } : { data: null, error: { message: 'Not found' } }
    },
    maybeSingle: async () => {
      const r = rows.filter(r => filters.every(f => f(r)))[0]
      return { data: r ?? null, error: null }
    },
    then: (resolve: any) => {
      const now = new Date().toISOString()
      const currentOp = deleteMode ? 'delete' : 'select'

      if (_injectError && _injectError.table === table && _injectError.op === currentOp) {
        return resolve({ data: null, error: _injectError.error })
      }

      if (deleteMode) {
        const before = rows.length
        const toDelete = rows.filter(r => filters.every(f => f(r)))
        eventsDb = eventsDb.filter(r => !toDelete.includes(r))
        rows = [...eventsDb]
        const count = before - rows.length
        return resolve({ data: toDelete, count, error: null })
      }

      if (insertPayload) {
        const newRow = { id: `mock-id-${Date.now()}`, created_at: now, ...insertPayload }
        eventsDb.push(newRow)
        return resolve({ data: newRow, error: null })
      }

      const result = rows.filter(r => filters.every(f => f(r)))
      return resolve({ data: result, error: null })
    },
  }
  return query
}

// ── Storage mock ──────────────────────────────────────────────────────────────

const mockSignedUrl = { signedUrl: 'https://storage.mock/signed', token: 'tok', path: 'user/123.jpg' }
const mockPublicUrl = { publicUrl: 'https://storage.mock/public/user/123.jpg' }

const mockCreateSignedUploadUrl = jest.fn()
const mockStorageUpload         = jest.fn()
const mockGetPublicUrl          = jest.fn()
const mockCreateBucket          = jest.fn()
const mockUpdateBucket          = jest.fn()

const mockStorage = {
  createBucket: mockCreateBucket,
  updateBucket: mockUpdateBucket,
  from: jest.fn(() => ({
    createSignedUploadUrl: mockCreateSignedUploadUrl,
    getPublicUrl: mockGetPublicUrl,
    upload: mockStorageUpload,
  })),
}

const mockSupabaseClient     = { from: (table: string) => buildQuery(table), storage: mockStorage }
const mockSupabaseUserClient = { from: (table: string) => buildQuery(table), storage: mockStorage }

jest.mock('../../../../packages/shared/src/lib/supabase.js', () => ({
  createServiceRoleClient: () => mockSupabaseClient,
  createAnonClient: () => mockSupabaseUserClient,
}))

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetDb()
  setError(null)
  mockCreateSignedUploadUrl.mockResolvedValue({ data: mockSignedUrl, error: null })
  mockStorageUpload.mockResolvedValue({ error: null })
  mockGetPublicUrl.mockReturnValue({ data: mockPublicUrl })
  mockCreateBucket.mockResolvedValue({ error: null })
  mockUpdateBucket.mockResolvedValue({ error: null })
})

// ── GET /events/public ───────────────────────────────────────────────────────

describe('GET /events/public', () => {
  it('devuelve solo eventos con fecha futura', async () => {
    const res = await request(app).get('/events/public')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    const titles = res.body.map((e: any) => e.title)
    expect(titles).toContain('[TEST] Evento futuro')
    expect(titles).not.toContain('[TEST] Evento pasado')
  })

  it('los eventos están ordenados por fecha ascendente', async () => {
    const res = await request(app).get('/events/public')

    expect(res.status).toBe(200)
    const dates: string[] = res.body.map((e: any) => e.event_date)
    expect(dates).toEqual([...dates].sort())
  })
})

// ── GET /events/cleanup ──────────────────────────────────────────────────────

describe('GET /events/cleanup', () => {
  it('rechaza sin CRON_SECRET correcto', async () => {
    const res = await request(app)
      .get('/events/cleanup')
      .set('Authorization', 'Bearer secreto-incorrecto')

    expect(res.status).toBe(401)
  })

  it('elimina eventos pasados', async () => {
    const res = await request(app)
      .get('/events/cleanup')
      .set('Authorization', `Bearer ${CRON_SECRET}`)

    expect(res.status).toBe(200)
    expect(typeof res.body.deleted).toBe('number')
    expect(res.body.deleted).toBeGreaterThanOrEqual(1)
  })
})

// ── POST /events/locatario ───────────────────────────────────────────────────

describe('POST /events/locatario', () => {
  it('crea un evento con datos válidos', async () => {
    const res = await request(app)
      .post('/events/locatario')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({
        title: 'Evento de prueba',
        description: 'Descripción',
        category: 'networking',
        event_date: '2099-03-15T19:00:00Z',
        address: 'Teatinos 120',
        organizer_name: 'Test',
      })

    expect(res.status).toBe(201)
    expect(res.body.title).toBe('Evento de prueba')
    expect(res.body.id).toBeDefined()
  })

  it('rechaza si faltan campos obligatorios', async () => {
    const res = await request(app)
      .post('/events/locatario')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ title: 'Sin fecha ni categoría' })

    expect(res.status).toBe(400)
  })

  it('rechaza sin token', async () => {
    const res = await request(app)
      .post('/events/locatario')
      .send({ title: 'x', description: 'x', category: 'musica', event_date: '2099-01-01' })

    expect(res.status).toBe(401)
  })

  it('devuelve 500 si falla el insert en la BD', async () => {
    setError({ table: 'locatario_events', op: 'insert', error: { message: 'DB insert error' } })
    const res = await request(app)
      .post('/events/locatario')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({
        title: 'Test',
        description: 'Desc',
        category: 'musica',
        event_date: '2099-01-01T00:00:00Z',
        address: 'Calle',
        organizer_name: 'Test',
      })

    expect(res.status).toBe(500)
  })
})

// ── GET /events/locatario ────────────────────────────────────────────────────

describe('GET /events/locatario', () => {
  it('devuelve los eventos del usuario autenticado', async () => {
    const res = await request(app)
      .get('/events/locatario')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('rechaza sin token', async () => {
    const res = await request(app).get('/events/locatario')
    expect(res.status).toBe(401)
  })

  it('devuelve 500 si falla la consulta a la BD', async () => {
    setError({ table: 'locatario_events', op: 'select', error: { message: 'DB error' } })
    const res = await request(app)
      .get('/events/locatario')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)

    expect(res.status).toBe(500)
  })
})

// ── PATCH /events/locatario/:id ──────────────────────────────────────────────

describe('PATCH /events/locatario/:id', () => {
  it('actualiza campos del evento', async () => {
    const res = await request(app)
      .patch('/events/locatario/future-event-id')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ title: 'Título actualizado', address: 'Nueva dirección 456' })

    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Título actualizado')
  })

  it('rechaza si no se envía ningún campo', async () => {
    const res = await request(app)
      .patch('/events/locatario/future-event-id')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({})

    expect(res.status).toBe(400)
  })

  it('rechaza sin token', async () => {
    const res = await request(app)
      .patch('/events/locatario/future-event-id')
      .send({ title: 'x' })

    expect(res.status).toBe(401)
  })

  it('actualiza fecha y categoría del evento', async () => {
    const res = await request(app)
      .patch('/events/locatario/future-event-id')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ category: 'gastronomia', event_date: '2099-06-15T20:00:00Z' })

    expect(res.status).toBe(200)
  })

  it('devuelve 500 si falla el update en la BD', async () => {
    setError({ table: 'locatario_events', op: 'update', error: { message: 'DB update error' } })
    const res = await request(app)
      .patch('/events/locatario/future-event-id')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ title: 'x' })

    expect(res.status).toBe(500)
  })
})

// ── DELETE /events/locatario/:id ─────────────────────────────────────────────

describe('DELETE /events/locatario/:id', () => {
  it('elimina un evento propio', async () => {
    const res = await request(app)
      .delete('/events/locatario/future-event-id')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)

    expect(res.status).toBe(204)
  })

  it('rechaza sin token', async () => {
    const res = await request(app).delete('/events/locatario/future-event-id')
    expect(res.status).toBe(401)
  })

  it('devuelve 500 si falla el delete en la BD', async () => {
    setError({ table: 'locatario_events', op: 'delete', error: { message: 'DB delete error' } })
    const res = await request(app)
      .delete('/events/locatario/future-event-id')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)

    expect(res.status).toBe(500)
  })
})

// ── POST /events/upload-url ───────────────────────────────────────────────────

describe('POST /events/upload-url', () => {
  it('genera URL firmada para imagen', async () => {
    const res = await request(app)
      .post('/events/upload-url')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ fileName: 'foto.jpg', mimeType: 'image/jpeg' })

    expect(res.status).toBe(200)
    expect(res.body.signedUrl).toBeDefined()
    expect(res.body.publicUrl).toBeDefined()
  })

  it('genera URL firmada para video', async () => {
    const res = await request(app)
      .post('/events/upload-url')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ fileName: 'video.mp4', mimeType: 'video/mp4' })

    expect(res.status).toBe(200)
    expect(res.body.signedUrl).toBeDefined()
  })

  it('rechaza si no se envía mimeType', async () => {
    const res = await request(app)
      .post('/events/upload-url')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ fileName: 'foto.jpg' })

    expect(res.status).toBe(400)
  })

  it('rechaza mimeType no permitido (PDF)', async () => {
    const res = await request(app)
      .post('/events/upload-url')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ fileName: 'doc.pdf', mimeType: 'application/pdf' })

    expect(res.status).toBe(400)
  })

  it('rechaza sin token', async () => {
    const res = await request(app)
      .post('/events/upload-url')
      .send({ mimeType: 'image/jpeg' })

    expect(res.status).toBe(401)
  })

  // Casos que cubren las ramas de getExtension() para tipos sin extensión explícita

  it('genera URL para PNG sin nombre de archivo', async () => {
    const res = await request(app)
      .post('/events/upload-url')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ fileName: '', mimeType: 'image/png' })
    expect(res.status).toBe(200)
  })

  it('genera URL para WebP sin nombre de archivo', async () => {
    const res = await request(app)
      .post('/events/upload-url')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ fileName: '', mimeType: 'image/webp' })
    expect(res.status).toBe(200)
  })

  it('genera URL para GIF sin nombre de archivo', async () => {
    const res = await request(app)
      .post('/events/upload-url')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ fileName: '', mimeType: 'image/gif' })
    expect(res.status).toBe(200)
  })

  it('genera URL para JPEG deducido del mimeType', async () => {
    const res = await request(app)
      .post('/events/upload-url')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ fileName: '', mimeType: 'image/jpeg' })
    expect(res.status).toBe(200)
  })

  it('genera URL para MP4 deducido del mimeType', async () => {
    const res = await request(app)
      .post('/events/upload-url')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ fileName: '', mimeType: 'video/mp4' })
    expect(res.status).toBe(200)
  })

  it('genera URL para WebM', async () => {
    const res = await request(app)
      .post('/events/upload-url')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ fileName: '', mimeType: 'video/webm' })
    expect(res.status).toBe(200)
  })

  it('genera URL para QuickTime (MOV)', async () => {
    const res = await request(app)
      .post('/events/upload-url')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ fileName: '', mimeType: 'video/quicktime' })
    expect(res.status).toBe(200)
  })

  it('genera URL para tipo de imagen sin extensión conocida (bin)', async () => {
    const res = await request(app)
      .post('/events/upload-url')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ fileName: '', mimeType: 'image/avif' })
    expect(res.status).toBe(200)
  })

  it('devuelve 500 si createSignedUploadUrl falla', async () => {
    mockCreateSignedUploadUrl.mockResolvedValueOnce({ data: null, error: { message: 'Storage error' } })
    const res = await request(app)
      .post('/events/upload-url')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ fileName: 'foto.jpg', mimeType: 'image/jpeg' })

    expect(res.status).toBe(500)
  })

  it('también llama updateBucket si createBucket falla', async () => {
    mockCreateBucket.mockResolvedValueOnce({ error: { message: 'bucket already exists' } })
    const res = await request(app)
      .post('/events/upload-url')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ fileName: 'foto.jpg', mimeType: 'image/jpeg' })

    expect(res.status).toBe(200)
    expect(mockUpdateBucket).toHaveBeenCalled()
  })
})

// ── POST /events/upload ───────────────────────────────────────────────────────

describe('POST /events/upload', () => {
  it('rechaza sin token', async () => {
    const res = await request(app)
      .post('/events/upload')
      .attach('file', Buffer.from('data'), { filename: 'img.jpg', contentType: 'image/jpeg' })

    expect(res.status).toBe(401)
  })

  it('rechaza si no se adjunta archivo', async () => {
    const res = await request(app)
      .post('/events/upload')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)

    expect(res.status).toBe(400)
  })

  it('sube imagen JPG y devuelve publicUrl', async () => {
    const res = await request(app)
      .post('/events/upload')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .attach('file', Buffer.from('fake-image-data'), { filename: 'foto.jpg', contentType: 'image/jpeg' })

    expect(res.status).toBe(200)
    expect(res.body.publicUrl).toBeDefined()
  })

  it('sube video MP4 y devuelve publicUrl', async () => {
    const res = await request(app)
      .post('/events/upload')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .attach('file', Buffer.from('fake-video-data'), { filename: 'clip.mp4', contentType: 'video/mp4' })

    expect(res.status).toBe(200)
    expect(res.body.publicUrl).toBeDefined()
  })

  it('devuelve 500 si falla la subida al storage', async () => {
    mockStorageUpload.mockResolvedValueOnce({ error: { message: 'Storage upload failed' } })
    const res = await request(app)
      .post('/events/upload')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .attach('file', Buffer.from('data'), { filename: 'img.jpg', contentType: 'image/jpeg' })

    expect(res.status).toBe(500)
  })
})
