export const dynamic = 'force-dynamic'
import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const db = createServerClient()
    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.email !== undefined) updateData.email = body.email.toLowerCase().trim()
    if (body.role !== undefined) updateData.role = body.role
    if (body.active !== undefined) updateData.active = body.active
    if (body.password) updateData.password_hash = hashPassword(body.password)

    const { data, error } = await db
      .from('users')
      .update(updateData)
      .eq('id', params.id)
      .select('id, email, name, role, active, created_at')
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao atualizar usuario' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = createServerClient()
    const { error } = await db.from('users').update({ active: false }).eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao desativar usuario' }, { status: 500 })
  }
}
