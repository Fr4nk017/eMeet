import { Router } from 'express'
import { withAuth } from '../middleware/auth'
import { badRequest, serverError } from '../utils/http'
import type { EventCategory } from '../types/supabase'

const router = Router()

router.use(withAuth)

router.get('/', async (req, res) => {
  const { data, error } = await req.supabase!
    .from('profiles')
    .select('*')
    .eq('id', req.authUser!.id)
    .single()

  if (error) {
    return serverError(res, 'No se pudo obtener el perfil.')
  }

  return res.json(data)
})

router.patch('/', async (req, res) => {
  const { name, bio, location, interests } = req.body as {
    name?: string
    bio?: string
    location?: string
    interests?: EventCategory[]
  }

  const payload: {
    name?: string
    bio?: string
    location?: string
    interests?: EventCategory[]
  } = {}

  if (typeof name === 'string') payload.name = name
  if (typeof bio === 'string') payload.bio = bio
  if (typeof location === 'string') payload.location = location
  if (Array.isArray(interests)) payload.interests = interests

  if (Object.keys(payload).length === 0) {
    return badRequest(res, 'No hay campos para actualizar.')
  }

  const { data, error } = await req.supabase!
    .from('profiles')
    .update(payload)
    .eq('id', req.authUser!.id)
    .select('*')
    .single()

  if (error) {
    return serverError(res, 'No se pudo actualizar el perfil.')
  }

  return res.json(data)
})

router.post('/avatar', async (req, res) => {
  const { fileBase64, contentType = 'image/jpeg' } = req.body as {
    fileBase64?: string
    contentType?: string
  }

  if (!fileBase64) {
    return badRequest(res, 'Debe enviar fileBase64 para subir el avatar.')
  }

  const buffer = Buffer.from(fileBase64, 'base64')
  const ext = contentType.includes('png') ? 'png' : 'jpg'
  const objectPath = `${req.authUser!.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await req.supabase!.storage
    .from('avatars')
    .upload(objectPath, buffer, {
      contentType,
      upsert: true,
    })

  if (uploadError) {
    return serverError(res, 'No se pudo subir el avatar.')
  }

  const { data: publicData } = req.supabase!.storage.from('avatars').getPublicUrl(objectPath)

  const { error: updateError } = await req.supabase!
    .from('profiles')
    .update({ avatar_url: publicData.publicUrl })
    .eq('id', req.authUser!.id)

  if (updateError) {
    return serverError(res, 'No se pudo guardar la URL del avatar.')
  }

  return res.json({ avatarUrl: publicData.publicUrl })
})

export default router
