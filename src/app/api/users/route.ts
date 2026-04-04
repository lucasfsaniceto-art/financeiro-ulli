export const dynamic = 'force-dynamic'
import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'

export async function GET() {
  try {
    const db = createServerClient()
    const { data, error } = await db
      .from('users')
      .select('id, email, name, role, active, created_at')
      .order('name', { ascending: true })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar usuarios' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const db = createServerClient()

    if (!body.email || !body.password || !body.name) {
      return NextResponse.json({ error: 'Nome, email e senha sao obrigatorios' }, { status: 400 })
    }

    const { data, error } = await db
      .from('users')
      .insert({
        email: body.email.toLowerCase().trim(),
        name: body.name,
        password_hash: hashPassword(body.password),
        role: body.role || 'vendedor',
        active: true,
      })
      .select('id, email, name, role, active, created_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Email ja cadastrado' }, { status: 409 })
      }
      throw error
    }
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao criar usuario' }, { status: 500 })
  }
}
