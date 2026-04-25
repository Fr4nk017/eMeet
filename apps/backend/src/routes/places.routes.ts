import { Router, Request, Response } from 'express'
import {
  searchNearbyPlaces,
  getPlaceDetails,
  getPlacePhotoUrl,
} from '../services/placesService'

const router = Router()

/**
 * POST /api/places/search-nearby
 * Body: { location: { lat, lng }, radius, type }
 */
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

    const places = await searchNearbyPlaces(location, radius, type)
    res.json({ places })
  } catch (error) {
    console.error('Error in /search-nearby:', error)
    res.status(500).json({
      error: 'Failed to search nearby places',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/places/:placeId/details
 * Returns detailed information about a place
 */
router.get('/:placeId/details', async (req: Request, res: Response) => {
  try {
    const { placeId } = req.params

    if (!placeId || typeof placeId !== 'string') {
      return res.status(400).json({ error: 'Invalid placeId' })
    }

    const details = await getPlaceDetails(placeId)
    res.json({ details })
  } catch (error) {
    console.error('Error in /:placeId/details:', error)
    res.status(500).json({
      error: 'Failed to fetch place details',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /places/photo
 * Query params: ?photoReference=...&maxWidth=400
 * Proxies the image from Google so the API key is never exposed to the browser
 * and origin/referrer restrictions on the key don't block the request.
 */
router.get('/photo', async (req: Request, res: Response) => {
  try {
    const { photoReference, maxWidth } = req.query

    if (!photoReference || typeof photoReference !== 'string') {
      return res.status(400).json({ error: 'Invalid photoReference' })
    }

    const width = typeof maxWidth === 'string' ? parseInt(maxWidth, 10) : 400
    const googleUrl = getPlacePhotoUrl(photoReference, width)

    const googleRes = await fetch(googleUrl)

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
    console.error('Error in /photo:', error)
    res.status(500).json({
      error: 'Failed to get photo',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default router
