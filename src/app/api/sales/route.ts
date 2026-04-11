export const dynamic = 'force-dynamic'
import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { calculateInstallmentValue } from '@/lib/utils'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const db = createServerClient()
    const user = getUserFromRequest(request)

    let query = db
      .from('sales')
      .select('*, costs:sale_costs(*), financial_records(*), seller:users!sales_seller_id_fkey(name)')
      .order('sale_date', { ascending: false })

    // Vendedor so ve suas proprias vendas
    if (user?.role === 'vendedor') {
      query = query.eq('seller_id', user.id)
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar vendas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const db = createServerClient()
    const user = getUserFromRequest(request)

    const totalValue = parseFloat(body.totalValue)
    const reservationPayment = parseFloat(body.reservationPayment || '0')
    const remaining = totalValue - reservationPayment
    const installments = parseInt(body.installments || '1')
    const interestRate = parseFloat(body.interestRate || '0')

    // Find revenue category
    const { data: revenueCategory } = await db
      .from('categories')
      .select('id')
      .eq('type', 'entrada')
      .ilike('name', '%Receita%')
      .limit(1)
      .single()

    const { data: sale, error: saleError } = await db
      .from('sales')
      .insert({
        client: body.client,
        passengers: parseInt(body.passengers),
        package: body.package,
        total_value: totalValue,
        currency: body.currency || 'BRL',
        sale_date: body.saleDate,
        tour_date: body.tourDate,
        reservation_payment: reservationPayment,
        remaining_value: remaining,
        payment_method: body.paymentMethod || 'Pix',
        installments,
        interest_rate: interestRate,
        status: 'ativo',
        notes: body.notes || null,
        seller_id: user?.id || null,
      })
      .select()
      .single()

    if (saleError) throw saleError

    // Create financial records
    const records = []

    if (reservationPayment > 0) {
      records.push({
        type: 'entrada',
        payment_method: body.paymentMethod || 'Pix',
        amount: reservationPayment,
        currency: body.currency || 'BRL',
        category_id: revenueCategory?.id || null,
        transaction_date: body.saleDate,
        due_date: body.saleDate,
        status: 'recebido',
        description: `Sinal - ${body.client} - ${body.package}`,
        sale_id: sale.id,
        installment_number: 0,
        total_installments: installments,
      })
    }

    if (remaining > 0) {
      const installmentValue = calculateInstallmentValue(remaining, installments, interestRate)
      const saleDate = new Date(body.saleDate)

      // Última parcela vence 1 dia antes do tour; parcelas anteriores recuam 1 mês.
      // Fallback para saleDate + i meses se tourDate não estiver definido.
      const tourDate = body.tourDate ? new Date(body.tourDate) : null
      const lastDueDate = tourDate ? new Date(tourDate) : null
      if (lastDueDate) lastDueDate.setDate(lastDueDate.getDate() - 1)

      for (let i = 1; i <= installments; i++) {
        let dueDate: Date
        if (lastDueDate) {
          dueDate = new Date(lastDueDate)
          dueDate.setMonth(dueDate.getMonth() - (installments - i))
          if (dueDate < saleDate) dueDate = new Date(saleDate)
        } else {
          dueDate = new Date(saleDate)
          dueDate.setMonth(dueDate.getMonth() + i)
        }

        records.push({
          type: 'entrada',
          payment_method: body.paymentMethod || 'Pix',
          amount: Math.round(installmentValue * 100) / 100,
          currency: body.currency || 'BRL',
          category_id: revenueCategory?.id || null,
          transaction_date: body.saleDate,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'previsto',
          description: `Parcela ${i}/${installments} - ${body.client} - ${body.package}`,
          sale_id: sale.id,
          installment_number: i,
          total_installments: installments,
        })
      }
    }

    if (records.length > 0) {
      const { error: recError } = await db.from('financial_records').insert(records)
      if (recError) throw recError
    }

    // Return full sale
    const { data: fullSale } = await db
      .from('sales')
      .select('*, costs:sale_costs(*), financial_records(*)')
      .eq('id', sale.id)
      .single()

    return NextResponse.json(fullSale, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao criar venda' }, { status: 500 })
  }
}
