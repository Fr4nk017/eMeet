import { getSupabaseBrowserClient } from './supabase'

export async function uploadEventMedia(file: File, userId: string): Promise<string> {
  const supabase = getSupabaseBrowserClient()
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  if (!token) {
    throw new Error('Debes iniciar sesión para subir archivos.')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('userId', userId)

  const res = await fetch('/api/event-media/upload', {
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
