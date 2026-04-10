'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { PAYMENT_METHODS, CURRENCIES } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'

interface Category { id: string; name: string; type: string }

interface RecordData {
  id?: string; type: string; paymentMethod: string; amount: string; currency: string
  categoryId: string; transactionDate: string; dueDate: string; paymentDate: string
  status: string; description: string; notes: string; reference: string
}

interface Props {
  isOpen: boolean; onClose: () => void; onSave: () => void
  record?: RecordData | null; defaultType?: string
}

export default function RecordFormModal({ isOpen, onClose, onSave, record, defaultType }: Props) {
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState<RecordData>({
    type: defaultType || 'entrada', paymentMethod: 'Pix', amount: '', currency: 'BRL',
    categoryId: '', transactionDate: new Date().toISOString().split('T')[0],
    dueDate: '', paymentDate: '', status: 'previsto', description: '', notes: '', reference: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiFetch('/api/categories').then(r => r.json()).then(setCategories).catch(console.error)
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
        type: defaultType || 'entrada', paymentMethod: 'Pix', amount: '', currency: 'BRL',
        categoryId: '', transactionDate: new Date().toISOString().split('T')[0],
        dueDate: '', paymentDate: '', status: 'previsto', description: '', notes: '', reference: '',
      })
    }
  }, [record, defaultType])

  if (!isOpen) return null

  const filteredCategories = categories.filter(
    c => c.type === form.type || c.type === 'transferencia' || c.type === 'ajuste'
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const url = record?.id ? `/api/financial-records/${record.id}` : '/api/financial-records'
      const method = record?.id ? 'PUT' : 'POST'
      const res = await apiFetch(url, { method, body: JSON.stringify(form) })
      if (res.ok) { onSave(); onClose() }
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2 }}
          className="card-elevated w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto scrollbar-thin relative z-10 border border-border rounded-t-card sm:rounded-card"
        >
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-subheading font-display text-text-primary">
              {record?.id ? 'Editar Movimentacao' : 'Nova Movimentacao'}
            </h2>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-label text-text-muted mb-2 font-display">Tipo</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="select-warm">
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saida</option>
                </select>
              </div>
              <div>
                <label className="block text-label text-text-muted mb-2 font-display">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="select-warm">
                  <option value="previsto">Previsto</option>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="recebido">Recebido</option>
                  <option value="cancelado">Cancelado</option>
                  <option value="estornado">Estornado</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-label text-text-muted mb-2 font-display">Valor</label>
                <input type="number" step="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="input-warm font-mono" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-label text-text-muted mb-2 font-display">Moeda</label>
                <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className="select-warm">
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-label text-text-muted mb-2 font-display">Metodo de Pagamento</label>
                <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })} className="select-warm">
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-label text-text-muted mb-2 font-display">Categoria</label>
                <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} className="select-warm">
                  <option value="">Selecione...</option>
                  {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <div>
                <label className="block text-label text-text-muted mb-2 font-display">Data Transacao</label>
                <input type="date" required value={form.transactionDate} onChange={e => setForm({ ...form, transactionDate: e.target.value })} className="input-warm" />
              </div>
              <div>
                <label className="block text-label text-text-muted mb-2 font-display">Vencimento</label>
                <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="input-warm" />
              </div>
              <div>
                <label className="block text-label text-text-muted mb-2 font-display">Pagamento</label>
                <input type="date" value={form.paymentDate} onChange={e => setForm({ ...form, paymentDate: e.target.value })} className="input-warm" />
              </div>
            </div>

            <div>
              <label className="block text-label text-text-muted mb-2 font-display">Descricao</label>
              <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-warm" placeholder="Descricao da movimentacao" />
            </div>

            <div>
              <label className="block text-label text-text-muted mb-2 font-display">Observacoes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input-warm resize-none" rows={2} />
            </div>

            <div>
              <label className="block text-label text-text-muted mb-2 font-display">Referencia</label>
              <input type="text" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className="input-warm" placeholder="Numero do recibo, nota fiscal, etc." />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button type="button" onClick={onClose} className="btn-outline">Cancelar</button>
              <button type="submit" disabled={saving} className="btn-accent disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
