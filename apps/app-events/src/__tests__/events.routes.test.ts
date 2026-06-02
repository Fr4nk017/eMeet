import 'dotenv/config'
import request from 'supertest'
import { createClient } from '@supabase/supabase-js'
import app from '../app'

// ── Clientes reales de Supabase ───────────────────────────────────────────────

const serviceClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const anonClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
)

// ── Estado compartido entre tests ────────────────────────────────────────────

let authToken = ''
let testUserId = ''
const createdEventIds: string[] = []

// ── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  // Iniciar sesión con el usuario de prueba
  const { data, error } = await anonClient.auth.signInWithPassword({
    email: process.env.TEST_USER_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  })

  if (error || !data.session) {
    throw new Error(
      `No se pudo iniciar sesión con el usuario de prueba: ${error?.message}.\n` +
      'Verifica TEST_USER_EMAIL y TEST_USER_PASSWORD en .env',
    )
  }

  authToken = data.session.access_token
  testUserId = data.user.id

  // Garantizar que el usuario de prueba tiene un perfil (FK de locatario_events)
  await serviceClient
    .from('profiles')
    .upsert({ id: testUserId, name: 'Test User', role: 'locatario' }, { onConflict: 'id' })

  // Insertar un evento pasado para el test de cleanup
  const { data: past, error: pastErr } = await serviceClient
    .from('locatario_events')
    .insert({
      creator_id: testUserId,
      title: '[TEST] Evento pasado',
      description: 'Evento de prueba — eliminar automáticamente',
      category: 'musica',
      event_date: '2000-01-01T00:00:00Z',
      address: 'Calle Test 123',
      organizer_name: 'Test Suite',
    })
    .select('id')
    .single()

  if (pastErr) throw new Error(`Error insertando evento pasado: ${pastErr.message}`)
  createdEventIds.push(past.id)

  // Insertar un evento futuro para el test de /public
  const { data: future, error: futureErr } = await serviceClient
    .from('locatario_events')
    .insert({
      creator_id: testUserId,
      title: '[TEST] Evento futuro',
      description: 'Evento de prueba futuro',
      category: 'cultura',
      event_date: '2099-12-31T23:59:00Z',
      address: 'Av. Providencia 1234',
      organizer_name: 'Test Suite',
    })
    .select('id')
    .single()

  if (futureErr) throw new Error(`Error insertando evento futuro: ${futureErr.message}`)
  createdEventIds.push(future.id)
}, 20_000)

afterAll(async () => {
  // Eliminar todos los eventos creados durante los tests
  if (createdEventIds.length > 0) {
    await serviceClient
      .from('locatario_events')
      .delete()
      .in('id', createdEventIds)
  }

  await anonClient.auth.signOut({ scope: 'local' })
}, 10_000)

// ── GET /events/public ───────────────────────────────────────────────────────

describe('GET /events/public', () => {
  it('devuelve solo eventos con fecha futura', async () => {
    const res = await request(app).get('/events/public')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)

    const titles = res.body.map((e: { title: string }) => e.title)
    expect(titles).toContain('[TEST] Evento futuro')
    expect(titles).not.toContain('[TEST] Evento pasado')
  })

  it('los eventos están ordenados por fecha ascendente', async () => {
    const res = await request(app).get('/events/public')

    expect(res.status).toBe(200)
    const dates: string[] = res.body.map((e: { event_date: string }) => e.event_date)
    const sorted = [...dates].sort()
    expect(dates).toEqual(sorted)
  })
})

// ── GET /events/cleanup ──────────────────────────────────────────────────────

describe('GET /events/cleanup', () => {
  it('rechaza sin CRON_SECRET', async () => {
    const res = await request(app)
      .get('/events/cleanup')
      .set('Authorization', 'Bearer secreto-incorrecto')

    expect(res.status).toBe(401)
  })

  it('elimina el evento pasado de la base de datos', async () => {
    const res = await request(app)
      .get('/events/cleanup')
      .set('Authorization', `Bearer ${process.env.CRON_SECRET}`)

    expect(res.status).toBe(200)
    expect(typeof res.body.deleted).toBe('number')
    expect(res.body.deleted).toBeGreaterThanOrEqual(1)

    // Verificar directamente en la BD que el evento pasado ya no existe
    const { data } = await serviceClient
      .from('locatario_events')
      .select('id')
      .eq('title', '[TEST] Evento pasado')

    expect(data).toHaveLength(0)
  })
})

// ── POST /events/locatario ───────────────────────────────────────────────────

describe('POST /events/locatario', () => {
  it('crea un evento con datos válidos', async () => {
    const payload = {
      title: '[TEST] Evento creado por test',
      description: 'Descripción del evento de prueba',
      category: 'networking',
      event_date: '2099-03-15T19:00:00Z',
      address: 'Teatinos 120, Santiago',
      price: null,
      organizer_name: 'Test Suite',
    }

    const res = await request(app)
      .post('/events/locatario')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)

    expect(res.status).toBe(201)
    expect(res.body.title).toBe(payload.title)
    expect(res.body.id).toBeDefined()

    // Guardar para limpiar en afterAll
    createdEventIds.push(res.body.id)
  })

  it('rechaza si faltan campos obligatorios', async () => {
    const res = await request(app)
      .post('/events/locatario')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Sin fecha ni categoría' })

    expect(res.status).toBe(400)
  })

  it('rechaza sin token de autenticación', async () => {
    const res = await request(app)
      .post('/events/locatario')
      .send({ title: 'Sin auth', description: 'x', category: 'musica', event_date: '2099-01-01' })

    expect(res.status).toBe(401)
  })
})

// ── GET /events/locatario ────────────────────────────────────────────────────

describe('GET /events/locatario', () => {
  it('devuelve los eventos del usuario autenticado', async () => {
    const res = await request(app)
      .get('/events/locatario')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    res.body.forEach((e: { creator_id: string }) => {
      expect(e.creator_id).toBe(testUserId)
    })
  })

  it('rechaza sin token', async () => {
    const res = await request(app).get('/events/locatario')
    expect(res.status).toBe(401)
  })
})

// ── DELETE /events/locatario/:id ─────────────────────────────────────────────

describe('DELETE /events/locatario/:id', () => {
  it('elimina un evento propio', async () => {
    // Crear un evento específico para eliminar
    const { data: ev } = await serviceClient
      .from('locatario_events')
      .insert({
        creator_id: testUserId,
        title: '[TEST] Para eliminar',
        description: 'Será eliminado en el test',
        category: 'arte',
        event_date: '2099-06-01T00:00:00Z',
        address: 'Test',
        organizer_name: 'Test Suite',
      })
      .select('id')
      .single()

    const res = await request(app)
      .delete(`/events/locatario/${ev!.id}`)
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(204)

    // Verificar que ya no existe
    const { data } = await serviceClient
      .from('locatario_events')
      .select('id')
      .eq('id', ev!.id)

    expect(data).toHaveLength(0)
  })

  it('rechaza eliminar un evento inexistente', async () => {
    const res = await request(app)
      .delete('/events/locatario/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(204)
  })
})
