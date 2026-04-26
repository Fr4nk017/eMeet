import { Router } from 'express'
import { withAuth } from '@emeet/shared/middleware/auth'
import { badRequest, serverError } from '@emeet/shared/utils/http'
import type { EventCategory } from '@emeet/shared/types/supabase'

const router = Router()

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
    organizer_name?: string
    organizer_avatar?: string | null
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
      organizer_name: body.organizer_name ?? '',
      organizer_avatar: body.organizer_avatar ?? null,
    })
    .select('*')
    .single()

  if (error) {
    return serverError(res, 'No se pudo crear el evento.')
  }

  return res.status(201).json(data)
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
