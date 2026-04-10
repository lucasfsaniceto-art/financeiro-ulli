'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { apiFetch, mapFinancialRecord, mapSale } from '@/lib/api'
import { GaugeArc } from '@/components/DesertSVG'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
} from 'recharts'

interface FinancialRecord {
  id: string; type: string; amount: number; currency: string; dueDate: string | null; transactionDate: string
  status: string; description: string | null; paymentMethod: string; installmentNumber: number | null; totalInstallments: number | null
}

interface ProjectionData { period: string; receivables: number; payables: number; net: number }

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload) return null
  return (
    <div className="card-elevated p-3 rounded-input border border-border">
      <p className="text-small text-text-muted font-display mb-2">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-mono font-medium tabular-nums" style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
      ))}
    </div>
  )
}

export default function FluxoFuturoPage() {
  const [loading, setLoading] = useState(true)
  const [projections, setProjections] = useState<ProjectionData[]>([])
  const [installmentData, setInstallmentData] = useState<Array<{ month: string; amount: number }>>([])
  const [tourProfitability, setTourProfitability] = useState<Array<{ name: string; revenue: number; costs: number; profit: number }>>([])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const res = await apiFetch('/api/financial-records?status=previsto')
      const pending = await apiFetch('/api/financial-records?status=pendente')
      let allRecords: FinancialRecord[] = []
      if (res.ok) allRecords = [...(await res.json()).map(mapFinancialRecord)]
      if (pending.ok) allRecords = [...allRecords, ...(await pending.json()).map(mapFinancialRecord)]

      const now = new Date()
      const periods = [
        { label: '7 dias', days: 7 }, { label: '15 dias', days: 15 },
        { label: '30 dias', days: 30 }, { label: '60 dias', days: 60 }, { label: '90 dias', days: 90 },
      ]
      setProjections(periods.map(({ label, days }) => {
        const endDate = new Date(now.getTime() + days * 86400000)
        const relevant = allRecords.filter(r => { const d = new Date(r.dueDate || r.transactionDate); return d >= now && d <= endDate })
        const receivables = relevant.filter(r => r.type === 'entrada').reduce((s, r) => s + r.amount, 0)
        const payables = relevant.filter(r => r.type === 'saida').reduce((s, r) => s + r.amount, 0)
        return { period: label, receivables, payables, net: receivables - payables }
      }))

      const byMonth: Record<string, number> = {}
      for (const r of allRecords.filter(r => r.paymentMethod === 'Cartao de Credito' && r.installmentNumber)) {
        const d = new Date(r.dueDate || r.transactionDate)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        byMonth[key] = (byMonth[key] || 0) + r.amount
      }
      setInstallmentData(Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => ({ month, amount })))

      const salesRes = await apiFetch('/api/sales')
      if (salesRes.ok) {
        const sales = (await salesRes.json()).map(mapSale)
        const profitData = sales.map((s: { package: string; totalValue: number; costs: Array<{ amount: number }> }) => {
          const totalCosts = s.costs.reduce((sum: number, c: { amount: number }) => sum + c.amount, 0)
          return { name: s.package, revenue: s.totalValue, costs: totalCosts, profit: s.totalValue - totalCosts }
        }).sort((a: { profit: number }, b: { profit: number }) => b.profit - a.profit).slice(0, 10)
        setTourProfitability(profitData)
      }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-6 h-6 border-2 border-accent/20 border-t-accent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading font-display text-text-primary">Fluxo Futuro</h1>
        <p className="text-text-muted text-body mt-1">Projecoes e analise de fluxo de caixa</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {projections.map(p => (
          <div key={p.period} className="card-surface p-4">
            <p className="text-label font-display text-text-muted uppercase tracking-wider mb-3">{p.period}</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm"><span className="text-text-muted font-display">Receber</span><span className="text-accent font-mono font-medium tabular-nums">{formatCurrency(p.receivables)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-text-muted font-display">Pagar</span><span className="text-text-secondary font-mono font-medium tabular-nums">{formatCurrency(p.payables)}</span></div>
              <div className="flex justify-between text-sm border-t border-border-subtle pt-1.5"><span className="text-text-muted font-display">Liquido</span><span className={`font-mono font-bold tabular-nums ${p.net >= 0 ? 'text-status-success' : 'text-status-error'}`}>{formatCurrency(p.net)}</span></div>
            </div>
          </div>
        ))}
      </div>

      <div className="card-surface p-6">
        <h2 className="text-subheading font-display text-text-primary mb-5">Receber vs Pagar por Periodo</h2>
        {projections.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={projections}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,36,32,0.06)" />
              <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#8C7B6B', fontFamily: 'Plus Jakarta Sans' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#8C7B6B', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="receivables" name="A Receber" fill="#C27B4F" radius={[8, 8, 0, 0]} />
              <Bar dataKey="payables" name="A Pagar" fill="#8C7B6B" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-text-muted text-center py-12 font-display">Sem dados para exibir</p>}
      </div>

      <div className="card-surface p-6">
        <h2 className="text-subheading font-display text-text-primary mb-5">Curva de Parcelas - Cartao de Credito</h2>
        {installmentData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={installmentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,36,32,0.06)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#8C7B6B', fontFamily: 'Plus Jakarta Sans' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#8C7B6B', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <defs>
                <linearGradient id="gradientParcela" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C27B4F" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#C27B4F" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="amount" name="Valor" stroke="#C27B4F" strokeWidth={2} fill="url(#gradientParcela)" dot={{ fill: '#C27B4F', strokeWidth: 0, r: 4 }} activeDot={{ r: 6, fill: '#C27B4F' }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : <p className="text-text-muted text-center py-12 font-display">Nenhuma parcela de cartao encontrada</p>}
      </div>

      <div className="card-surface overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-subheading font-display text-text-primary">Ranking de Lucratividade por Tour</h2>
        </div>
        {tourProfitability.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table-warm">
              <thead><tr><th>#</th><th>Pacote</th><th className="text-right">Receita</th><th className="text-right">Custos</th><th className="text-right">Lucro</th><th className="text-right">Margem</th></tr></thead>
              <tbody>
                {tourProfitability.map((t, i) => (
                  <tr key={i}>
                    <td className="text-text-muted font-mono tabular-nums">{i + 1}</td>
                    <td className="text-text-primary font-display font-medium">{t.name}</td>
                    <td className="text-right text-accent font-mono tabular-nums">{formatCurrency(t.revenue)}</td>
                    <td className="text-right text-text-secondary font-mono tabular-nums">{formatCurrency(t.costs)}</td>
                    <td className="text-right font-mono font-medium tabular-nums"><span className={t.profit >= 0 ? 'text-status-success' : 'text-status-error'}>{formatCurrency(t.profit)}</span></td>
                    <td className="text-right text-text-muted font-mono tabular-nums">{t.revenue > 0 ? `${((t.profit / t.revenue) * 100).toFixed(1)}%` : '0%'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-text-muted text-center py-12 font-display">Nenhum tour cadastrado</p>}
      </div>
    </div>
  )
}
