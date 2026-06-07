import { Router, Request, Response } from 'express'
import { env } from '../config/env.js'

const router = Router()

const GOOGLE_API_KEY = env.GOOGLE_MAPS_API_KEY

router.post('/search-nearby', async (req: Request, res: Response) => {
  try {
    const { location, radius, type } = req.body

    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      return res.status(400).json({ error: 'Invalid location' })
    }
    if (typeof radius !== 'number' || radius < 0) {
      return res.status(400).json({ error: 'Invalid radius' })
    }
    if (typeof type !== 'string' || !type.trim()) {
      return res.status(400).json({ error: 'Invalid type' })
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
    url.searchParams.append('location', `${location.lat},${location.lng}`)
    url.searchParams.append('radius', String(radius))
    url.searchParams.append('type', type)
    url.searchParams.append('key', GOOGLE_API_KEY)

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.error_message) {
      return res.status(500).json({ error: data.error_message })
    }

    res.json({ places: data.results ?? [] })
  } catch (error) {
    res.status(500).json({ error: 'Failed to search nearby places' })
  }
})

router.get('/:placeId/details', async (req: Request, res: Response) => {
  try {
    const { placeId } = req.params

    if (!placeId) {
      return res.status(400).json({ error: 'Invalid placeId' })
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
    url.searchParams.append('place_id', placeId)
    url.searchParams.append(
      'fields',
      'formatted_address,formatted_phone_number,international_phone_number,name,opening_hours,photos,rating,types,url,user_ratings_total,website',
    )
    url.searchParams.append('key', GOOGLE_API_KEY)

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.error_message) {
      return res.status(500).json({ error: data.error_message })
    }

    res.json({ details: data.result ?? null })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch place details' })
  }
})

router.get('/photo', async (req: Request, res: Response) => {
  try {
    const { photoReference, maxWidth } = req.query

    if (!photoReference || typeof photoReference !== 'string') {
      return res.status(400).json({ error: 'Invalid photoReference' })
    }

    const width = typeof maxWidth === 'string' ? parseInt(maxWidth, 10) : 400
    const url = new URL('https://maps.googleapis.com/maps/api/place/photo')
    url.searchParams.append('maxwidth', String(width))
    url.searchParams.append('photo_reference', photoReference)
    url.searchParams.append('key', GOOGLE_API_KEY)

    const googleRes = await fetch(url.toString())

    if (!googleRes.ok) {
      return res.status(googleRes.status).json({ error: 'Failed to fetch photo from Google' })
    }

    const contentType = googleRes.headers.get('content-type')
    if (contentType) res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')

    const buffer = await googleRes.arrayBuffer()
    res.send(Buffer.from(buffer))
  } catch (error) {
    res.status(500).json({ error: 'Failed to get photo' })
  }
})

export default router
