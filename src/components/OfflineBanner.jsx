import { useApp } from '../context/AppContext'

export function OfflineBanner() {
  const { isOnline, syncStatus, pendingCount } = useApp()

  if (isOnline && syncStatus === 'idle') return null

  if (syncStatus === 'syncing') {
    return (
      <div className="fixed top-16 left-0 right-0 z-40 mx-4 mt-2">
        <div className="glass rounded-2xl px-4 py-2.5 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px] animate-spin">
            sync
          </span>
          <span
            className="font-label text-xs font-semibold text-primary-container"
            style={{ color: '#ab3500' }}
          >
            Sincronizando {pendingCount} leads...
          </span>
        </div>
      </div>
    )
  }

  if (syncStatus === 'synced') {
    return (
      <div className="fixed top-16 left-0 right-0 z-40 mx-4 mt-2">
        <div className="glass rounded-2xl px-4 py-2.5 flex items-center gap-2">
          <span
            className="material-symbols-outlined icon-filled text-[18px]"
            style={{ color: '#006c49' }}
          >
            check_circle
          </span>
          <span
            className="font-label text-xs font-semibold"
            style={{ color: '#006c49' }}
          >
            Tudo sincronizado!
          </span>
        </div>
      </div>
    )
  }

  if (!isOnline) {
    return (
      <div className="fixed top-16 left-0 right-0 z-40 mx-4 mt-2">
        <div
          className="rounded-2xl px-4 py-2.5 flex items-center gap-2"
          style={{
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(171,53,0,0.15)',
          }}
        >
          <span className="material-symbols-outlined text-[18px]" style={{ color: '#ab3500' }}>
            cloud_off
          </span>
          <span className="font-label text-xs font-semibold" style={{ color: '#ab3500' }}>
            Modo offline — dados salvos e serão enviados ao reconectar
          </span>
        </div>
      </div>
    )
  }

  if (syncStatus === 'error') {
    return (
      <div className="fixed top-16 left-0 right-0 z-40 mx-4 mt-2">
        <div className="glass rounded-2xl px-4 py-2.5 flex items-center gap-2">
          <span className="material-symbols-outlined text-error text-[18px]">error</span>
          <span className="font-label text-xs font-semibold text-error">
            Erro ao sincronizar — tente novamente
          </span>
        </div>
      </div>
    )
  }

  return null
}
