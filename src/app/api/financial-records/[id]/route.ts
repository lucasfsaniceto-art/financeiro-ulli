export const dynamic = 'force-dynamic'
import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = createServerClient()
    const { data, error } = await db
      .from('financial_records')
      .select('*, category:categories(*), sale:sales(client)')
      .eq('id', params.id)
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Registro nao encontrado' }, { status: 404 })
    return NextResponse.json(data)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar registro' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const db = createServerClient()
    const updateData: Record<string, unknown> = {}

    if (body.type !== undefined) updateData.type = body.type
    if (body.paymentMethod !== undefined) updateData.payment_method = body.paymentMethod
    if (body.amount !== undefined) updateData.amount = parseFloat(body.amount)
    if (body.currency !== undefined) updateData.currency = body.currency
    if (body.categoryId !== undefined) updateData.category_id = body.categoryId || null
    if (body.transactionDate !== undefined) updateData.transaction_date = body.transactionDate
    if (body.dueDate !== undefined) updateData.due_date = body.dueDate || null
    if (body.paymentDate !== undefined) updateData.payment_date = body.paymentDate || null
    if (body.status !== undefined) updateData.status = body.status
    if (body.description !== undefined) updateData.description = body.description
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.reference !== undefined) updateData.reference = body.reference

    const { data, error } = await db
      .from('financial_records')
      .update(updateData)
      .eq('id', params.id)
      .select('*, category:categories(*), sale:sales(client)')
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao atualizar registro' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = createServerClient()
    const { error } = await db.from('financial_records').delete().eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao excluir registro' }, { status: 500 })
  }
}
