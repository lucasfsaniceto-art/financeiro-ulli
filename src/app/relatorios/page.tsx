'use client'

import { useEffect, useState, useCallback } from 'react'
import { Download, FileBarChart } from 'lucide-react'
import { formatCurrency, formatDate, STATUS_LABELS } from '@/lib/utils'
import { mapFinancialRecord } from '@/lib/api'

interface Category { id: string; name: string; type: string }

interface FinancialRecord {
  id: string; type: string; paymentMethod: string; amount: number; currency: string
  transactionDate: string; dueDate: string | null; paymentDate: string | null; status: string
  description: string | null; category: { name: string } | null; sale: { client: string } | null
}

const CURRENCIES = ['BRL', 'CLP', 'USD']
const CURRENCY_FLAGS: Record<string, string> = { BRL: '🇧🇷', CLP: '🇨🇱', USD: '🇺🇸' }

export default function RelatoriosPage() {
  const [records, setRecords] = useState<FinancialRecord[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ startDate: '', endDate: '', categoryId: '', status: '', type: '' })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)
      if (filters.categoryId) params.set('categoryId', filters.categoryId)
      if (filters.status) params.set('status', filters.status)
      if (filters.type) params.set('type', filters.type)

      const res = await fetch(`/api/financial-records?${params}`)
      if (res.ok) {
        const raw = await res.json()
        setRecords(raw.map(mapFinancialRecord))
      }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [filters])

  useEffect(() => {
    loadData()
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(console.error)
  }, [loadData])

  function exportCSV() {
    const headers = ['Data', 'Tipo', 'Descricao', 'Categoria', 'Metodo Pagamento', 'Status', 'Valor', 'Moeda']
    const rows = records.map((r) => [
      formatDate(r.transactionDate), r.type === 'entrada' ? 'Entrada' : 'Saida', r.description || '',
      r.category?.name || '', r.paymentMethod, STATUS_LABELS[r.status] || r.status, r.amount.toFixed(2), r.currency,
    ])
    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Totais por moeda
  const totalsByCurrency: Record<string, { entradas: number; saidas: number; count: number }> = {}
  for (const r of records) {
    const cur = r.currency || 'BRL'
    if (!totalsByCurrency[cur]) totalsByCurrency[cur] = { entradas: 0, saidas: 0, count: 0 }
    totalsByCurrency[cur].count++
    if (r.type === 'entrada') totalsByCurrency[cur].entradas += r.amount
    else totalsByCurrency[cur].saidas += r.amount
  }

  // Resumo por categoria separado por moeda
  const byCatCurrency: Record<string, Record<string, { entradas: number; saidas: number }>> = {}
  for (const r of records) {
    const cur = r.currency || 'BRL'
    const catName = r.category?.name || 'Sem Categoria'
    if (!byCatCurrency[cur]) byCatCurrency[cur] = {}
    if (!byCatCurrency[cur][catName]) byCatCurrency[cur][catName] = { entradas: 0, saidas: 0 }
    if (r.type === 'entrada') byCatCurrency[cur][catName].entradas += r.amount
    else byCatCurrency[cur][catName].saidas += r.amount
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Relatorios</h1>
          <p className="text-gray-500">Analise financeira detalhada</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-[#0E1A2B] text-white rounded-lg text-sm hover:bg-[#1a2d47]">
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Todos os tipos</option><option value="entrada">Entrada</option><option value="saida">Saida</option>
          </select>
          <select value={filters.categoryId} onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Todas as categorias</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Todos os status</option><option value="previsto">Previsto</option><option value="pendente">Pendente</option>
            <option value="pago">Pago</option><option value="recebido">Recebido</option><option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Totais por Moeda */}
      {CURRENCIES.filter(cur => totalsByCurrency[cur]).map(cur => {
        const t = totalsByCurrency[cur]
        return (
          <div key={cur}>
            <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-xl">{CURRENCY_FLAGS[cur]}</span> {cur}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-500">Total Entradas</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(t.entradas, cur)}</p>
                <p className="text-xs text-gray-400 mt-1">{records.filter(r => r.type === 'entrada' && (r.currency || 'BRL') === cur).length} registros</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-500">Total Saidas</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(t.saidas, cur)}</p>
                <p className="text-xs text-gray-400 mt-1">{records.filter(r => r.type === 'saida' && (r.currency || 'BRL') === cur).length} registros</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-500">Resultado</p>
                <p className={`text-2xl font-bold mt-1 ${t.entradas - t.saidas >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(t.entradas - t.saidas, cur)}</p>
                <p className="text-xs text-gray-400 mt-1">{t.count} registros total</p>
              </div>
            </div>
          </div>
        )
      })}

      {Object.keys(totalsByCurrency).length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6"><p className="text-sm text-gray-400">Nenhum registro</p></div>
          <div className="bg-white rounded-lg shadow p-6"><p className="text-sm text-gray-400">Nenhum registro</p></div>
          <div className="bg-white rounded-lg shadow p-6"><p className="text-sm text-gray-400">Nenhum registro</p></div>
        </div>
      )}

      {/* Resumo por Categoria por Moeda */}
      {CURRENCIES.filter(cur => byCatCurrency[cur]).map(cur => (
        <div key={cur} className="bg-white rounded-lg shadow">
          <div className="p-6 border-b flex items-center gap-2">
            <FileBarChart size={20} className="text-[#FFC233]" />
            <h2 className="text-lg font-semibold text-gray-800">Resumo por Categoria - {CURRENCY_FLAGS[cur]} {cur}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50"><th className="text-left p-4 text-sm font-medium text-gray-500">Categoria</th><th className="text-right p-4 text-sm font-medium text-gray-500">Entradas</th><th className="text-right p-4 text-sm font-medium text-gray-500">Saidas</th><th className="text-right p-4 text-sm font-medium text-gray-500">Saldo</th></tr></thead>
              <tbody>
                {Object.entries(byCatCurrency[cur]).map(([catName, cat], i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="p-4 text-sm text-gray-800 font-medium">{catName}</td>
                    <td className="p-4 text-sm text-right text-green-600">{formatCurrency(cat.entradas, cur)}</td>
                    <td className="p-4 text-sm text-right text-red-600">{formatCurrency(cat.saidas, cur)}</td>
                    <td className="p-4 text-sm text-right font-medium"><span className={cat.entradas - cat.saidas >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(cat.entradas - cat.saidas, cur)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b"><h2 className="text-lg font-semibold text-gray-800">Registros Detalhados</h2></div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFC233] mx-auto" /></div>
          ) : (
            <table className="w-full">
              <thead><tr className="bg-gray-50"><th className="text-left p-4 text-sm font-medium text-gray-500">Data</th><th className="text-left p-4 text-sm font-medium text-gray-500">Tipo</th><th className="text-left p-4 text-sm font-medium text-gray-500">Descricao</th><th className="text-left p-4 text-sm font-medium text-gray-500">Categoria</th><th className="text-left p-4 text-sm font-medium text-gray-500">Status</th><th className="text-right p-4 text-sm font-medium text-gray-500">Valor</th></tr></thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-gray-50">
                    <td className="p-4 text-sm text-gray-600">{formatDate(r.transactionDate)}</td>
                    <td className="p-4 text-sm">{r.type === 'entrada' ? 'Entrada' : 'Saida'}</td>
                    <td className="p-4 text-sm text-gray-800">{r.description || '-'}</td>
                    <td className="p-4 text-sm text-gray-600">{r.category?.name || '-'}</td>
                    <td className="p-4 text-sm text-gray-600">{STATUS_LABELS[r.status] || r.status}</td>
                    <td className="p-4 text-sm text-right font-medium"><span className={r.type === 'entrada' ? 'text-green-600' : 'text-red-600'}>{formatCurrency(r.amount, r.currency)}</span></td>
                  </tr>
                ))}
                {records.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">Nenhum registro encontrado</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
