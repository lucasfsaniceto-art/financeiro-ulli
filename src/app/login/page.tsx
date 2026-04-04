'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Mail, Lock, LogIn } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (result.success) {
      router.push('/')
    } else {
      setError(result.error || 'Erro ao fazer login')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Lado da imagem — Atacama */}
      <div className="hidden lg:block lg:w-[55%] relative">
        <img
          src="/images/login-atacama.jpg"
          alt="Deserto de Atacama"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient fade para o formulario */}
        <div className="absolute inset-y-0 right-0 w-[120px] bg-gradient-to-r from-transparent to-surface-page" />
        {/* Logo sobre a foto */}
        <div className="absolute bottom-10 left-10 z-10">
          <img
            src="/images/Vector.png"
            alt="ULLI viagens"
            className="w-[160px] drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
          />
        </div>
        {/* Overlay escuro sutil para harmonizar */}
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* Lado do formulario */}
      <div className="flex-1 flex items-center justify-center p-6 bg-surface-page">
        <div className="w-full max-w-[380px] animate-fade-in">
          {/* Mobile brand */}
          <div className="lg:hidden flex justify-center mb-10">
            <img
              src="/images/Vector.png"
              alt="ULLI viagens"
              className="w-[120px]"
            />
          </div>

          <div className="mb-8">
            <h2 className="text-heading font-display text-text-primary">Entrar</h2>
            <p className="text-text-muted text-body mt-1.5 font-display">Bem-vindo de volta</p>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 bg-status-error/[0.08] border border-status-error/15 rounded-input p-3.5 mb-6 animate-slide-up">
              <p className="text-sm text-status-error font-display">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-label text-text-muted mb-2 font-display">Email</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <div className="w-7 h-7 rounded-full bg-accent-subtle flex items-center justify-center">
                    <Mail size={14} className="text-accent" />
                  </div>
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-warm pl-14"
                  placeholder="seu@email.com"
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <label className="block text-label text-text-muted mb-2 font-display">Senha</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <div className="w-7 h-7 rounded-full bg-accent-subtle flex items-center justify-center">
                    <Lock size={14} className="text-accent" />
                  </div>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-warm pl-14"
                  placeholder="Sua senha"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-accent py-3.5 text-sm mt-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={16} />
                  Entrar
                </>
              )}
            </button>
          </form>

          <p className="text-small text-text-muted text-center mt-8 font-display">
            Ulli — San Pedro de Atacama
          </p>
        </div>
      </div>
    </div>
  )
}
