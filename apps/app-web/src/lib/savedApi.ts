import { getSupabaseBrowserClient, hasSupabaseEnv } from './supabase'

async function getAccessToken(): Promise<string | null> {
  if (!hasSupabaseEnv) return null
  const supabase = getSupabaseBrowserClient()
  const { data } = await supabase.auth.getSession()
  if (data.session?.access_token) return data.session.access_token
  const { data: refreshed, error } = await supabase.auth.refreshSession()
  if (error) return null
  return refreshed.session?.access_token ?? null
}

export async function callSavedApi<T = void>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers({ 'Content-Type': 'application/json', ...(init?.headers ?? {}) })

  if (hasSupabaseEnv) {
    const token = await getAccessToken()
    if (!token) throw new Error('Sesión expirada. Vuelve a iniciar sesión.')
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`/api/saved${path}`, { credentials: 'include', ...init, headers })

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? 'Error al comunicarse con el servicio de guardados.')
  }

  // Respuestas sin cuerpo (ej. DELETE 204)
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}
