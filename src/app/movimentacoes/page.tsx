'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react'
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS, cn } from '@/lib/utils'
import { mapFinancialRecord } from '@/lib/api'
import RecordFormModal from '@/components/RecordFormModal'

interface Category {
  id: string
  name: string
  type: string
}

interface FinancialRecord {
  id: string
  type: string
  paymentMethod: string
  amount: number
  currency: string
  transactionDate: string
  dueDate: string | null
  paymentDate: string | null
  status: string
  description: string | null
  notes: string | null
  reference: string | null
  categoryId: string | null
  category: { name: string } | null
  sale: { client: string } | null
}

export default function MovimentacoesPage() {
  const [records, setRecords] = useState<FinancialRecord[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<Record<string, string> | null>(null)
  const [filters, setFilters] = useState({ type: '', status: '', categoryId: '', startDate: '', endDate: '' })
  const [showFilters, setShowFilters] = useState(false)

  const loadRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.type) params.set('type', filters.type)
      if (filters.status) params.set('status', filters.status)
      if (filters.categoryId) params.set('categoryId', filters.categoryId)
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)

      const res = await fetch(`/api/financial-records?${params}`)
      if (res.ok) {
        const raw = await res.json()
        setRecords(raw.map(mapFinancialRecord))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadRecords()
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(console.error)
  }, [loadRecords])

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta movimentacao?')) return
    try {
      await fetch(`/api/financial-records/${id}`, { method: 'DELETE' })
      loadRecords()
    } catch (e) {
      console.error(e)
    }
  }

  function handleEdit(record: FinancialRecord) {
    setEditRecord({
      id: record.id,
      type: record.type,
      paymentMethod: record.paymentMethod,
      amount: String(record.amount),
      currency: record.currency,
      categoryId: record.categoryId || '',
      transactionDate: record.transactionDate,
      dueDate: record.dueDate || '',
      paymentDate: record.paymentDate || '',
      status: record.status,
      description: record.description || '',
      notes: record.notes || '',
      reference: record.reference || '',
    })
    setModalOpen(true)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Movimentacoes</h1>
          <p className="text-gray-500">Todas as entradas e saidas</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
            <Filter size={16} /> Filtros
          </button>
          <button onClick={() => { setEditRecord(null); setModalOpen(true) }} className="flex items-center gap-2 px-4 py-2 bg-[#E61C5D] text-white rounded-lg text-sm hover:bg-[#C2185B]">
            <Plus size={16} /> Nova Movimentacao
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Todos os tipos</option>
              <option value="entrada">Entrada</option>
              <option value="saida">Saida</option>
            </select>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Todos os status</option>
              <option value="previsto">Previsto</option>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="recebido">Recebido</option>
              <option value="cancelado">Cancelado</option>
              <option value="estornado">Estornado</option>
            </select>
            <select value={filters.categoryId} onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Todas as categorias</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFC233] mx-auto" /></div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-4 text-sm font-medium text-gray-500">Data</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">Tipo</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">Descricao</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">Categoria</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">Pagamento</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-right p-4 text-sm font-medium text-gray-500">Valor</th>
                <th className="text-center p-4 text-sm font-medium text-gray-500">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="p-4 text-sm text-gray-600">{formatDate(r.transactionDate)}</td>
                  <td className="p-4">
                    {r.type === 'entrada' ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm"><ArrowUpRight size={14} /> Entrada</span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600 text-sm"><ArrowDownRight size={14} /> Saida</span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-800">{r.description || '-'}</td>
                  <td className="p-4 text-sm text-gray-600">{r.category?.name || '-'}</td>
                  <td className="p-4 text-sm text-gray-600">{r.paymentMethod}</td>
                  <td className="p-4">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[r.status])}>
                      {STATUS_LABELS[r.status] || r.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-right font-medium">
                    <span className={r.type === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(r.amount, r.currency)}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleEdit(r)} className="text-gray-400 hover:text-blue-600"><Pencil size={16} /></button>
                      <button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">Nenhuma movimentacao encontrada</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <RecordFormModal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditRecord(null) }} onSave={loadRecords} record={editRecord} />
    </div>
  )
}
