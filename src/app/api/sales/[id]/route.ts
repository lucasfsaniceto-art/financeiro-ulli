export const dynamic = 'force-dynamic'
import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = createServerClient()
    const { data, error } = await db
      .from('sales')
      .select('*, costs:sale_costs(*), financial_records(*, category:categories(*))')
      .eq('id', params.id)
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Venda nao encontrada' }, { status: 404 })
    return NextResponse.json(data)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar venda' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const db = createServerClient()
    const updateData: Record<string, unknown> = {}

    if (body.client !== undefined) updateData.client = body.client
    if (body.status !== undefined) updateData.status = body.status
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.passengers !== undefined) updateData.passengers = parseInt(body.passengers)
    if (body.package !== undefined) updateData.package = body.package

    const { data, error } = await db
      .from('sales')
      .update(updateData)
      .eq('id', params.id)
      .select('*, costs:sale_costs(*), financial_records(*)')
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao atualizar venda' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = createServerClient()
    // Delete related financial records first
    await db.from('financial_records').delete().eq('sale_id', params.id)
    const { error } = await db.from('sales').delete().eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao excluir venda' }, { status: 500 })
  }
}
