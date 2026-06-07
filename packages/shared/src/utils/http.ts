import type { Response } from 'express'

export function badRequest(res: Response, message: string) {
  return res.status(400).json({ error: message })
}

export function unauthorized(res: Response, message = 'No autorizado') {
  return res.status(401).json({ error: message })
}

export function serverError(res: Response, message = 'Error interno del servidor') {
  return res.status(500).json({ error: message })
}
