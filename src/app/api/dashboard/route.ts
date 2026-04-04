export const dynamic = 'force-dynamic'
import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'

const CURRENCIES = ['BRL', 'CLP', 'USD']

interface CurrencyBalance {
  balance: number
  revenue: number
  expenses: number
  receivables: number
  payables: number
}

export async function GET(request: NextRequest) {
  try {
    const db = createServerClient()
    const user = getUserFromRequest(request)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const today = now.toISOString().split('T')[0]

    if (user?.role === 'vendedor') {
      return await getSellerDashboard(db, user.id)
    }

    // Fetch all financial records at once to compute everything in memory
    const { data: allRecords } = await db
      .from('financial_records')
      .select('type, amount, currency, status, transaction_date, due_date, payment_method')

    const records = allRecords || []

    // Compute per-currency balances
    const byCurrency: Record<string, CurrencyBalance> = {}
    for (const cur of CURRENCIES) {
      byCurrency[cur] = { balance: 0, revenue: 0, expenses: 0, receivables: 0, payables: 0 }
    }

    for (const r of records) {
      const cur = CURRENCIES.includes(r.currency) ? r.currency : 'BRL'
      const amount = Number(r.amount)
      const isPaid = r.status === 'recebido' || r.status === 'pago'
      const isPending = r.status === 'previsto' || r.status === 'pendente'
      const inMonth = r.transaction_date >= startOfMonth && r.transaction_date <= endOfMonth

      if (r.type === 'entrada') {
        if (isPaid) {
          byCurrency[cur].balance += amount
          if (inMonth) byCurrency[cur].revenue += amount
        }
        if (isPending) byCurrency[cur].receivables += amount
      } else if (r.type === 'saida') {
        if (isPaid) {
          byCurrency[cur].balance -= amount
          if (inMonth) byCurrency[cur].expenses += amount
        }
        if (isPending) byCurrency[cur].payables += amount
      }
    }

    // Round values
    const balanceByCurrency: Record<string, CurrencyBalance> = {}
    for (const cur of CURRENCIES) {
      const c = byCurrency[cur]
      balanceByCurrency[cur] = {
        balance: Math.round(c.balance * 100) / 100,
        revenue: Math.round(c.revenue * 100) / 100,
        expenses: Math.round(c.expenses * 100) / 100,
        receivables: Math.round(c.receivables * 100) / 100,
        payables: Math.round(c.payables * 100) / 100,
      }
    }

    // Totals for BRL (main currency for break-even, etc)
    const totalRevenue = Object.values(byCurrency).reduce((s, c) => s + c.revenue, 0)
    const totalExpenses = Object.values(byCurrency).reduce((s, c) => s + c.expenses, 0)

    // Forecast 30 days (all currencies combined for simplicity)
    const forecast30 = records
      .filter(r => r.type === 'entrada' && (r.status === 'previsto' || r.status === 'pendente') && r.due_date >= today && r.due_date <= next30Days)
      .reduce((s, r) => s + Number(r.amount), 0)

    // Recent transactions
    const { data: recentTransactions } = await db
      .from('financial_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (recentTransactions && recentTransactions.length > 0) {
      const { data: cats } = await db.from('categories').select('id, name')
      const catMap = new Map(cats?.map(c => [c.id, c.name]) || [])
      for (const r of recentTransactions) {
        r.category = r.category_id ? { name: catMap.get(r.category_id) || null } : null
      }
    }

    // Revenue by payment method
    const byPaymentMethod: Record<string, number> = {}
    for (const r of records) {
      if (r.type === 'entrada' && (r.status === 'recebido' || r.status === 'pago')) {
        byPaymentMethod[r.payment_method] = (byPaymentMethod[r.payment_method] || 0) + Number(r.amount)
      }
    }
    const revenueByPaymentMethod = Object.entries(byPaymentMethod).map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
    }))

    // Break-even
    const { data: breakEvenSetting } = await db
      .from('system_settings')
      .select('value')
      .eq('key', 'breakeven')
      .single()

    const breakEvenTarget = breakEvenSetting ? parseFloat(breakEvenSetting.value) : 230000
    const brlRevenue = byCurrency['BRL'].revenue

    return NextResponse.json({
      balanceByCurrency,
      forecast30: Math.round(forecast30 * 100) / 100,
      breakEvenTarget,
      breakEvenProgress: breakEvenTarget > 0 ? Math.round((brlRevenue / breakEvenTarget) * 10000) / 100 : 0,
      cashFlowRisk: Object.values(byCurrency).some(c => c.payables > c.receivables),
      recentTransactions: (recentTransactions || []).map(mapRecord),
      revenueByPaymentMethod,
      revenueDistribution: CURRENCIES.map(cur => ({
        currency: cur,
        recebido: balanceByCurrency[cur].balance + balanceByCurrency[cur].expenses,
        previsto: balanceByCurrency[cur].receivables,
      })).filter(d => d.recebido > 0 || d.previsto > 0),
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao carregar dashboard' }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSellerDashboard(db: any, sellerId: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const { data: sales } = await db
    .from('sales')
    .select('*, costs:sale_costs(*)')
    .eq('seller_id', sellerId)

  const totalSales = sales?.length || 0
  const totalValue = sales?.reduce((s: number, r: { total_value: number }) => s + Number(r.total_value), 0) || 0

  const monthlySales = sales?.filter((s: { sale_date: string }) => {
    return s.sale_date >= startOfMonth && s.sale_date <= endOfMonth
  }) || []
  const monthlyValue = monthlySales.reduce((s: number, r: { total_value: number }) => s + Number(r.total_value), 0)

  const totalCosts = sales?.reduce((s: number, sale: { costs: Array<{ amount: number }> }) => {
    return s + (sale.costs?.reduce((cs: number, c: { amount: number }) => cs + Number(c.amount), 0) || 0)
  }, 0) || 0

  return NextResponse.json({
    sellerDashboard: true,
    totalSales,
    totalValue: Math.round(totalValue * 100) / 100,
    monthlySales: monthlySales.length,
    monthlyValue: Math.round(monthlyValue * 100) / 100,
    totalProfit: Math.round((totalValue - totalCosts) * 100) / 100,
    recentSales: (sales || []).slice(0, 10).map((s: { id: string; client: string; package: string; total_value: number; sale_date: string; status: string }) => ({
      id: s.id,
      client: s.client,
      package: s.package,
      totalValue: s.total_value,
      saleDate: s.sale_date,
      status: s.status,
    })),
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRecord(r: any) {
  return {
    id: r.id,
    type: r.type,
    amount: Number(r.amount),
    currency: r.currency,
    description: r.description,
    status: r.status,
    transactionDate: r.transaction_date,
    category: r.category,
    paymentMethod: r.payment_method,
  }
}
