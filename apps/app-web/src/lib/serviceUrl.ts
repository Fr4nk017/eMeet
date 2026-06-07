const LOCAL_DEFAULTS = {
  AUTH_URL: 'http://localhost:3001',
  PROFILE_URL: 'http://localhost:3002',
  EVENTS_URL: 'http://localhost:3003',
  SAVED_URL: 'http://localhost:3004',
  CHAT_URL: 'http://localhost:3005',
  PLACES_URL: 'http://localhost:3006',
  ADMIN_API_URL: 'http://localhost:3007',
} as const

type ServiceKey = keyof typeof LOCAL_DEFAULTS

function normalizeUrl(value?: string) {
  return (value ?? '').trim().replace(/\/$/, '')
}

function isLocalBrowserHost() {
  if (typeof window === 'undefined') return false
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
}

export function resolveServiceUrl(envValue: string | undefined, service: ServiceKey) {
  const fromEnv = normalizeUrl(envValue)
  if (fromEnv) return fromEnv

  if (isLocalBrowserHost()) {
    return LOCAL_DEFAULTS[service]
  }

  return ''
}
