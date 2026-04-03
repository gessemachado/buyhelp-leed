import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { initDB, getPendingCount, getAllLeads } from '../lib/db'
import { syncPendingLeads } from '../lib/sync'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

const AppContext = createContext(null)

const PB_URL = import.meta.env.VITE_PB_URL || 'https://buyhelp-pb.fly.dev'

function getToken() {
  try {
    const raw = localStorage.getItem('pocketbase_auth')
    if (raw) return JSON.parse(raw).token
  } catch {}
  return null
}

function eventStatus(ev) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = ev.date_start ? new Date(ev.date_start) : null
  const end   = ev.date_end   ? new Date(ev.date_end)   : null
  if (start && end) {
    if (today >= start && today <= end) return 'active'
    if (today < start) return 'soon'
    return 'closed'
  }
  if (start) return today >= start ? 'active' : 'soon'
  return 'soon'
}

function getActiveEventFromCache() {
  try {
    const cached = localStorage.getItem('buyhelp_events_cache')
    if (!cached) return null
    const items = JSON.parse(cached)
    return items.find(e => eventStatus(e) === 'active') || null
  } catch { return null }
}

export function AppProvider({ children }) {
  const [dbReady, setDbReady] = useState(false)
  const [dbError, setDbError] = useState(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncStatus, setSyncStatus] = useState('idle') // idle | syncing | synced | error
  const [leads, setLeads] = useState([])
  const [leadsSource, setLeadsSource] = useState('local') // 'local' | 'remote'
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [activeEvent, setActiveEvent] = useState(() => getActiveEventFromCache())
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

  const refreshActiveEvent = useCallback(() => {
    setActiveEvent(getActiveEventFromCache())
  }, [])

  const loadLeadsLocal = useCallback(async () => {
    setLeadsLoading(true)
    try {
      const data = await getAllLeads()
      const active = getActiveEventFromCache()
      setActiveEvent(active)
      const filtered = active
        ? data.filter(l => l.event_name === active.name)
        : data
      setLeads(filtered)
      setLeadsSource('local')
    } catch (err) {
      console.error('[AppContext] loadLeadsLocal', err)
    } finally {
      setLeadsLoading(false)
    }
  }, [])

  const loadLeadsRemote = useCallback(async () => {
    setLeadsLoading(true)
    try {
      const active = getActiveEventFromCache()
      setActiveEvent(active)
      const token = getToken()
      let url = `${PB_URL}/api/collections/leads/records?perPage=500`
      if (active) url += `&filter=${encodeURIComponent(`event_name='${active.name}'`)}`
      const res = await fetch(url, {
        headers: token ? { Authorization: token } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setLeads(data.items || [])
        setLeadsSource('remote')
      }
    } catch (err) {
      console.error('[AppContext] loadLeadsRemote', err)
    } finally {
      setLeadsLoading(false)
    }
  }, [])

  return (
    <AppContext.Provider value={{
      dbReady,
      dbError,
      pendingCount,
      syncStatus,
      isOnline,
      refreshPendingCount,
      leads,
      setLeads,
      leadsSource,
      setLeadsSource,
      leadsLoading,
      activeEvent,
      refreshActiveEvent,
      loadLeadsLocal,
      loadLeadsRemote,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
