import { getSupabaseBrowserClient } from './supabase'

const EVENTS_URL = (
  process.env.NEXT_PUBLIC_EVENTS_URL ?? ''
).trim().replace(/\/$/, '')

const BUCKET = 'event-media'

export async function uploadEventMedia(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const supabase = getSupabaseBrowserClient()
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  if (!token) {
    throw new Error('Debes iniciar sesión para subir archivos.')
  }

  if (!EVENTS_URL) {
    throw new Error('No está configurada la URL del servicio de eventos.')
  }

  // Paso 1: pedir una URL firmada al backend (solo JSON, sin body grande)
  const urlRes = await fetch(`${EVENTS_URL}/events/upload-url`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileName: file.name, mimeType: file.type }),
  })

  const urlPayload = (await urlRes.json().catch(() => null)) as {
    signedUrl?: string
    token?: string
    path?: string
    publicUrl?: string
    error?: string
  } | null

  if (!urlRes.ok || !urlPayload?.token || !urlPayload?.path) {
    throw new Error(urlPayload?.error ?? 'No se pudo iniciar la subida.')
  }

  // Paso 2: subir directo a Supabase Storage con la URL firmada
  // Esto bypasea el límite de 4.5 MB de Vercel Functions
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .uploadToSignedUrl(urlPayload.path, urlPayload.token, file, {
      contentType: file.type,
      onUploadProgress: onProgress
        ? (progress) => {
            if (progress.total) {
              onProgress(Math.round((progress.loaded / progress.total) * 100))
            }
          }
        : undefined,
    })

  if (uploadError) {
    throw new Error(uploadError.message ?? 'No se pudo subir el archivo.')
  }

  return urlPayload.publicUrl!
}
