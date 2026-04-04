export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { comparePassword, generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha sao obrigatorios' }, { status: 400 })
    }

    const db = createServerClient()
    const { data: user, error } = await db
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('active', true)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'Credenciais invalidas' }, { status: 401 })
    }

    if (!comparePassword(password, user.password_hash)) {
      return NextResponse.json({ error: 'Credenciais invalidas' }, { status: 401 })
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
