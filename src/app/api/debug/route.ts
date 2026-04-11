export const dynamic = 'force-dynamic'
import { createServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// Debug endpoint — lists raw financial_records so we can compare with what the UI shows.
// Remove this file after diagnosis.
export async function GET() {
  const db = createServerClient()

  const { data: records, error: recErr, count } = await db
    .from('financial_records')
    .select('id, type, amount, currency, status, transaction_date, description, sale_id, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })

  const { data: sales, error: salesErr, count: salesCount } = await db
    .from('sales')
    .select('id, client, total_value, currency, reservation_payment, sale_date, status', { count: 'exact' })
    .order('created_at', { ascending: false })

  // Per-currency aggregate of paid entradas (what the dashboard balance uses)
  const paidByCurrency: Record<string, { entradas: number; saidas: number; net: number }> = {}
  for (const r of records || []) {
    const cur = r.currency || 'BRL'
    if (!paidByCurrency[cur]) paidByCurrency[cur] = { entradas: 0, saidas: 0, net: 0 }
    if (r.status === 'recebido' || r.status === 'pago') {
      if (r.type === 'entrada') {
        paidByCurrency[cur].entradas += Number(r.amount)
        paidByCurrency[cur].net += Number(r.amount)
      } else if (r.type === 'saida') {
        paidByCurrency[cur].saidas += Number(r.amount)
        paidByCurrency[cur].net -= Number(r.amount)
      }
    }
  }

  // Fingerprint of which Supabase project this runtime is connected to
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'unknown'

  return NextResponse.json({
    environment: {
      projectRef,               // e.g. "abcxyz123" — unique per Supabase project
      vercelEnv: process.env.VERCEL_ENV || 'local',
      vercelRegion: process.env.VERCEL_REGION || 'local',
      nodeEnv: process.env.NODE_ENV,
    },
    totalFinancialRecords: count,
    totalSales: salesCount,
    errors: { recErr: recErr?.message, salesErr: salesErr?.message },
    paidBalanceByCurrency: paidByCurrency,
    records: records || [],
    sales: sales || [],
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
    },
  })
}
