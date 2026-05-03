import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Configuración de Supabase incompleta.' }, { status: 500 })
  }

  let body: {
    name?: string
    email?: string
    password?: string
    role?: string
    businessName?: string
    businessLocation?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la petición inválido.' }, { status: 400 })
  }

  const { name, email, password, role, businessName, businessLocation } = body

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Nombre, email y contraseña son obligatorios.' }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 })
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey)
  const { data, error } = await anonClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role: role ?? 'user',
        business_name: businessName ?? null,
        business_location: businessLocation ?? null,
      },
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (data.user) {
    const effectiveRole = role ?? 'user'
    const profilePayload: Record<string, unknown> = {
      id: data.user.id,
      name: name.trim(),
      bio: '',
      location: effectiveRole === 'locatario'
        ? (businessLocation?.trim() ?? 'Santiago, Chile')
        : 'Santiago, Chile',
      role: effectiveRole,
      business_name: effectiveRole === 'locatario' ? (businessName?.trim() ?? null) : null,
      business_location: effectiveRole === 'locatario' ? (businessLocation?.trim() ?? null) : null,
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })

    if (profileError) {
      console.error('[api/auth/register] profile upsert failed:', JSON.stringify(profileError))
    }
  }

  return NextResponse.json({ user: data.user, session: data.session }, { status: 201 })
}
