import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const PB_URL = import.meta.env.VITE_PB_URL || 'https://buyhelp-pb.fly.dev'

export default function AdminLoginScreen() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) { setError('Preencha e-mail e senha.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${PB_URL}/api/collections/users/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError('E-mail ou senha inválidos.')
        return
      }
      // Salva token no localStorage no mesmo formato que o SDK usa
      localStorage.setItem('pocketbase_auth', JSON.stringify({ token: data.token, model: data.record }))
      navigate('/admin/kanban', { replace: true })
    } catch {
      setError('Sem conexão com o servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-container-low flex items-center justify-center px-4 font-body">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-cta"
            style={{ background: 'linear-gradient(135deg,#FF6B35,#FF8C42)' }}
          >
            <span className="material-symbols-outlined text-white text-3xl icon-filled">rocket_launch</span>
          </div>
          <h1 className="font-headline font-extrabold text-2xl text-on-surface">BuyHelp Admin</h1>
          <p className="text-on-surface-variant text-sm mt-1">Gestão de Eventos e Leads</p>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl shadow-float border border-outline-variant/30 p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">E-mail</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-lowest text-sm text-on-surface placeholder:text-on-surface-variant/40 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Senha</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">lock</span>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-surface-container-low border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-lowest text-sm text-on-surface placeholder:text-on-surface-variant/40 transition-all"
                />
                <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors">
                  <span className="material-symbols-outlined text-[20px]">{showPwd ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {error && <p className="text-error text-sm bg-error-container/20 rounded-lg px-3 py-2">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-bold text-sm shadow-cta disabled:opacity-60 transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg,#FF6B35,#FF8C42)' }}
            >
              {loading
                ? <span className="flex items-center justify-center gap-2"><span className="material-symbols-outlined text-[18px] animate-spin">sync</span>Entrando...</span>
                : 'Entrar no Admin'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-on-surface-variant/50 mt-6">BuyHelp Leads · Painel Administrativo</p>
      </div>
    </div>
  )
}
