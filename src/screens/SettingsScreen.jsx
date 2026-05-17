import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pb } from '../lib/pocketbase'
import { resetDB } from '../lib/db'
import { useTheme } from '../context/ThemeContext'
import { useApp } from '../context/AppContext'
import { BottomNav } from '../components/BottomNav'
import { OfflineBanner } from '../components/OfflineBanner'

export default function SettingsScreen() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { pendingCount, syncStatus, isOnline, manualSync } = useApp()
  const user = pb.authStore.model
  const [resetting, setResetting]     = useState(false)
  const [resetDone, setResetDone]     = useState(false)
  const [syncing, setSyncing]         = useState(false)
  const [syncResult, setSyncResult]   = useState(null) // { synced, failed } | null

  async function handleSync(forceAll = false) {
    if (syncing) return
    setSyncing(true)
    setSyncResult(null)
    const result = await manualSync({ forceAll })
    setSyncResult(result)
    setSyncing(false)
    setTimeout(() => setSyncResult(null), 5000)
  }

  async function handleResetLocal() {
    if (!window.confirm('Apagar TODOS os leads salvos localmente? Esta ação não pode ser desfeita.')) return
    setResetting(true)
    try {
      await resetDB()
      setResetDone(true)
      setTimeout(() => setResetDone(false), 2500)
    } finally {
      setResetting(false)
    }
  }

  function handleLogout() {
    localStorage.setItem('buyhelp_logged_out', 'true')
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-surface-container-low font-body pb-24">
      <header className="glass-header fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 max-w-lg mx-auto">
        <h1 className="font-headline font-bold text-lg text-on-secondary-fixed">Configurações</h1>
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface-variant hover:text-primary transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
          <span className="text-xs font-semibold font-label">
            {theme === 'dark' ? 'Claro' : 'Escuro'}
          </span>
        </button>
      </header>

      <OfflineBanner />

      <main className="pt-20 px-6 space-y-6 max-w-lg mx-auto w-full">

        {/* Conta */}
        <section className="space-y-2">
          <h2 className="font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Conta</h2>
          <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-soft">
            <div className="flex items-center gap-4 px-5 py-4 border-b border-surface-container-low">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-[22px]">person</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-on-secondary-fixed truncate">{user?.name || 'Usuário'}</p>
                <p className="text-xs text-on-surface-variant truncate">{user?.email || ''}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-5 py-4 text-error hover:bg-error/5 transition-colors active:scale-[0.99]"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span className="font-semibold text-sm">Sair da conta</span>
            </button>
          </div>
        </section>

        {/* Sincronização */}
        <section className="space-y-2">
          <h2 className="font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Sincronização</h2>
          <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-soft">

            {/* Contador pendentes */}
            <div className="flex items-center gap-4 px-5 py-4 border-b border-surface-container-low">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-[22px]">cloud_sync</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-on-secondary-fixed text-sm">
                  {pendingCount > 0 ? `${pendingCount} lead${pendingCount > 1 ? 's' : ''} aguardando envio` : 'Todos os leads sincronizados'}
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {isOnline ? 'Dispositivo conectado' : 'Sem conexão — sincronização suspensa'}
                </p>
              </div>
              {pendingCount > 0 && (
                <span className="w-6 h-6 rounded-full bg-error flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </div>

            {/* Sincronizar pendentes */}
            <button
              onClick={() => handleSync(false)}
              disabled={syncing || !isOnline || pendingCount === 0}
              className="flex items-center gap-3 w-full px-5 py-4 border-b border-surface-container-low transition-colors active:scale-[0.99] disabled:opacity-40"
              style={{ color: '#1a6e3c' }}
            >
              <span className={`material-symbols-outlined text-[20px] ${syncing ? 'animate-spin' : ''}`}>sync</span>
              <span className="font-semibold text-sm">
                {syncing ? 'Enviando...' : 'Sincronizar pendentes'}
              </span>
            </button>

            {/* Reenviar todos */}
            <button
              onClick={() => handleSync(true)}
              disabled={syncing || !isOnline}
              className="flex items-center gap-3 w-full px-5 py-4 transition-colors active:scale-[0.99] disabled:opacity-40"
              style={{ color: '#b45309' }}
            >
              <span className="material-symbols-outlined text-[20px]">replay</span>
              <span className="font-semibold text-sm">Forçar reenvio de todos</span>
            </button>
          </div>

          {/* Feedback do resultado */}
          {syncResult && (
            <div className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${syncResult.failed > 0 ? 'bg-error/10 text-error' : 'bg-green-50 text-green-700'}`}>
              <span className="material-symbols-outlined text-[18px]">
                {syncResult.failed > 0 ? 'error' : 'check_circle'}
              </span>
              {syncResult.failed > 0
                ? `${syncResult.synced} enviados, ${syncResult.failed} falharam. Tente novamente.`
                : `${syncResult.synced} lead${syncResult.synced !== 1 ? 's' : ''} enviado${syncResult.synced !== 1 ? 's' : ''} com sucesso!`
              }
            </div>
          )}
        </section>

        {/* Dados */}
        <section className="space-y-2">
          <h2 className="font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Dados locais</h2>
          <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-soft">
            <div className="px-5 py-4 border-b border-surface-container-low">
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Os leads capturados ficam salvos no dispositivo até serem sincronizados. Use a opção abaixo apenas após confirmar que todos os dados foram enviados.
              </p>
            </div>
            <button
              onClick={handleResetLocal}
              disabled={resetting || resetDone}
              className="flex items-center gap-3 w-full px-5 py-4 transition-colors active:scale-[0.99] disabled:opacity-60"
              style={{ color: resetDone ? '#006c49' : '#d32f2f' }}
            >
              <span className="material-symbols-outlined text-[20px]">
                {resetDone ? 'check_circle' : 'delete_sweep'}
              </span>
              <span className="font-semibold text-sm">
                {resetDone ? 'Dados apagados!' : resetting ? 'Apagando...' : 'Limpar dados locais'}
              </span>
            </button>
          </div>
        </section>

      </main>

      <BottomNav />
    </div>
  )
}
