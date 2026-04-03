import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pb } from '../lib/pocketbase'

export default function LoginScreen() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) {
      setError('Preencha e-mail e senha.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await pb.collection('users').authWithPassword(email, password)
      navigate('/home', { replace: true })
    } catch (err) {
      const msg = err?.message || err?.toString() || ''
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')) {
        setError(`Sem conexão com o servidor. (${import.meta.env.VITE_PB_URL})`)
      } else {
        setError(`Erro: ${msg}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-surface-container-low flex flex-col font-body">
      {/* Header gradient */}
      <header
        className="h-[280px] rounded-b-[32px] flex flex-col items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #FF6B35, #FF8C42)' }}
      >
        <div className="flex items-center gap-2 text-white mb-4">
          <span className="material-symbols-outlined icon-filled text-4xl">rocket_launch</span>
          <span className="font-headline font-extrabold text-2xl tracking-tight">BuyHelp</span>
        </div>
        <h1 className="font-headline font-extrabold text-[28px] text-white leading-tight">
          LeadCapture
        </h1>
        <p className="text-white/80 text-sm mt-1">Capture leads em eventos</p>
      </header>

      {/* Card de login */}
      <main className="flex-1 px-6 -mt-10 relative z-10 pb-12 max-w-lg mx-auto w-full">
        <div className="bg-surface-container-lowest rounded-3xl p-7 shadow-float">
          <div className="mb-7">
            <h2 className="font-headline font-bold text-[22px] text-on-secondary-fixed">
              Bem-vindo!
            </h2>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Acesse sua conta para continuar
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            {/* E-mail */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-on-secondary-fixed/70 uppercase tracking-widest px-1">
                E-mail
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                  mail
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  className="w-full pl-11 pr-4 py-3.5 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-lowest transition-all text-on-surface placeholder:text-on-surface-variant/40 font-body text-sm outline-none"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-on-secondary-fixed/70 uppercase tracking-widest px-1">
                Senha
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                  lock
                </span>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-11 pr-12 py-3.5 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-lowest transition-all text-on-surface placeholder:text-on-surface-variant/40 font-body text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPwd ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <p className="text-error text-sm font-medium px-1">{error}</p>
            )}

            {/* Botão entrar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 text-white font-headline font-bold rounded-xl shadow-cta active:scale-[0.98] transition-all text-base disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #FF8C42)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
                  Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-on-surface-variant text-sm mt-6">
          BuyHelp Leads v1.2 · {import.meta.env.VITE_PB_URL}
        </p>
      </main>

      {/* Decorativo */}
      <div className="fixed bottom-0 left-0 w-full overflow-hidden opacity-10 -z-10 h-32 pointer-events-none">
        <div
          className="w-full h-full rotate-12 translate-y-20 blur-3xl"
          style={{ background: 'linear-gradient(135deg, #FF6B35, #FF8C42)' }}
        />
      </div>
    </div>
  )
}
