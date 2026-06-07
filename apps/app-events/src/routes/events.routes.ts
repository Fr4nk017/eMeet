import { Router } from 'express'
import multer from 'multer'
import { withAuth } from '../../../../packages/shared/src/middleware/auth.js'
import { badRequest, serverError } from '../../../../packages/shared/src/utils/http.js'
import { createServiceRoleClient } from '../../../../packages/shared/src/lib/supabase.js'
import type { EventCategory } from '../../../../packages/shared/src/types/supabase.js'

const router = Router()

// Limpieza programada — llamado diariamente por Vercel Cron
router.get('/cleanup', async (req, res) => {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'No autorizado.' })
  }

  const supabase = createServiceRoleClient()
  const { error, count } = await supabase
    .from('locatario_events')
    .delete({ count: 'exact' })
    .lt('event_date', new Date().toISOString())

  if (error) return serverError(res, 'Error al limpiar eventos expirados.')
  return res.json({ deleted: count ?? 0, timestamp: new Date().toISOString() })
})

router.get('/public', async (_req, res) => {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('locatario_events')
    .select('*')
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true })

  if (error) return serverError(res, 'No se pudieron obtener los eventos.')
  return res.json(data ?? [])
})

router.use(withAuth)

router.get('/locatario', async (req, res) => {
  const { data, error } = await req.supabase!
    .from('locatario_events')
    .select('*')
    .eq('creator_id', req.authUser!.id)
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true })

  if (error) {
    return serverError(res, 'No se pudieron obtener los eventos.')
  }

  return res.json(data ?? [])
})

router.post('/locatario', async (req, res) => {
  const body = req.body as {
    title?: string
    description?: string
    category?: EventCategory
    event_date?: string
    address?: string
    price?: number | null
    image_url?: string | null
    video_url?: string | null
    audio_url?: string | null
    organizer_name?: string
    organizer_avatar?: string | null
    lat?: number | null
    lng?: number | null
  }

  if (!body.title?.trim() || !body.description?.trim() || !body.event_date || !body.category) {
    return badRequest(res, 'Titulo, descripcion, categoria y fecha son obligatorios.')
  }

  const { data, error } = await req.supabase!
    .from('locatario_events')
    .insert({
      creator_id: req.authUser!.id,
      title: body.title.trim(),
      description: body.description.trim(),
      category: body.category,
      event_date: new Date(body.event_date).toISOString(),
      address: body.address?.trim() ?? '',
      price: body.price ?? null,
      image_url: body.image_url?.trim() || null,
      video_url: body.video_url?.trim() || null,
      audio_url: body.audio_url?.trim() || null,
      organizer_name: body.organizer_name ?? '',
      organizer_avatar: body.organizer_avatar ?? null,
      lat: typeof body.lat === 'number' ? body.lat : null,
      lng: typeof body.lng === 'number' ? body.lng : null,
    })
    .select('*')
    .single()

  if (error) {
    return serverError(res, 'No se pudo crear el evento.')
  }

  return res.status(201).json(data)
})

router.patch('/locatario/:id', async (req, res) => {
  const { id } = req.params
  const body = req.body as {
    title?: string
    description?: string
    category?: EventCategory
    event_date?: string
    address?: string
    price?: number | null
    image_url?: string | null
    video_url?: string | null
    audio_url?: string | null
    organizer_name?: string
    organizer_avatar?: string | null
    lat?: number | null
    lng?: number | null
  }

  const updates: {
    title?: string
    description?: string
    category?: EventCategory
    event_date?: string
    address?: string
    price?: number | null
    image_url?: string | null
    video_url?: string | null
    audio_url?: string | null
    organizer_name?: string
    organizer_avatar?: string | null
    lat?: number | null
    lng?: number | null
  } = {}
  if (body.title !== undefined) updates.title = body.title.trim()
  if (body.description !== undefined) updates.description = body.description.trim()
  if (body.category !== undefined) updates.category = body.category
  if (body.event_date !== undefined) updates.event_date = new Date(body.event_date).toISOString()
  if (body.address !== undefined) updates.address = body.address.trim()
  if (body.price !== undefined) updates.price = body.price
  if (body.image_url !== undefined) updates.image_url = body.image_url?.trim() || null
  if (body.video_url !== undefined) updates.video_url = body.video_url?.trim() || null
  if (body.audio_url !== undefined) updates.audio_url = body.audio_url?.trim() || null
  if (body.organizer_name !== undefined) updates.organizer_name = body.organizer_name
  if (body.organizer_avatar !== undefined) updates.organizer_avatar = body.organizer_avatar
  if (body.lat !== undefined) updates.lat = typeof body.lat === 'number' ? body.lat : null
  if (body.lng !== undefined) updates.lng = typeof body.lng === 'number' ? body.lng : null

  if (Object.keys(updates).length === 0) {
    return badRequest(res, 'No se enviaron campos para actualizar.')
  }

  const { data, error } = await req.supabase!
    .from('locatario_events')
    .update(updates)
    .eq('id', id)
    .eq('creator_id', req.authUser!.id)
    .select('*')
    .single()

  if (error) {
    return serverError(res, 'No se pudo actualizar el evento.')
  }

  return res.json(data)
})

