'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, CheckCircle } from 'lucide-react'
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS, cn } from '@/lib/utils'
import { mapFinancialRecord } from '@/lib/api'
import RecordFormModal from '@/components/RecordFormModal'

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
  categoryId: string | null
  category: { name: string } | null
}

export default function ContasPagarPage() {
  const [records, setRecords] = useState<FinancialRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<Record<string, string> | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  const loadRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: 'saida' })
      if (statusFilter) params.set('status', statusFilter)
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
  }, [statusFilter])

  useEffect(() => { loadRecords() }, [loadRecords])

  async function markAsPaid(id: string) {
    try {
      await fetch(`/api/financial-records/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pago', paymentDate: new Date().toISOString().split('T')[0] }),
      })
      loadRecords()
    } catch (e) {
      console.error(e)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta conta a pagar?')) return
    await fetch(`/api/financial-records/${id}`, { method: 'DELETE' })
    loadRecords()
  }

  const totalPending = records.filter((r) => r.status === 'pendente' || r.status === 'previsto').reduce((sum, r) => sum + r.amount, 0)
  const totalPaid = records.filter((r) => r.status === 'pago').reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Contas a Pagar</h1>
          <p className="text-gray-500">Despesas e pagamentos</p>
        </div>
        <button onClick={() => { setEditRecord(null); setModalOpen(true) }} className="flex items-center gap-2 px-4 py-2 bg-[#E61C5D] text-white rounded-lg text-sm hover:bg-[#C2185B]">
          <Plus size={16} /> Nova Despesa
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">Total Pendente</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{formatCurrency(totalPending)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">Total Pago</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalPaid)}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {['', 'previsto', 'pendente', 'pago', 'cancelado'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={cn('px-3 py-1 rounded-full text-sm border', statusFilter === s ? 'bg-[#0E1A2B] text-white border-[#0E1A2B]' : 'text-gray-600 hover:bg-gray-100')}>
            {s ? STATUS_LABELS[s] : 'Todos'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFC233] mx-auto" /></div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-4 text-sm font-medium text-gray-500">Vencimento</th>
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
                  <td className="p-4 text-sm text-gray-600">{r.dueDate ? formatDate(r.dueDate) : formatDate(r.transactionDate)}</td>
                  <td className="p-4 text-sm text-gray-800">{r.description || '-'}</td>
                  <td className="p-4 text-sm text-gray-600">{r.category?.name || '-'}</td>
                  <td className="p-4 text-sm text-gray-600">{r.paymentMethod}</td>
                  <td className="p-4"><span className={cn('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[r.status])}>{STATUS_LABELS[r.status]}</span></td>
                  <td className="p-4 text-sm text-right font-medium text-red-600">{formatCurrency(r.amount, r.currency)}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      {(r.status === 'previsto' || r.status === 'pendente') && (
                        <button onClick={() => markAsPaid(r.id)} className="text-gray-400 hover:text-green-600" title="Marcar como pago"><CheckCircle size={16} /></button>
                      )}
                      <button onClick={() => {
                        setEditRecord({ id: r.id, type: r.type, paymentMethod: r.paymentMethod, amount: String(r.amount), currency: r.currency, categoryId: r.categoryId || '', transactionDate: r.transactionDate, dueDate: r.dueDate || '', paymentDate: r.paymentDate || '', status: r.status, description: r.description || '', notes: '', reference: '' })
                        setModalOpen(true)
                      }} className="text-gray-400 hover:text-blue-600"><Pencil size={16} /></button>
                      <button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">Nenhuma conta a pagar encontrada</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <RecordFormModal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditRecord(null) }} onSave={loadRecords} record={editRecord} defaultType="saida" />
    </div>
  )
}
