import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getEnvValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim()
    if (value) return value
  }
  return null
}

function getExtension(fileName: string, mimeType: string) {
  const fromName = fileName.split('.').pop()?.toLowerCase()
  if (fromName) return fromName

  if (mimeType.includes('png')) return 'png'
  if (mimeType.includes('webp')) return 'webp'
  if (mimeType.includes('gif')) return 'gif'
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg'
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('quicktime')) return 'mov'
  return 'bin'
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = getEnvValue('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL')
    const supabaseAnonKey = getEnvValue('SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY')
    const supabaseServiceRoleKey = getEnvValue('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Faltan variables de entorno de Supabase en app-web.' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return NextResponse.json({ error: 'Token de autorización requerido.' }, { status: 401 })
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: userData, error: authError } = await anonClient.auth.getUser()
    if (authError || !userData.user) {
      return NextResponse.json({ error: 'Sesión inválida o expirada.' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Debes adjuntar un archivo válido.' }, { status: 400 })
    }

    const ext = getExtension(file.name, file.type)
    const objectPath = `event-media/${userData.user.id}/${Date.now()}.${ext}`
    const isVideo = file.type.startsWith('video/')
    const candidateBuckets = isVideo
      ? ['event-videos', 'events-videos', 'events-media', 'avatars']
      : ['event-images', 'events-images', 'events-media', 'avatars']

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey)
    const bytes = await file.arrayBuffer()
    const body = Buffer.from(bytes)

    let lastError = 'Error desconocido al subir archivo.'

    for (const bucket of candidateBuckets) {
      const { error } = await serviceClient.storage
        .from(bucket)
        .upload(objectPath, body, {
          contentType: file.type || undefined,
          upsert: false,
        })

      if (error) {
        lastError = `[${bucket}] ${error.message}`
        continue
      }

      const { data } = serviceClient.storage.from(bucket).getPublicUrl(objectPath)
      return NextResponse.json({ publicUrl: data.publicUrl })
    }

    return NextResponse.json({ error: `No se pudo subir el archivo. ${lastError}` }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno subiendo archivo.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
