import { getSupabaseBrowserClient, hasSupabaseEnv } from './supabase'

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? '').trim().replace(/\/$/, '')

export function requireBackendUrl() {
  if (!BACKEND_URL) {
    throw new Error('Falta NEXT_PUBLIC_BACKEND_URL en las variables de entorno.')
  }
  return BACKEND_URL
}

export async function fetchApi<T>(input: string, init?: RequestInit): Promise<T> {
  const endpoint = `${requireBackendUrl()}${input.replace(/^\/api/, '')}`
  const headers = new Headers({ 'Content-Type': 'application/json', ...(init?.headers ?? {}) })

  if (hasSupabaseEnv) {
    const { data } = await getSupabaseBrowserClient().auth.getSession()
    const token = data.session?.access_token
    if (!token) {
      throw new Error('Tu sesión expiró o no está activa. Inicia sesión nuevamente.')
    }
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(endpoint, {
    credentials: 'include',
    ...init,
    headers,
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? 'Error de comunicación con el servidor.')
  }

  return response.json() as Promise<T>
}
