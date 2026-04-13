import { NextResponse, type NextRequest } from 'next/server'
import { apiError, createRouteSupabaseClient, getSupabaseEnvErrorMessage } from '../../_lib/supabase'

export const runtime = 'nodejs'

function mapRegisterError(message: string): { status: number; message: string } {
  const normalized = message.toLowerCase()

  if (normalized.includes('user already registered')) {
    return { status: 409, message: 'Este correo ya está registrado. Inicia sesión.' }
  }

  if (normalized.includes('password should be at least')) {
    return { status: 400, message: 'La contraseña debe tener al menos 6 caracteres.' }
  }

  if (normalized.includes('signup is disabled')) {
    return { status: 403, message: 'El registro está deshabilitado en Supabase.' }
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

  const body = (await request.json().catch(() => null)) as
    | { name?: string; email?: string; password?: string }
    | null

  if (!body) {
    return apiError('Body inválido. Debes enviar JSON válido.', 400)
  }

  const name = body.name?.trim()
  const email = body.email?.trim()
  const password = body.password

  if (!name || !email || !password) {
    return apiError('Nombre, email y contraseña son obligatorios.')
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  })

  if (error) {
    const mapped = mapRegisterError(error.message)
    return apiError(mapped.message, mapped.status)
  }

  return NextResponse.json({ user: data.user, session: data.session }, { status: 201 })
}
