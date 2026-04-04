'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { PAYMENT_METHODS, CURRENCIES } from '@/lib/utils'

interface Category {
  id: string
  name: string
  type: string
}

interface RecordData {
  id?: string
  type: string
  paymentMethod: string
  amount: string
  currency: string
  categoryId: string
  transactionDate: string
  dueDate: string
  paymentDate: string
  status: string
  description: string
  notes: string
  reference: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  record?: RecordData | null
  defaultType?: string
}

export default function RecordFormModal({ isOpen, onClose, onSave, record, defaultType }: Props) {
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState<RecordData>({
    type: defaultType || 'entrada',
    paymentMethod: 'Pix',
    amount: '',
    currency: 'BRL',
    categoryId: '',
    transactionDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    paymentDate: '',
    status: 'previsto',
    description: '',
    notes: '',
    reference: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then(setCategories)
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (record) {
      setForm({
        ...record,
        transactionDate: record.transactionDate ? record.transactionDate.split('T')[0] : '',
        dueDate: record.dueDate ? record.dueDate.split('T')[0] : '',
        paymentDate: record.paymentDate ? record.paymentDate.split('T')[0] : '',
      })
    } else {
      setForm({
        type: defaultType || 'entrada',
        paymentMethod: 'Pix',
        amount: '',
        currency: 'BRL',
        categoryId: '',
        transactionDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        paymentDate: '',
        status: 'previsto',
        description: '',
        notes: '',
        reference: '',
      })
    }
  }, [record, defaultType])

  if (!isOpen) return null

  const filteredCategories = categories.filter(
    (c) => c.type === form.type || c.type === 'transferencia' || c.type === 'ajuste'
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const url = record?.id ? `/api/financial-records/${record.id}` : '/api/financial-records'
      const method = record?.id ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        onSave()
        onClose()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">
            {record?.id ? 'Editar Movimentacao' : 'Nova Movimentacao'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="entrada">Entrada</option>
                <option value="saida">Saida</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="previsto">Previsto</option>
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
                <option value="recebido">Recebido</option>
                <option value="cancelado">Cancelado</option>
                <option value="estornado">Estornado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
              <input
                type="number"
                step="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moeda</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Metodo de Pagamento</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Selecione...</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data da Transacao</label>
              <input
                type="date"
                required
                value={form.transactionDate}
                onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Vencimento</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Pagamento</label>
              <input
                type="date"
                value={form.paymentDate}
                onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descricao</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Descricao da movimentacao"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
            <input
              type="text"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Numero do recibo, nota fiscal, etc."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#E61C5D] text-white rounded-lg text-sm hover:bg-[#C2185B] disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
