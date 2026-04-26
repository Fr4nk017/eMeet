import 'dotenv/config'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Falta la variable de entorno ${name}`)
  return value
}

export const env = {
  PORT: Number(process.env.PORT ?? 3006),
  GOOGLE_MAPS_API_KEY: requireEnv('GOOGLE_MAPS_API_KEY'),
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
}
