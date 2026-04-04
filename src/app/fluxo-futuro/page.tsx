'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { mapFinancialRecord, mapSale } from '@/lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line,
} from 'recharts'

interface FinancialRecord {
  id: string; type: string; amount: number; currency: string; dueDate: string | null; transactionDate: string
  status: string; description: string | null; paymentMethod: string; installmentNumber: number | null; totalInstallments: number | null
}

interface ProjectionData { period: string; receivables: number; payables: number; net: number }

export default function FluxoFuturoPage() {
  const [loading, setLoading] = useState(true)
  const [projections, setProjections] = useState<ProjectionData[]>([])
  const [installmentData, setInstallmentData] = useState<Array<{ month: string; amount: number }>>([])
  const [tourProfitability, setTourProfitability] = useState<Array<{ name: string; revenue: number; costs: number; profit: number }>>([])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch('/api/financial-records?status=previsto')
      const pending = await fetch('/api/financial-records?status=pendente')
      let allRecords: FinancialRecord[] = []
      if (res.ok) allRecords = [...(await res.json()).map(mapFinancialRecord)]
      if (pending.ok) allRecords = [...allRecords, ...(await pending.json()).map(mapFinancialRecord)]

      const now = new Date()
      const periods = [
        { label: '7 dias', days: 7 }, { label: '15 dias', days: 15 },
        { label: '30 dias', days: 30 }, { label: '60 dias', days: 60 }, { label: '90 dias', days: 90 },
      ]

      const projData: ProjectionData[] = periods.map(({ label, days }) => {
        const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
        const relevant = allRecords.filter((r) => {
          const d = new Date(r.dueDate || r.transactionDate)
          return d >= now && d <= endDate
        })
        const receivables = relevant.filter(r => r.type === 'entrada').reduce((s, r) => s + r.amount, 0)
        const payables = relevant.filter(r => r.type === 'saida').reduce((s, r) => s + r.amount, 0)
        return { period: label, receivables, payables, net: receivables - payables }
      })
      setProjections(projData)

      const ccRecords = allRecords.filter(r => r.paymentMethod === 'Cartao de Credito' && r.installmentNumber)
      const byMonth: Record<string, number> = {}
      for (const r of ccRecords) {
        const d = new Date(r.dueDate || r.transactionDate)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        byMonth[key] = (byMonth[key] || 0) + r.amount
      }
      setInstallmentData(Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => ({ month, amount })))

      const salesRes = await fetch('/api/sales')
      if (salesRes.ok) {
        const sales = (await salesRes.json()).map(mapSale)
        const profitData = sales.map((s: { package: string; totalValue: number; costs: Array<{ amount: number }> }) => {
          const totalCosts = s.costs.reduce((sum: number, c: { amount: number }) => sum + c.amount, 0)
          return { name: s.package, revenue: s.totalValue, costs: totalCosts, profit: s.totalValue - totalCosts }
        })
        profitData.sort((a: { profit: number }, b: { profit: number }) => b.profit - a.profit)
        setTourProfitability(profitData.slice(0, 10))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFC233]" /></div>
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Fluxo Futuro</h1>
        <p className="text-gray-500">Projecoes e analise de fluxo de caixa</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {projections.map((p) => (
          <div key={p.period} className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 mb-2">{p.period}</p>
            <div className="space-y-1">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Receber</span><span className="text-green-600 font-medium">{formatCurrency(p.receivables)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Pagar</span><span className="text-red-600 font-medium">{formatCurrency(p.payables)}</span></div>
              <div className="flex justify-between text-sm border-t pt-1"><span className="text-gray-500">Liquido</span><span className={`font-bold ${p.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(p.net)}</span></div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Receber vs Pagar por Periodo</h2>
        {projections.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={projections}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} /><Legend />
              <Bar dataKey="receivables" name="A Receber" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="payables" name="A Pagar" fill="#E61C5D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-gray-400 text-center py-12">Sem dados para exibir</p>}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Curva de Parcelas - Cartao de Credito</h2>
        {installmentData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={installmentData}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Line type="monotone" dataKey="amount" name="Valor" stroke="#FFC233" strokeWidth={2} dot={{ fill: '#FFC233' }} />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="text-gray-400 text-center py-12">Nenhuma parcela de cartao encontrada</p>}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Ranking de Lucratividade por Tour</h2>
        {tourProfitability.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-3 text-sm font-medium text-gray-500">#</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-500">Pacote</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-500">Receita</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-500">Custos</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-500">Lucro</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-500">Margem</th>
                </tr>
              </thead>
              <tbody>
                {tourProfitability.map((t, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-3 text-sm text-gray-500">{i + 1}</td>
                    <td className="p-3 text-sm font-medium text-gray-800">{t.name}</td>
                    <td className="p-3 text-sm text-right text-green-600">{formatCurrency(t.revenue)}</td>
                    <td className="p-3 text-sm text-right text-red-600">{formatCurrency(t.costs)}</td>
                    <td className="p-3 text-sm text-right font-medium"><span className={t.profit >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(t.profit)}</span></td>
                    <td className="p-3 text-sm text-right text-gray-600">{t.revenue > 0 ? `${((t.profit / t.revenue) * 100).toFixed(1)}%` : '0%'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-gray-400 text-center py-12">Nenhum tour cadastrado</p>}
      </div>
    </div>
  )
}
