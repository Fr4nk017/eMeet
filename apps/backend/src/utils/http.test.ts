import type { Response } from 'express'
import { badRequest, serverError, unauthorized } from './http'

function createResponseMock() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  } as unknown as Response

  ;(res.status as unknown as ReturnType<typeof vi.fn>).mockReturnValue(res)
  return res
}

describe('http utils', () => {
  it('badRequest responde 400 con mensaje', () => {
    const res = createResponseMock()

    badRequest(res, 'faltan datos')

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'faltan datos' })
  })

  it('unauthorized usa mensaje por defecto', () => {
    const res = createResponseMock()

    unauthorized(res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'No autorizado' })
  })

  it('unauthorized acepta mensaje personalizado', () => {
    const res = createResponseMock()

    unauthorized(res, 'token inválido')

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'token inválido' })
  })

  it('serverError usa mensaje por defecto', () => {
    const res = createResponseMock()

    serverError(res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' })
  })

  it('serverError acepta mensaje personalizado', () => {
    const res = createResponseMock()

    serverError(res, 'fallo de base de datos')

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'fallo de base de datos' })
  })
})
