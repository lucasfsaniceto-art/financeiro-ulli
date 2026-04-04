export const dynamic = 'force-dynamic'
import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const categoryId = searchParams.get('categoryId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const db = createServerClient()
    let query = db
      .from('financial_records')
      .select('*, category:categories(*), sale:sales(client)')
      .order('transaction_date', { ascending: false })

    if (type) query = query.eq('type', type)
    if (status) query = query.eq('status', status)
    if (categoryId) query = query.eq('category_id', categoryId)
    if (startDate) query = query.gte('transaction_date', startDate)
    if (endDate) query = query.lte('transaction_date', endDate)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar movimentacoes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const db = createServerClient()
    const { data, error } = await db
      .from('financial_records')
      .insert({
        type: body.type,
        payment_method: body.paymentMethod || 'Pix',
        amount: parseFloat(body.amount),
        currency: body.currency || 'BRL',
        category_id: body.categoryId || null,
        transaction_date: body.transactionDate,
        due_date: body.dueDate || null,
        payment_date: body.paymentDate || null,
        status: body.status || 'previsto',
        description: body.description || null,
        notes: body.notes || null,
        reference: body.reference || null,
        sale_id: body.saleId || null,
        installment_number: body.installmentNumber || null,
        total_installments: body.totalInstallments || null,
      })
      .select('*, category:categories(*), sale:sales(client)')
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao criar movimentacao' }, { status: 500 })
  }
}
