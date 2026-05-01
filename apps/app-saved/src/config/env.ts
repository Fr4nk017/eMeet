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
  PORT: Number(process.env.PORT ?? 3004),
  SUPABASE_URL: requireEnvAny(['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']),
  SUPABASE_ANON_KEY: requireEnvAny(['SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']),
  SUPABASE_SERVICE_ROLE_KEY: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  FRONTEND_ORIGIN: primaryOrigin,
  FRONTEND_ORIGINS: Array.from(
    new Set([primaryOrigin, previewOrigin, ...parseOrigins(process.env.FRONTEND_ORIGINS)].filter(Boolean) as string[]),
  ),
}
