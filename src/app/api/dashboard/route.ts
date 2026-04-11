export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'

const CURRENCIES = ['BRL', 'CLP', 'USD']

// Headers to bypass Vercel Edge/CDN cache — prevents stale dashboard responses
const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
}

interface CurrencyBalance {
  balance: number
  revenue: number
  expenses: number
  receivables: number
  payables: number
}

interface PrevCurrencyTotals {
  revenue: number
  expenses: number
}

interface RawRecord {
  id: string
  type: string
  amount: number
  currency: string
  status: string
  transaction_date: string
  due_date: string | null
  payment_method: string
  category_id: string | null
  description: string | null
}

export async function GET(request: NextRequest) {
  try {
    const db = createServerClient()
    const user = getUserFromRequest(request)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const today = now.toISOString().split('T')[0]

    if (user?.role === 'vendedor') {
      return await getSellerDashboard(db, user.id)
    }

    // Fetch all financial records (with all fields needed for executive views)
    const { data: allRecords } = await db
      .from('financial_records')
      .select('id, type, amount, currency, status, transaction_date, due_date, payment_method, category_id, description')

    const records = (allRecords || []) as RawRecord[]

    // ===== Per-currency balances (current month) =====
    const byCurrency: Record<string, CurrencyBalance> = {}
    const prevByCurrency: Record<string, PrevCurrencyTotals> = {}
    for (const cur of CURRENCIES) {
      byCurrency[cur] = { balance: 0, revenue: 0, expenses: 0, receivables: 0, payables: 0 }
      prevByCurrency[cur] = { revenue: 0, expenses: 0 }
    }

    // ===== Daily flow (BRL last 30 days) — pre-initialized =====
    const dailyFlowMap: Record<string, { date: string; entradas: number; saidas: number }> = {}
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000)
      const key = d.toISOString().split('T')[0]
      dailyFlowMap[key] = { date: key, entradas: 0, saidas: 0 }
    }

    let overdueCount = 0
    let uncategorizedCount = 0

    for (const r of records) {
      const cur = CURRENCIES.includes(r.currency) ? r.currency : 'BRL'
      const amount = Number(r.amount)
      const isPaid = r.status === 'recebido' || r.status === 'pago'
      const isPending = r.status === 'previsto' || r.status === 'pendente'
      const inMonth = r.transaction_date >= startOfMonth && r.transaction_date <= endOfMonth
      const inPrevMonth = r.transaction_date >= startOfPrevMonth && r.transaction_date <= endOfPrevMonth

      if (r.type === 'entrada') {
        if (isPaid) {
          byCurrency[cur].balance += amount
          if (inMonth) byCurrency[cur].revenue += amount
          if (inPrevMonth) prevByCurrency[cur].revenue += amount
        }
        if (isPending) byCurrency[cur].receivables += amount
      } else if (r.type === 'saida') {
        if (isPaid) {
          byCurrency[cur].balance -= amount
          if (inMonth) byCurrency[cur].expenses += amount
          if (inPrevMonth) prevByCurrency[cur].expenses += amount
        }
        if (isPending) byCurrency[cur].payables += amount
      }

      // Daily flow (BRL only — the main macro chart)
      if (cur === 'BRL' && isPaid && r.transaction_date >= thirtyDaysAgo && r.transaction_date <= today) {
        const bucket = dailyFlowMap[r.transaction_date]
        if (bucket) {
          if (r.type === 'entrada') bucket.entradas += amount
          else if (r.type === 'saida') bucket.saidas += amount
        }
      }

      // Overdue check
      if (isPending && r.due_date && r.due_date < today) {
        overdueCount++
      }

      // Uncategorized check
      if (!r.category_id) {
        uncategorizedCount++
      }
    }

    // Round current month values
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

    // Round previous month values
    const previousMonth: Record<string, { revenue: number; expenses: number; net: number }> = {}
    for (const cur of CURRENCIES) {
      const p = prevByCurrency[cur]
      previousMonth[cur] = {
        revenue: Math.round(p.revenue * 100) / 100,
        expenses: Math.round(p.expenses * 100) / 100,
        net: Math.round((p.revenue - p.expenses) * 100) / 100,
      }
    }

    // Round daily flow
    const dailyFlow = Object.values(dailyFlowMap).map(d => ({
      date: d.date,
      entradas: Math.round(d.entradas * 100) / 100,
      saidas: Math.round(d.saidas * 100) / 100,
    }))

    // Forecast 30 days (all currencies combined)
    const forecast30 = records
      .filter(r => r.type === 'entrada' && (r.status === 'previsto' || r.status === 'pendente') && r.due_date && r.due_date >= today && r.due_date <= next30Days)
      .reduce((s, r) => s + Number(r.amount), 0)

    // ===== Upcoming payables / receivables (next 7 days) =====
    type UpcomingItem = { id: string; description: string | null; amount: number; currency: string; dueDate: string; daysUntil: number }
    const toUpcoming = (r: RawRecord): UpcomingItem => {
      const due = r.due_date as string
      const msPerDay = 24 * 60 * 60 * 1000
      const daysUntil = Math.max(0, Math.round((new Date(due).getTime() - new Date(today).getTime()) / msPerDay))
      return {
        id: r.id,
        description: r.description,
        amount: Number(r.amount),
        currency: r.currency,
        dueDate: due,
        daysUntil,
      }
    }
    const upcomingPayables: UpcomingItem[] = records
      .filter(r => r.type === 'saida' && (r.status === 'previsto' || r.status === 'pendente') && r.due_date && r.due_date >= today && r.due_date <= next7Days)
      .sort((a, b) => (a.due_date as string).localeCompare(b.due_date as string))
      .slice(0, 5)
      .map(toUpcoming)
    const upcomingReceivables: UpcomingItem[] = records
      .filter(r => r.type === 'entrada' && (r.status === 'previsto' || r.status === 'pendente') && r.due_date && r.due_date >= today && r.due_date <= next7Days)
      .sort((a, b) => (a.due_date as string).localeCompare(b.due_date as string))
      .slice(0, 5)
      .map(toUpcoming)

    // ===== Recent transactions =====
    const { data: recentTransactions } = await db
      .from('financial_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8)

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

    // ===== Month progress & pace projection =====
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const daysElapsed = now.getDate()
    const pacedRevenue = daysElapsed > 0 ? Math.round(((brlRevenue / daysElapsed) * daysInMonth) * 100) / 100 : 0
    const monthProgress = {
      daysElapsed,
      daysInMonth,
      percentage: Math.round((daysElapsed / daysInMonth) * 100),
      pacedRevenue,
    }

    // ===== Alerts (radar) =====
    const cashFlowRisk = Object.values(byCurrency).some(c => c.payables > c.receivables && c.payables > 0)
    const alerts: Array<{ type: 'error' | 'warning' | 'info'; text: string; count?: number }> = []
    if (overdueCount > 0) {
      alerts.push({
        type: 'error',
        text: `${overdueCount} ${overdueCount === 1 ? 'conta vencida' : 'contas vencidas'}`,
        count: overdueCount,
      })
    }
    if (upcomingPayables.length > 0) {
      alerts.push({
        type: 'warning',
        text: `${upcomingPayables.length} ${upcomingPayables.length === 1 ? 'conta a pagar' : 'contas a pagar'} nos próximos 7 dias`,
        count: upcomingPayables.length,
      })
    }
    if (cashFlowRisk) {
      alerts.push({
        type: 'error',
        text: 'Contas a pagar excedem a receber em uma ou mais moedas',
      })
    }
    if (uncategorizedCount > 0) {
      alerts.push({
        type: 'info',
        text: `${uncategorizedCount} ${uncategorizedCount === 1 ? 'movimentação sem categoria' : 'movimentações sem categoria'}`,
        count: uncategorizedCount,
      })
    }

    // Sales overview for admin
    const { data: allSales } = await db
      .from('sales')
      .select('id, client, package, total_value, currency, sale_date, status, seller:users!sales_seller_id_fkey(name)')
      .order('sale_date', { ascending: false })
      .limit(10)

    const { data: salesStats } = await db
      .from('sales')
      .select('id, total_value, sale_date, status')

    const activeSales = salesStats?.filter((s: { status: string }) => s.status === 'ativo') || []
    const monthlySalesCount = salesStats?.filter((s: { sale_date: string }) => s.sale_date >= startOfMonth && s.sale_date <= endOfMonth).length || 0
    const totalSalesValue = activeSales.reduce((s: number, r: { total_value: number }) => s + Number(r.total_value), 0)

    return NextResponse.json({
      balanceByCurrency,
      previousMonth,
      dailyFlow,
      monthProgress,
      forecast30: Math.round(forecast30 * 100) / 100,
      breakEvenTarget,
      breakEvenProgress: breakEvenTarget > 0 ? Math.round((brlRevenue / breakEvenTarget) * 10000) / 100 : 0,
      breakEvenRemaining: Math.max(0, Math.round((breakEvenTarget - brlRevenue) * 100) / 100),
      cashFlowRisk,
      overdueCount,
      uncategorizedCount,
      upcomingPayables,
      upcomingReceivables,
      alerts,
      recentTransactions: (recentTransactions || []).map(mapRecord),
      revenueByPaymentMethod,
      revenueDistribution: CURRENCIES.map(cur => ({
        currency: cur,
        recebido: balanceByCurrency[cur].balance + balanceByCurrency[cur].expenses,
        previsto: balanceByCurrency[cur].receivables,
      })).filter(d => d.recebido > 0 || d.previsto > 0),
      salesSummary: {
        totalActive: activeSales.length,
        totalValue: Math.round(totalSalesValue * 100) / 100,
        monthlySalesCount,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recentSales: (allSales || []).map((s: any) => ({
        id: s.id,
        client: s.client,
        package: s.package,
        totalValue: Number(s.total_value),
        currency: s.currency,
        saleDate: s.sale_date,
        status: s.status,
        sellerName: s.seller?.name || null,
      })),
    }, { headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao carregar dashboard' }, { status: 500, headers: NO_STORE_HEADERS })
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
    .order('sale_date', { ascending: false })

  const allSales = sales || []
  const totalSales = allSales.length
  const totalValue = allSales.reduce((s: number, r: { total_value: number }) => s + Number(r.total_value), 0)

  const monthlySales = allSales.filter((s: { sale_date: string }) => {
    return s.sale_date >= startOfMonth && s.sale_date <= endOfMonth
  })
  const monthlyValue = monthlySales.reduce((s: number, r: { total_value: number }) => s + Number(r.total_value), 0)

  const totalCosts = allSales.reduce((s: number, sale: { costs: Array<{ amount: number }> }) => {
    return s + (sale.costs?.reduce((cs: number, c: { amount: number }) => cs + Number(c.amount), 0) || 0)
  }, 0)

  return NextResponse.json({
    sellerDashboard: true,
    totalSales,
    totalValue: Math.round(totalValue * 100) / 100,
    monthlySales: monthlySales.length,
    monthlyValue: Math.round(monthlyValue * 100) / 100,
    totalProfit: Math.round((totalValue - totalCosts) * 100) / 100,
    recentSales: allSales.slice(0, 10).map((s: { id: string; client: string; package: string; total_value: number; sale_date: string; status: string }) => ({
      id: s.id,
      client: s.client,
      package: s.package,
      totalValue: s.total_value,
      saleDate: s.sale_date,
      status: s.status,
    })),
  }, { headers: NO_STORE_HEADERS })
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
