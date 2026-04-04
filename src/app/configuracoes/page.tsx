'use client'

import { useEffect, useState } from 'react'
import { Save, Plus, Pencil, Trash2, UserPlus, Shield, ShoppingCart } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface SystemSetting {
  id: string
  key: string
  value: string
  description: string | null
}

interface PaymentMethodConfig {
  id: string
  name: string
  active: boolean
  default_rate: number
}

interface Category {
  id: string
  name: string
  type: string
  active: boolean
}

interface UserData {
  id: string
  email: string
  name: string
  role: 'admin' | 'vendedor'
  active: boolean
  created_at: string
}

export default function ConfiguracoesPage() {
  const { isAdmin } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('geral')
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Category form
  const [catForm, setCatForm] = useState({ name: '', type: 'entrada' })
  const [editingCat, setEditingCat] = useState<string | null>(null)

  // Payment method form
  const [pmForm, setPmForm] = useState({ name: '', defaultRate: '0' })

  // User form
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'vendedor' as const })
  const [showUserForm, setShowUserForm] = useState(false)

  useEffect(() => {
    if (!isAdmin) {
      router.push('/')
      return
    }
    loadAll()
  }, [isAdmin, router])

  async function loadAll() {
    setLoading(true)
    try {
      const [settingsRes, categoriesRes, usersRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/categories'),
        fetch('/api/users'),
      ])
      if (settingsRes.ok) {
        const data = await settingsRes.json()
        setSettings(data.settings || [])
        setPaymentMethods(data.paymentMethods || [])
      }
      if (categoriesRes.ok) setCategories(await categoriesRes.json())
      if (usersRes.ok) setUsers(await usersRes.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function showMessage(msg: string) {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  // Settings handlers
  function updateSetting(key: string, value: string) {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s))
  }

  async function saveSettings() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settings.map(s => ({ key: s.key, value: s.value, description: s.description })) }),
      })
      if (res.ok) showMessage('Configuracoes salvas!')
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  // Category handlers
  async function handleAddCategory() {
    if (!catForm.name) return
    try {
      if (editingCat) {
        await fetch(`/api/categories/${editingCat}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(catForm),
        })
        setEditingCat(null)
      } else {
        await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(catForm),
        })
      }
      setCatForm({ name: '', type: 'entrada' })
      const res = await fetch('/api/categories')
      if (res.ok) setCategories(await res.json())
      showMessage('Categoria salva!')
    } catch (e) {
      console.error(e)
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm('Excluir esta categoria?')) return
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    const res = await fetch('/api/categories')
    if (res.ok) setCategories(await res.json())
  }

  // Payment method handlers
  async function handleAddPaymentMethod() {
    if (!pmForm.name) return
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: { name: pmForm.name, active: true, defaultRate: parseFloat(pmForm.defaultRate) } }),
      })
      setPmForm({ name: '', defaultRate: '0' })
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setPaymentMethods(data.paymentMethods || [])
      }
      showMessage('Metodo adicionado!')
    } catch (e) {
      console.error(e)
    }
  }

  async function togglePaymentMethod(pm: PaymentMethodConfig) {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: { id: pm.id, name: pm.name, active: !pm.active, defaultRate: pm.default_rate } }),
    })
    const res = await fetch('/api/settings')
    if (res.ok) {
      const data = await res.json()
      setPaymentMethods(data.paymentMethods || [])
    }
  }

  // User handlers
  async function handleAddUser() {
    if (!userForm.name || !userForm.email || !userForm.password) return
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      })
      if (res.ok) {
        setUserForm({ name: '', email: '', password: '', role: 'vendedor' })
        setShowUserForm(false)
        const usersRes = await fetch('/api/users')
        if (usersRes.ok) setUsers(await usersRes.json())
        showMessage('Usuario criado!')
      } else {
        const data = await res.json()
        showMessage(data.error || 'Erro ao criar usuario')
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function toggleUserActive(user: UserData) {
    await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !user.active }),
    })
    const res = await fetch('/api/users')
    if (res.ok) setUsers(await res.json())
  }

  async function changeUserRole(user: UserData, role: string) {
    await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    const res = await fetch('/api/users')
    if (res.ok) setUsers(await res.json())
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFC233]" />
      </div>
    )
  }

  const tabs = [
    { id: 'geral', label: 'Geral' },
    { id: 'categorias', label: 'Categorias' },
    { id: 'pagamentos', label: 'Metodos de Pagamento' },
    { id: 'usuarios', label: 'Usuarios' },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Configuracoes</h1>
        <p className="text-gray-500">Gerencie o sistema</p>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm rounded-md transition-colors flex-1',
              activeTab === tab.id
                ? 'bg-white shadow text-gray-800 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Geral */}
      {activeTab === 'geral' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-800">Configuracoes Gerais</h2>
          {settings.map(s => (
            <div key={s.key} className="grid grid-cols-3 gap-4 items-center">
              <div>
                <p className="text-sm font-medium text-gray-700">{s.description || s.key}</p>
                <p className="text-xs text-gray-400">{s.key}</p>
              </div>
              <input
                type="text"
                value={s.value}
                onChange={(e) => updateSetting(s.key, e.target.value)}
                className="col-span-2 border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          ))}
          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#E61C5D] text-white rounded-lg text-sm hover:bg-[#C2185B] disabled:opacity-50"
            >
              <Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* Categorias */}
      {activeTab === 'categorias' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Categorias</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Nome da categoria"
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={catForm.type}
              onChange={(e) => setCatForm({ ...catForm, type: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="entrada">Entrada</option>
              <option value="saida">Saida</option>
            </select>
            <button
              onClick={handleAddCategory}
              className="flex items-center gap-2 px-4 py-2 bg-[#0E1A2B] text-white rounded-lg text-sm hover:bg-[#1a2d47]"
            >
              <Plus size={16} /> {editingCat ? 'Salvar' : 'Adicionar'}
            </button>
            {editingCat && (
              <button onClick={() => { setEditingCat(null); setCatForm({ name: '', type: 'entrada' }) }} className="px-3 py-2 border rounded-lg text-sm">
                Cancelar
              </button>
            )}
          </div>

          <div className="space-y-1">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium',
                    cat.type === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  )}>
                    {cat.type === 'entrada' ? 'Entrada' : 'Saida'}
                  </span>
                  <span className="text-sm text-gray-800">{cat.name}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingCat(cat.id); setCatForm({ name: cat.name, type: cat.type }) }}
                    className="text-gray-400 hover:text-blue-600"
                  >
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDeleteCategory(cat.id)} className="text-gray-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metodos de Pagamento */}
      {activeTab === 'pagamentos' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Metodos de Pagamento</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Nome do metodo"
              value={pmForm.name}
              onChange={(e) => setPmForm({ ...pmForm, name: e.target.value })}
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Taxa (%)"
              value={pmForm.defaultRate}
              onChange={(e) => setPmForm({ ...pmForm, defaultRate: e.target.value })}
              className="w-32 border rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={handleAddPaymentMethod}
              className="flex items-center gap-2 px-4 py-2 bg-[#0E1A2B] text-white rounded-lg text-sm hover:bg-[#1a2d47]"
            >
              <Plus size={16} /> Adicionar
            </button>
          </div>

          <div className="space-y-1">
            {paymentMethods.map(pm => (
              <div key={pm.id} className="flex items-center justify-between py-3 px-3 hover:bg-gray-50 rounded">
                <div>
                  <span className="text-sm text-gray-800 font-medium">{pm.name}</span>
                  <span className="text-xs text-gray-400 ml-2">Taxa: {pm.default_rate}%</span>
                </div>
                <button
                  onClick={() => togglePaymentMethod(pm)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium',
                    pm.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  )}
                >
                  {pm.active ? 'Ativo' : 'Inativo'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usuarios */}
      {activeTab === 'usuarios' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Usuarios</h2>
            <button
              onClick={() => setShowUserForm(!showUserForm)}
              className="flex items-center gap-2 px-4 py-2 bg-[#E61C5D] text-white rounded-lg text-sm hover:bg-[#C2185B]"
            >
              <UserPlus size={16} /> Novo Usuario
            </button>
          </div>

          {showUserForm && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Nome"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="border rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="border rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="password"
                  placeholder="Senha"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="border rounded-lg px-3 py-2 text-sm"
                />
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value as 'admin' | 'vendedor' })}
                  className="border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="vendedor">Vendedor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowUserForm(false)} className="px-3 py-2 border rounded-lg text-sm">
                  Cancelar
                </button>
                <button onClick={handleAddUser} className="px-4 py-2 bg-[#0E1A2B] text-white rounded-lg text-sm hover:bg-[#1a2d47]">
                  Criar Usuario
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between py-3 px-3 hover:bg-gray-50 rounded border-b last:border-0">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    u.role === 'admin' ? 'bg-purple-100' : 'bg-blue-100'
                  )}>
                    {u.role === 'admin' ? <Shield size={14} className="text-purple-600" /> : <ShoppingCart size={14} className="text-blue-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={u.role}
                    onChange={(e) => changeUserRole(u, e.target.value)}
                    className="text-xs border rounded px-2 py-1"
                  >
                    <option value="admin">Admin</option>
                    <option value="vendedor">Vendedor</option>
                  </select>
                  <button
                    onClick={() => toggleUserActive(u)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium',
                      u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    )}
                  >
                    {u.active ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
