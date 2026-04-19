import { getSupabaseBrowserClient, hasSupabaseEnv } from './supabase'

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? '').trim().replace(/\/$/, '')
const DEFAULT_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_FETCH_TIMEOUT_MS ?? 10000)
const DEFAULT_GET_RETRIES = Number(process.env.NEXT_PUBLIC_FETCH_GET_RETRIES ?? 1)

type FetchApiOptions = RequestInit & {
  timeoutMs?: number
  retries?: number
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function normalizeRetryCount(method: string, retries?: number) {
  if (typeof retries === 'number') {
    return Math.max(0, retries)
  }

  return method === 'GET' ? Math.max(0, DEFAULT_GET_RETRIES) : 0
}

async function fetchWithTimeout(endpoint: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), Math.max(1000, timeoutMs))

  try {
    return await fetch(endpoint, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

export function requireBackendUrl() {
  if (!BACKEND_URL) {
    throw new Error('Falta NEXT_PUBLIC_BACKEND_URL en las variables de entorno.')
  }
  return BACKEND_URL
}

export async function fetchApi<T>(input: string, init?: FetchApiOptions): Promise<T> {
  const endpoint = `${requireBackendUrl()}${input.replace(/^\/api/, '')}`
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const method = (init?.method ?? 'GET').toUpperCase()
  const retries = normalizeRetryCount(method, init?.retries)
  const headers = new Headers({ 'Content-Type': 'application/json', ...(init?.headers ?? {}) })

  if (hasSupabaseEnv) {
    const { data } = await getSupabaseBrowserClient().auth.getSession()
    const token = data.session?.access_token
    if (!token) {
      throw new Error('Tu sesión expiró o no está activa. Inicia sesión nuevamente.')
    }
    headers.set('Authorization', `Bearer ${token}`)
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        endpoint,
        {
          credentials: 'include',
          ...init,
          headers,
        },
        timeoutMs,
      )

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? 'Error de comunicación con el servidor.')
      }

      return response.json() as Promise<T>
    } catch (error) {
      if (isAbortError(error)) {
        lastError = new Error('La solicitud tardó demasiado. Intenta nuevamente en unos segundos.')
      } else if (error instanceof Error) {
        lastError = error
      } else {
        lastError = new Error('Error de comunicación con el servidor.')
      }

      if (attempt === retries) {
        throw lastError
      }

      await delay(250 * (attempt + 1))
    }
  }

  throw new Error('Error de comunicación con el servidor.')
}
