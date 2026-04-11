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

    // Date filter:
    // - "previsto"/"pendente" → filter by due_date (when it will happen)
    // - paid/received/cancelled → filter by transaction_date (when it happened)
    // - no status filter → OR the two so each record is filtered by its effective date
    if (startDate || endDate) {
      const useDueDate = status === 'previsto' || status === 'pendente'
      if (status) {
        const field = useDueDate ? 'due_date' : 'transaction_date'
        if (startDate) query = query.gte(field, startDate)
        if (endDate) query = query.lte(field, endDate)
      } else {
        const foreseen = ['status.in.(previsto,pendente)']
        const settled = ['status.in.(pago,recebido,cancelado,estornado)']
        if (startDate) {
          foreseen.push(`due_date.gte.${startDate}`)
          settled.push(`transaction_date.gte.${startDate}`)
        }
        if (endDate) {
          foreseen.push(`due_date.lte.${endDate}`)
          settled.push(`transaction_date.lte.${endDate}`)
        }
        query = query.or(`and(${foreseen.join(',')}),and(${settled.join(',')})`)
      }
    }

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
