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
          <span className="font-label text-xs font-semibold text-primary">
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
          <span className="material-symbols-outlined icon-filled text-tertiary text-[18px]">
            check_circle
          </span>
          <span className="font-label text-xs font-semibold text-tertiary">
            Tudo sincronizado!
          </span>
        </div>
      </div>
    )
  }

  if (!isOnline) {
    return (
      <div className="fixed top-16 left-0 right-0 z-40 mx-4 mt-2">
        <div className="glass rounded-2xl px-4 py-2.5 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">
            cloud_off
          </span>
          <span className="font-label text-xs font-semibold text-primary">
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
