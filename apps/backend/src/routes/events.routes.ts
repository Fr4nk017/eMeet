import { Router } from 'express'
import { withAuth } from '../middleware/auth'
import { badRequest, serverError } from '../utils/http'

const router = Router()

router.use(withAuth)

router.post('/like', async (req, res) => {
  const { eventId, eventTitle, eventImageUrl, eventAddress } = req.body as {
    eventId?: string
    eventTitle?: string
    eventImageUrl?: string
    eventAddress?: string
  }

  if (!eventId || !eventTitle) {
    return badRequest(res, 'eventId y eventTitle son obligatorios.')
  }

  const { error: likeError } = await req.supabase!
    .from('user_events')
    .upsert(
      {
        user_id: req.authUser!.id,
        event_id: eventId,
        event_title: eventTitle,
        event_image_url: eventImageUrl ?? null,
        event_address: eventAddress ?? null,
        action: 'like',
      },
      { onConflict: 'user_id,event_id,action' },
    )

  if (likeError) {
    return serverError(res, 'No se pudo registrar el like.')
  }

  const { error: roomError } = await req.supabase!
    .from('chat_rooms')
    .upsert(
      {
        id: eventId,
        event_title: eventTitle,
        event_image_url: eventImageUrl ?? null,
        event_address: eventAddress ?? null,
      },
      { onConflict: 'id' },
    )

  if (roomError) {
    return serverError(res, 'No se pudo crear la sala del evento.')
  }

  const { error: memberError } = await req.supabase!
    .from('room_members')
    .upsert(
      {
        room_id: eventId,
        user_id: req.authUser!.id,
      },
      { onConflict: 'room_id,user_id' },
    )

  if (memberError) {
    return serverError(res, 'No se pudo unir al usuario a la sala del evento.')
  }

  return res.status(201).json({ ok: true })
})

router.post('/save', async (req, res) => {
  const { eventId, eventTitle, eventImageUrl, eventAddress } = req.body as {
    eventId?: string
    eventTitle?: string
    eventImageUrl?: string
    eventAddress?: string
  }

  if (!eventId || !eventTitle) {
    return badRequest(res, 'eventId y eventTitle son obligatorios.')
  }

  const { error } = await req.supabase!
    .from('user_events')
    .upsert(
      {
        user_id: req.authUser!.id,
        event_id: eventId,
        event_title: eventTitle,
        event_image_url: eventImageUrl ?? null,
        event_address: eventAddress ?? null,
        action: 'save',
      },
      { onConflict: 'user_id,event_id,action' },
    )

  if (error) {
    return serverError(res, 'No se pudo guardar el evento.')
  }

  return res.status(201).json({ ok: true })
})

router.delete('/like/:id', async (req, res) => {
  const { id } = req.params

  const { error } = await req.supabase!
    .from('user_events')
    .delete()
    .eq('user_id', req.authUser!.id)
    .eq('event_id', id)
    .eq('action', 'like')

  if (error) {
    return serverError(res, 'No se pudo eliminar el like.')
  }

  return res.status(204).send()
})

router.delete('/save/:id', async (req, res) => {
  const { id } = req.params

  const { error } = await req.supabase!
    .from('user_events')
    .delete()
    .eq('user_id', req.authUser!.id)
    .eq('event_id', id)
    .eq('action', 'save')

  if (error) {
    return serverError(res, 'No se pudo eliminar el guardado.')
  }

  return res.status(204).send()
})

router.get('/liked', async (req, res) => {
  const { data, error } = await req.supabase!
    .from('user_events')
    .select('*')
    .eq('user_id', req.authUser!.id)
    .eq('action', 'like')
    .order('created_at', { ascending: false })

  if (error) {
    return serverError(res, 'No se pudieron obtener los likes.')
  }

  return res.json(data)
})

router.get('/saved', async (req, res) => {
  const { data, error } = await req.supabase!
    .from('user_events')
    .select('*')
    .eq('user_id', req.authUser!.id)
    .eq('action', 'save')
    .order('created_at', { ascending: false })

  if (error) {
    return serverError(res, 'No se pudieron obtener los guardados.')
  }

  return res.json(data)
})

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
    category?:
      | 'gastronomia'
      | 'musica'
      | 'cultura'
      | 'networking'
      | 'deporte'
      | 'fiesta'
      | 'teatro'
      | 'arte'
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
