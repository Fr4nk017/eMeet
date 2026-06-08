import request from 'supertest'
import app from '../app'

// ── Env vars ──────────────────────────────────────────────────────────────────

process.env.SUPABASE_URL              = 'https://mock.supabase.co'
process.env.SUPABASE_ANON_KEY         = 'mock-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key'
process.env.FRONTEND_ORIGIN           = 'http://localhost:3000'

// ── Mocks de Supabase ─────────────────────────────────────────────────────────

const mockSignIn         = jest.fn()
const mockSignUp         = jest.fn()
const mockSignOut        = jest.fn()
const mockGetUser        = jest.fn()
const mockExchangeCode   = jest.fn()
const mockVerifyOtp      = jest.fn()
const mockProfileUpsert  = jest.fn()
const mockDeleteUser     = jest.fn()

jest.mock('../lib/supabase', () => ({
  createAnonClient: () => ({
    auth: {
      signInWithPassword: mockSignIn,
      signUp: mockSignUp,
      signOut: mockSignOut,
      getUser: mockGetUser,
      exchangeCodeForSession: mockExchangeCode,
      verifyOtp: mockVerifyOtp,
    },
  }),
  createServiceRoleClient: () => ({
    from: () => ({ upsert: mockProfileUpsert }),
    auth: { admin: { deleteUser: mockDeleteUser } },
  }),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const MOCK_USER = { id: 'user-uuid-1', email: 'test@emeet.cl', app_metadata: { role: 'user' }, user_metadata: {} }
const MOCK_SESSION = { access_token: 'mock-access-token', refresh_token: 'mock-refresh-token' }

beforeEach(() => {
  jest.clearAllMocks()
  mockProfileUpsert.mockResolvedValue({ error: null })
  mockDeleteUser.mockResolvedValue({ error: null })
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

// ── POST /auth/login ──────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
  it('rechaza si faltan credenciales', async () => {
    const res = await request(app).post('/auth/login').send({})
    expect(res.status).toBe(400)
  })

  it('rechaza si falta la contraseña', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'a@b.cl' })
    expect(res.status).toBe(400)
  })

  it('rechaza con credenciales inválidas (400)', async () => {
    mockSignIn.mockResolvedValueOnce({ data: {}, error: { message: 'Invalid login credentials' } })
    const res = await request(app).post('/auth/login').send({ email: 'a@b.cl', password: 'wrong' })
    expect(res.status).toBe(400)
  })

  it('devuelve 429 cuando Supabase indica rate limit', async () => {
    mockSignIn.mockResolvedValueOnce({ data: {}, error: { message: 'rate limit exceeded' } })
    const res = await request(app).post('/auth/login').send({ email: 'a@b.cl', password: 'pass' })
    expect(res.status).toBe(429)
  })

  it('devuelve user y session con credenciales válidas', async () => {
    mockSignIn.mockResolvedValueOnce({ data: { user: MOCK_USER, session: MOCK_SESSION }, error: null })
    const res = await request(app).post('/auth/login').send({ email: 'test@emeet.cl', password: 'pass123' })
    expect(res.status).toBe(200)
    expect(res.body.session.access_token).toBe('mock-access-token')
    expect(res.body.user.id).toBe('user-uuid-1')
  })
})

// ── POST /auth/register ───────────────────────────────────────────────────────

describe('POST /auth/register', () => {
  it('rechaza si faltan campos obligatorios', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'test@test.com' })
    expect(res.status).toBe(400)
  })

  it('rechaza contraseña menor a 6 caracteres', async () => {
    const res = await request(app).post('/auth/register').send({ name: 'Test', email: 'test@test.com', password: '123' })
    expect(res.status).toBe(400)
  })

  it('rechaza rol inválido', async () => {
    const res = await request(app).post('/auth/register').send({ name: 'Test', email: 't@t.cl', password: '123456', role: 'superadmin' })
    expect(res.status).toBe(400)
  })

  it('registra usuario básico correctamente', async () => {
    mockSignUp.mockResolvedValueOnce({ data: { user: MOCK_USER, session: MOCK_SESSION }, error: null })
    const res = await request(app).post('/auth/register').send({ name: 'Ana', email: 'ana@emeet.cl', password: 'pass123' })
    expect(res.status).toBe(201)
    expect(res.body.user.id).toBe('user-uuid-1')
  })

  it('registra locatario con businessName', async () => {
    const locatario = { ...MOCK_USER, app_metadata: { role: 'locatario' } }
    mockSignUp.mockResolvedValueOnce({ data: { user: locatario, session: MOCK_SESSION }, error: null })
    const res = await request(app).post('/auth/register').send({
      name: 'Café Test',
      email: 'cafe@emeet.cl',
      password: 'pass123',
      role: 'locatario',
      businessName: 'Café Test',
      businessLocation: 'Providencia',
    })
    expect(res.status).toBe(201)
  })

  it('devuelve 400 si Supabase rechaza el registro', async () => {
    mockSignUp.mockResolvedValueOnce({ data: {}, error: { message: 'User already registered' } })
    const res = await request(app).post('/auth/register').send({ name: 'Test', email: 'dup@dup.cl', password: 'pass123' })
    expect(res.status).toBe(400)
  })

  it('deshace el registro si falla el upsert del perfil', async () => {
    mockSignUp.mockResolvedValueOnce({ data: { user: MOCK_USER, session: MOCK_SESSION }, error: null })
    mockProfileUpsert.mockResolvedValueOnce({ error: { message: 'DB error' } })
    const res = await request(app).post('/auth/register').send({ name: 'Test', email: 'x@x.cl', password: 'pass123' })
    expect(res.status).toBe(500)
    expect(mockDeleteUser).toHaveBeenCalledWith(MOCK_USER.id)
  })
})

