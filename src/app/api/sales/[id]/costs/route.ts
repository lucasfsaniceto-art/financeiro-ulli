export const dynamic = 'force-dynamic'
import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const db = createServerClient()

    const { data: cost, error: costError } = await db
      .from('sale_costs')
      .insert({
        sale_id: params.id,
        description: body.description,
        amount: parseFloat(body.amount),
      })
      .select()
      .single()

    if (costError) throw costError

    // Also create a financial record for the cost
    const { data: costCategory } = await db
      .from('categories')
      .select('id')
      .eq('type', 'saida')
      .ilike('name', '%Custo%')
      .limit(1)
      .single()

    await db.from('financial_records').insert({
      type: 'saida',
      payment_method: body.paymentMethod || 'Pix',
      amount: parseFloat(body.amount),
      currency: 'BRL',
      category_id: costCategory?.id || null,
      transaction_date: new Date().toISOString().split('T')[0],
      status: 'pago',
      description: `Custo: ${body.description}`,
      sale_id: params.id,
    })

    return NextResponse.json(cost, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao adicionar custo' }, { status: 500 })
  }
}