router.delete('/locatario/:id', async (req, res) => {
  const { id } = req.params

  const { error } = await req.supabase!
    .from('locatario_events')
    .delete()
    .eq('id', id)
    .eq('creator_id', req.authUser!.id)

  if (error) {
    return serverError(res, 'No se pudo eliminar el evento.')
  }

  return res.status(204).send()
})

// ── Helpers de media ─────────────────────────────────────────────────────────

const BUCKET = 'event-media'
const MAX_SIZE_BYTES = 52_428_800 // 50 MB

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_SIZE_BYTES } })

function getExtension(fileName: string, mimeType: string): string {
  const fromName = fileName.split('.').pop()?.toLowerCase()
  if (fromName && fromName.length <= 5) return fromName
  if (mimeType.includes('png')) return 'png'
  if (mimeType.includes('webp')) return 'webp'
  if (mimeType.includes('gif')) return 'gif'
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg'
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('quicktime')) return 'mov'
  return 'bin'
}

async function ensureBucket(supabase: ReturnType<typeof createServiceRoleClient>) {
  const bucketOptions = {
    public: true,
    fileSizeLimit: MAX_SIZE_BYTES,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'image/bmp', 'image/tiff', 'video/mp4', 'video/webm', 'video/quicktime'],
  }
  const { error } = await supabase.storage.createBucket(BUCKET, bucketOptions)
  if (error) {
    await supabase.storage.updateBucket(BUCKET, bucketOptions).catch(() => {})
  }
}

// ── POST /upload-url — Genera URL firmada para subida directa al bucket ──────
// El browser sube directo a Supabase Storage, evitando el límite de 4.5 MB
// de Vercel Functions que bloqueaba los videos.

router.post('/upload-url', async (req, res) => {
  const body = req.body as { fileName?: string; mimeType?: string }

  if (!body.mimeType) {
    return badRequest(res, 'mimeType es requerido.')
  }

  const isImage = body.mimeType.startsWith('image/')
  const isVideo = body.mimeType.startsWith('video/')
  if (!isImage && !isVideo) {
    return badRequest(res, 'Solo se permiten imágenes y videos.')
  }

  const ext = getExtension(body.fileName ?? '', body.mimeType)
  const objectPath = `${req.authUser!.id}/${Date.now()}.${ext}`

  try {
    const supabase = createServiceRoleClient()
    await ensureBucket(supabase)

    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(objectPath)

    if (error || !data) {
      console.error('[app-events] createSignedUploadUrl error:', error?.message)
      return serverError(res, 'No se pudo generar la URL de subida.')
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(objectPath)

    return res.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      publicUrl: urlData.publicUrl,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno.'
    console.error('[app-events] upload-url error:', message)
    return serverError(res, message)
  }
})

// ── POST /upload — Fallback para archivos pequeños (≤ 4.5 MB) ────────────────

router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return badRequest(res, 'Debes adjuntar un archivo válido.')
  }

  if (req.file.size > MAX_SIZE_BYTES) {
    return badRequest(res, 'El archivo supera el límite de 50 MB.')
  }

  const ext = getExtension(req.file.originalname, req.file.mimetype)
  const objectPath = `${req.authUser!.id}/${Date.now()}.${ext}`

  try {
    const supabase = createServiceRoleClient()
    await ensureBucket(supabase)

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, req.file.buffer, {
        contentType: req.file.mimetype || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) {
      console.error('[app-events] storage upload error:', uploadError.message)
      return serverError(res, `Error al guardar el archivo: ${uploadError.message}`)
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath)

    if (!data.publicUrl) {
      return serverError(res, 'No se pudo obtener la URL pública.')
    }

    return res.json({ publicUrl: data.publicUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno subiendo archivo.'
    console.error('[app-events] upload error:', message)
    return serverError(res, message)
  }
})

export default router
