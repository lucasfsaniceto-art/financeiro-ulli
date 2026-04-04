export const dynamic = 'force-dynamic'
import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const db = createServerClient()
    const { data, error } = await db
      .from('categories')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const db = createServerClient()
    const { data, error } = await db
      .from('categories')
      .insert({
        name: body.name,
        type: body.type,
        active: body.active ?? true,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 })
  }
}
