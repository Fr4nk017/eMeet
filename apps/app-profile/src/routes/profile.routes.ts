import { Router } from 'express'
import { withAuth } from '../../../../packages/shared/src/middleware/auth.js'
import { badRequest, serverError } from '../../../../packages/shared/src/utils/http.js'
import type { EventCategory } from '../../../../packages/shared/src/types/supabase.js'

const router = Router()

// ── Public: view any user's profile ────────────────────────────────────────
router.get('/public/:userId', async (req, res) => {
  const { userId } = req.params
  const { data, error } = await req.supabase!
    .from('profiles')
    .select('id, name, bio, location, interests, avatar_url, cover_url, created_at')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return res.status(404).json({ error: 'Perfil no encontrado.' })
  return res.json(data)
})

// ── Authenticated routes ────────────────────────────────────────────────────
router.use(withAuth)

router.get('/', async (req, res) => {
  const { data, error } = await req.supabase!
    .from('profiles')
    .select('*')
    .eq('id', req.authUser!.id)
    .maybeSingle()

  if (error) return serverError(res, 'No se pudo obtener el perfil.')
  if (!data) return res.status(404).json({ error: 'Perfil no encontrado.' })
  return res.json(data)
})

router.patch('/', async (req, res) => {
  const { name, bio, location, interests, avatar_url, cover_url } = req.body as {
    name?: string
    bio?: string
    location?: string
    interests?: EventCategory[]
    avatar_url?: string
    cover_url?: string
  }

  type ProfileUpdate = {
    name?: string
    bio?: string
    location?: string
    interests?: EventCategory[]
    avatar_url?: string | null
    cover_url?: string | null
  }
  const payload: ProfileUpdate = {}
  if (typeof name === 'string') payload.name = name
  if (typeof bio === 'string') payload.bio = bio
  if (typeof location === 'string') payload.location = location
  if (Array.isArray(interests)) payload.interests = interests
  if (typeof avatar_url === 'string') payload.avatar_url = avatar_url
  if (typeof cover_url === 'string') payload.cover_url = cover_url

  if (Object.keys(payload).length === 0) return badRequest(res, 'No hay campos para actualizar.')

  const { data, error } = await req.supabase!
    .from('profiles')
    .update(payload)
    .eq('id', req.authUser!.id)
    .select('*')
    .single()

  if (error) return serverError(res, 'No se pudo actualizar el perfil.')
  return res.json(data)
})

router.post('/avatar', async (req, res) => {
  const { fileBase64, contentType = 'image/jpeg' } = req.body as {
    fileBase64?: string
    contentType?: string
  }
  if (!fileBase64) return badRequest(res, 'Debe enviar fileBase64 para subir el avatar.')

  const buffer = Buffer.from(fileBase64, 'base64')
  const ext = contentType.includes('png') ? 'png' : 'jpg'
  const objectPath = `${req.authUser!.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await req.supabase!.storage
    .from('avatars')
    .upload(objectPath, buffer, { contentType, upsert: true })

  if (uploadError) return serverError(res, 'No se pudo subir el avatar.')

  const { data: publicData } = req.supabase!.storage.from('avatars').getPublicUrl(objectPath)

  await req.supabase!
    .from('profiles')
    .update({ avatar_url: publicData.publicUrl })
    .eq('id', req.authUser!.id)

  return res.json({ avatarUrl: publicData.publicUrl })
})

router.post('/cover', async (req, res) => {
  const { fileBase64, contentType = 'image/jpeg' } = req.body as {
    fileBase64?: string
    contentType?: string
  }
  if (!fileBase64) return badRequest(res, 'Debe enviar fileBase64 para subir la portada.')

  const buffer = Buffer.from(fileBase64, 'base64')
  const ext = contentType.includes('png') ? 'png' : 'jpg'
  const objectPath = `covers/${req.authUser!.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await req.supabase!.storage
    .from('avatars')
    .upload(objectPath, buffer, { contentType, upsert: true })

  if (uploadError) return serverError(res, 'No se pudo subir la foto de portada.')

  const { data: publicData } = req.supabase!.storage.from('avatars').getPublicUrl(objectPath)

  await req.supabase!
    .from('profiles')
    .update({ cover_url: publicData.publicUrl })
    .eq('id', req.authUser!.id)

  return res.json({ coverUrl: publicData.publicUrl })
})

router.get('/stats', async (req, res) => {
  const supabaseAny = req.supabase as any
  const { count, error } = await supabaseAny
    .from('profile_followers')
    .select('*', { count: 'exact', head: true })
    .eq('followed_id', req.authUser!.id)

  if (error && error.code !== '42P01') return serverError(res, 'No se pudieron obtener las estadísticas del perfil.')
  return res.json({ followersCount: typeof count === 'number' ? count : null })
})

export default router
