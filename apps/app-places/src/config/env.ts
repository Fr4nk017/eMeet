import 'dotenv/config'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Falta la variable de entorno ${name}`)
  return value
}

function requireEnvAny(names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  throw new Error(`Falta una variable de entorno requerida. Define una de: ${names.join(', ')}`)
}

function normalizeOrigin(o: string): string {
  return o.trim().replace(/\/$/, '')
}

function parseOrigins(raw?: string): string[] {
  if (!raw) return []
  return raw.split(',').map(normalizeOrigin).filter(Boolean)
}

const primaryOrigin = normalizeOrigin(
  process.env.FRONTEND_ORIGIN?.trim() ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`
    : undefined) ??
  'http://localhost:3000'
)

const previewOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.trim()}` : undefined

export const env = {
  PORT: Number(process.env.PORT ?? 3006),
  GOOGLE_MAPS_API_KEY: requireEnvAny([
    'GOOGLE_MAPS_API_KEY',
    'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
    'VITE_GOOGLE_MAPS_API_KEY',
  ]),
  FRONTEND_ORIGIN: primaryOrigin,
  FRONTEND_ORIGINS: Array.from(
    new Set([primaryOrigin, previewOrigin, ...parseOrigins(process.env.FRONTEND_ORIGINS)].filter(Boolean) as string[]),
  ),
}
