import type { NextFunction, Request, Response } from 'express'
import { withAuth } from './auth'

const { mockCreateAnonClient, mockUnauthorized } = vi.hoisted(() => ({
  mockCreateAnonClient: vi.fn(),
  mockUnauthorized: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  createAnonClient: mockCreateAnonClient,
}))

vi.mock('../utils/http', () => ({
  unauthorized: mockUnauthorized,
}))

function createReq(headers?: Record<string, string | undefined>) {
  return { headers: headers ?? {} } as unknown as Request
}

function createRes() {
  return {} as Response
}

describe('withAuth middleware', () => {
  beforeEach(() => {
    mockCreateAnonClient.mockReset()
    mockUnauthorized.mockReset()
  })

  it('rechaza cuando falta bearer token', async () => {
    const req = createReq()
    const res = createRes()
    const next = vi.fn() as unknown as NextFunction

    await withAuth(req, res, next)

    expect(mockUnauthorized).toHaveBeenCalledWith(res, 'Falta token de autorización.')
    expect(mockCreateAnonClient).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it('rechaza cuando supabase devuelve sesión inválida', async () => {
    const req = createReq({ authorization: 'Bearer token-invalido' })
    const res = createRes()
    const next = vi.fn() as unknown as NextFunction

    mockCreateAnonClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } }),
      },
    })

    await withAuth(req, res, next)

    expect(mockCreateAnonClient).toHaveBeenCalledWith('token-invalido')
    expect(mockUnauthorized).toHaveBeenCalledWith(res, 'Sesión inválida o expirada.')
    expect(next).not.toHaveBeenCalled()
  })

  it('continúa y adjunta usuario cuando token es válido', async () => {
    const req = createReq({ authorization: 'Bearer token-valido' })
    const res = createRes()
    const next = vi.fn() as unknown as NextFunction
    const supabaseMock = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'test@mail.com' } },
          error: null,
        }),
      },
    }

    mockCreateAnonClient.mockReturnValue(supabaseMock)

    await withAuth(req, res, next)

    expect(mockCreateAnonClient).toHaveBeenCalledWith('token-valido')
    expect(req.supabase).toBe(supabaseMock)
    expect(req.authUser).toEqual({ id: 'user-1', email: 'test@mail.com' })
    expect(next).toHaveBeenCalledTimes(1)
    expect(mockUnauthorized).not.toHaveBeenCalled()
  })
})
