import { NextResponse, type NextRequest } from 'next/server'
import { getRequestUser } from '../../_lib/auth'
import { apiError, createRouteSupabaseClient } from '../../_lib/supabase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const supabase = createRouteSupabaseClient(request)
  const { user, error } = await getRequestUser(supabase, request)

  if (error || !user) return apiError('No autorizado.', 401)

  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return apiError('Debes enviar un archivo válido en el campo file.', 400)
  }

  const ext = file.type.includes('png') ? 'png' : 'jpg'
  const path = `${user.id}/${Date.now()}.${ext}`
  const bytes = new Uint8Array(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, bytes, {
    contentType: file.type || 'image/jpeg',
    upsert: true,
  })

  if (uploadError) {
    return apiError('No se pudo subir el avatar.', 500)
  }

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: urlData.publicUrl })
    .eq('id', user.id)

  if (profileError) {
    return apiError('No se pudo actualizar la URL del avatar.', 500)
  }

  return NextResponse.json({ avatarUrl: urlData.publicUrl })
}
