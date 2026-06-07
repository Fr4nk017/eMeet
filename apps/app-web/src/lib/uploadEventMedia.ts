import { getSupabaseBrowserClient } from './supabase'

const EVENTS_URL = (
  process.env.NEXT_PUBLIC_EVENTS_URL ?? ''
).trim().replace(/\/$/, '')

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

  // Paso 1: pedir una URL firmada al backend (request JSON liviano)
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

  if (!urlRes.ok || !urlPayload?.signedUrl || !urlPayload?.publicUrl) {
    throw new Error(urlPayload?.error ?? 'No se pudo iniciar la subida.')
  }

  // Paso 2: subir directo a Supabase Storage con XHR para tener progreso real.
  // Esto bypasea el límite de 4.5 MB de Vercel Functions.
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', urlPayload.signedUrl!)
    xhr.setRequestHeader('Content-Type', file.type)

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      })
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(xhr.responseText || `Error ${xhr.status} al subir el archivo.`))
      }
    })
    xhr.addEventListener('error', () => reject(new Error('No se pudo subir el archivo.')))
    xhr.addEventListener('abort', () => reject(new Error('Subida cancelada.')))

    xhr.send(file)
  })

  return urlPayload.publicUrl
}
