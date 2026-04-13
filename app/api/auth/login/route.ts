import { NextResponse, type NextRequest } from 'next/server'
import { apiError, createRouteSupabaseClient, getSupabaseEnvErrorMessage } from '../../_lib/supabase'

export const runtime = 'nodejs'

function mapLoginError(message: string): { status: number; message: string } {
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid login credentials')) {
    return { status: 401, message: 'Email o contraseña incorrectos.' }
  }

  if (normalized.includes('email not confirmed')) {
    return { status: 403, message: 'Debes confirmar tu email antes de iniciar sesión.' }
  }

  if (normalized.includes('invalid api key')) {
    return {
      status: 500,
      message: 'Configuración inválida de Supabase. Revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    }
  }

  if (normalized.includes('fetch failed') || normalized.includes('enotfound')) {
    return {
      status: 500,
      message: 'No se pudo conectar con Supabase. Revisa NEXT_PUBLIC_SUPABASE_URL y tu conexión de red.',
    }
  }

  return { status: 400, message }
}

export async function POST(request: NextRequest) {
  const envErrorMessage = getSupabaseEnvErrorMessage()
  if (envErrorMessage) {
    return apiError(envErrorMessage, 500)
  }

  const supabase = createRouteSupabaseClient(request)

  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null

  if (!body) {
    return apiError('Body inválido. Debes enviar JSON válido.', 400)
  }

  const email = body.email?.trim()
  const password = body.password

  if (!email || !password) {
    return apiError('Email y contraseña son obligatorios.')
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    const mapped = mapLoginError(error.message)
    return apiError(mapped.message, mapped.status)
  }

  return NextResponse.json({ user: data.user, session: data.session })
}
