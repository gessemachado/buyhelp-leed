import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { initDB, getPendingCount } from '../lib/db'
import { syncPendingLeads } from '../lib/sync'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [dbReady, setDbReady] = useState(false)
  const [dbError, setDbError] = useState(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncStatus, setSyncStatus] = useState('idle') // idle | syncing | synced | error
  const isOnline = useNetworkStatus()

  useEffect(() => {
    initDB()
      .then(() => {
        setDbReady(true)
        refreshPendingCount()
      })
      .catch(err => {
        console.error('[AppContext] DB init error:', err)
        setDbError(err.message)
      })
  }, [])

  useEffect(() => {
    if (isOnline && dbReady) {
      setSyncStatus('syncing')
      syncPendingLeads()
        .then(({ synced, failed }) => {
          setSyncStatus(failed > 0 ? 'error' : 'synced')
          if (synced > 0) refreshPendingCount()
          setTimeout(() => setSyncStatus('idle'), 3000)
        })
        .catch(() => {
          setSyncStatus('error')
          setTimeout(() => setSyncStatus('idle'), 3000)
        })
    }
  }, [isOnline, dbReady])

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount()
      setPendingCount(count)
    } catch (_) {}
  }, [])

  return (
    <AppContext.Provider value={{
      dbReady,
      dbError,
      pendingCount,
      syncStatus,
      isOnline,
      refreshPendingCount,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