// ── POST /auth/logout ─────────────────────────────────────────────────────────

describe('POST /auth/logout', () => {
  it('cierra sesión y devuelve 204', async () => {
    mockSignOut.mockResolvedValueOnce({ error: null })
    const res = await request(app).post('/auth/logout').set('Authorization', 'Bearer mock-token')
    expect(res.status).toBe(204)
  })

  it('funciona sin token (signOut anónimo)', async () => {
    mockSignOut.mockResolvedValueOnce({ error: null })
    const res = await request(app).post('/auth/logout')
    expect(res.status).toBe(204)
  })

  it('devuelve 500 si Supabase falla al cerrar sesión', async () => {
    mockSignOut.mockResolvedValueOnce({ error: { message: 'signout failed' } })
    const res = await request(app).post('/auth/logout').set('Authorization', 'Bearer token')
    expect(res.status).toBe(500)
  })
})

// ── GET /auth/session ─────────────────────────────────────────────────────────

describe('GET /auth/session', () => {
  it('devuelve session null si no hay token', async () => {
    const res = await request(app).get('/auth/session')
    expect(res.status).toBe(200)
    expect(res.body.session).toBeNull()
  })

  it('devuelve session null si el token es inválido', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'invalid token' } })
    const res = await request(app).get('/auth/session').set('Authorization', 'Bearer bad-token')
    expect(res.status).toBe(200)
    expect(res.body.session).toBeNull()
  })

  it('devuelve session con user si el token es válido', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null })
    const res = await request(app).get('/auth/session').set('Authorization', 'Bearer valid-token')
    expect(res.status).toBe(200)
    expect(res.body.session.user.id).toBe('user-uuid-1')
    expect(res.body.session.access_token).toBe('valid-token')
  })
})

// ── GET /auth/callback ────────────────────────────────────────────────────────

describe('GET /auth/callback', () => {
  it('redirige al frontend con tokens tras OAuth code', async () => {
    mockExchangeCode.mockResolvedValueOnce({
      data: { user: MOCK_USER, session: MOCK_SESSION },
      error: null,
    })
    const res = await request(app).get('/auth/callback?code=mock-oauth-code')
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('access_token=')
    expect(res.headers.location).toContain('mock-access-token')
  })

  it('redirige con error si el code OAuth es inválido', async () => {
    mockExchangeCode.mockResolvedValueOnce({ data: { user: null }, error: { message: 'bad code' } })
    const res = await request(app).get('/auth/callback?code=bad-code')
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('error=oauth_error')
  })

  it('verifica email con token_hash y redirige con tokens', async () => {
    mockVerifyOtp.mockResolvedValueOnce({
      data: { user: MOCK_USER, session: MOCK_SESSION },
      error: null,
    })
    const res = await request(app).get('/auth/callback?token_hash=abc123&type=signup')
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('access_token=')
  })

  it('redirige con error si la verificación de email falla', async () => {
    mockVerifyOtp.mockResolvedValueOnce({ data: { user: null }, error: { message: 'expired' } })
    const res = await request(app).get('/auth/callback?token_hash=expired&type=signup')
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('error=verification_failed')
  })

  it('redirige con error si no hay params', async () => {
    const res = await request(app).get('/auth/callback')
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('error=missing_params')
  })

  it('redirige a /locatario si el usuario tiene rol locatario', async () => {
    const locatario = { ...MOCK_USER, app_metadata: { role: 'locatario' } }
    mockExchangeCode.mockResolvedValueOnce({ data: { user: locatario, session: MOCK_SESSION }, error: null })
    const res = await request(app).get('/auth/callback?code=locatario-code')
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('/locatario')
  })
})
