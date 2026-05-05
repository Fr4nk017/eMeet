import { Router } from 'express'
import { withAuth } from '../../../../packages/shared/src/middleware/auth.js'
import { badRequest, serverError } from '../../../../packages/shared/src/utils/http.js'
import { createServiceRoleClient } from '../../../../packages/shared/src/lib/supabase.js'
import type { EventCategory } from '../../../../packages/shared/src/types/supabase.js'

const router = Router()

router.get('/public', async (_req, res) => {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('locatario_events')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return serverError(res, 'No se pudieron obtener los eventos.')
  return res.json(data ?? [])
})

router.use(withAuth)

router.get('/locatario', async (req, res) => {
  const { data, error } = await req.supabase!
    .from('locatario_events')
    .select('*')
    .eq('creator_id', req.authUser!.id)
    .order('created_at', { ascending: false })

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
    organizer_name?: string
    organizer_avatar?: string | null
    lat?: number | null
    lng?: number | null
  }

  type LocatarioUpdate = {
    title?: string
    description?: string
    category?: EventCategory
    event_date?: string
    address?: string
    price?: number | null
    image_url?: string | null
    video_url?: string | null
    organizer_name?: string
    organizer_avatar?: string | null
    lat?: number | null
    lng?: number | null
  }

  const updates: LocatarioUpdate = {}
  if (body.title !== undefined) updates.title = body.title.trim()
  if (body.description !== undefined) updates.description = body.description.trim()
  if (body.category !== undefined) updates.category = body.category
  if (body.event_date !== undefined) updates.event_date = new Date(body.event_date).toISOString()
  if (body.address !== undefined) updates.address = body.address.trim()
  if (body.price !== undefined) updates.price = body.price
  if (body.image_url !== undefined) updates.image_url = body.image_url?.trim() || null
  if (body.video_url !== undefined) updates.video_url = body.video_url?.trim() || null
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

export default router
