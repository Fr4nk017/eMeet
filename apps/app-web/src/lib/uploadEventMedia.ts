import { getSupabaseBrowserClient } from './supabase'

const EVENTS_URL = (
  process.env.NEXT_PUBLIC_EVENTS_URL ?? ''
).trim().replace(/\/$/, '')

export async function uploadEventMedia(file: File, userId: string): Promise<string> {
  const supabase = getSupabaseBrowserClient()
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  if (!token) {
    throw new Error('Debes iniciar sesión para subir archivos.')
  }

  if (!EVENTS_URL) {
    throw new Error('No está configurada la URL del servicio de eventos.')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('userId', userId)

  // Llamamos directo al backend para evitar el límite de 4.5 MB de Vercel Functions
  const res = await fetch(`${EVENTS_URL}/events/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  const payload = (await res.json().catch(() => null)) as { publicUrl?: string; error?: string } | null

  if (!res.ok || !payload?.publicUrl) {
    throw new Error(payload?.error ?? 'No se pudo subir el archivo.')
  }

  return payload.publicUrl
}
