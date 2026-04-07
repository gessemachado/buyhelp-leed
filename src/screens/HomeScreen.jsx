import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { pb } from '../lib/pocketbase'
import { useApp } from '../context/AppContext'
import { BottomNav } from '../components/BottomNav'
import { OfflineBanner } from '../components/OfflineBanner'
import { getLeadsCount } from '../lib/db'
import { useTheme } from '../context/ThemeContext'
import { useCallback } from 'react'

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

function formatEventDate(ev) {
  function fmt(d) {
    if (!d) return ''
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }
  if (ev.date_start && ev.date_end) return `${fmt(ev.date_start)} → ${fmt(ev.date_end)}`
  if (ev.date_start) return fmt(ev.date_start)
  return ''
}

export default function HomeScreen() {
  const navigate = useNavigate()
  const { pendingCount, isOnline, refreshActiveEvent } = useApp()
  const { theme, toggleTheme } = useTheme()
  const [user, setUser] = useState(pb.authStore.model)
  const [checkingAccess, setCheckingAccess] = useState(true)

  const [events, setEvents]           = useState([])
  const [activeEvent, setActiveEvent] = useState(null)
  const [localCount, setLocalCount]   = useState(0)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    // Atualiza modelo do usuário para pegar eventos_access atualizado
    pb.collection('users').authRefresh()
      .then(() => setUser(pb.authStore.model))
      .catch(() => {})
      .finally(() => setCheckingAccess(false))
    loadEvents()
    getLeadsCount().then(setLocalCount).catch(() => {})
  }, [])

  async function loadEvents() {
    setLoading(true)

    // Carrega cache imediatamente para evitar tela vazia offline
    const cached = localStorage.getItem('buyhelp_events_cache')
    if (cached) {
      try {
        const items = JSON.parse(cached)
        applyEvents(items)
      } catch {}
    }

    try {
      const token = getToken()
      const res = await fetch(`${PB_URL}/api/collections/events/records?perPage=50`, {
        headers: token ? { Authorization: token } : {},
      })
      if (res.ok) {
        const data = await res.json()
        const items = data.items || []
        localStorage.setItem('buyhelp_events_cache', JSON.stringify(items))
        refreshActiveEvent()
        applyEvents(items)
      }
    } catch (err) {
      console.error('[HomeScreen] eventos:', err)
      // Offline: mantém o cache já aplicado acima
    } finally {
      setLoading(false)
    }
  }

  function applyEvents(items) {
    setEvents(items)
    const active = items.find(e => eventStatus(e) === 'active')
      || items.find(e => eventStatus(e) === 'soon')
      || items[0]
      || null
    setActiveEvent(active)
  }

  function goCapture(event) {
    navigate('/capture', { state: { eventName: event.name, eventId: event.id } })
  }

  const otherEvents = events.filter(e => e.id !== activeEvent?.id)

  // Aguarda verificação de acesso
  if (checkingAccess) {
    return (
      <div className="min-h-dvh bg-surface-container-low flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">sync</span>
      </div>
    )
  }

  // Sem acesso a eventos
  if (user && user.eventos_access !== true) {
    return (
      <div className="min-h-dvh bg-surface-container-low font-body flex flex-col items-center justify-center px-6 text-center gap-6">
        <span className="material-symbols-outlined text-6xl text-on-surface-variant/30">lock</span>
        <div>
          <h2 className="font-headline font-bold text-xl text-on-surface mb-1">Acesso Restrito</h2>
          <p className="text-on-surface-variant text-sm">Você não tem permissão para acessar a funcionalidade de eventos.</p>
          <p className="text-on-surface-variant text-sm mt-1">Entre em contato com o administrador.</p>
        </div>
        <button
          onClick={() => { pb.authStore.clear(); navigate('/login') }}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm"
          style={{ background: 'linear-gradient(135deg,#FF6B35,#FF8C42)' }}
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Sair
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-surface-container-low font-body pb-24">
      <header className="glass-header fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined icon-filled text-primary">rocket_launch</span>
          <span className="font-headline font-bold text-lg text-on-secondary-fixed">BuyHelp</span>
        </div>
        <div className="flex items-center gap-3">
          {isOnline && pendingCount === 0 && (
            <span className="material-symbols-outlined icon-filled text-[20px]" style={{ color: '#006c49' }}>cloud_done</span>
          )}
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
        </div>
      </header>

      <OfflineBanner />

      <main className="pt-20 px-6 space-y-8 max-w-lg mx-auto w-full">
        <section className="space-y-1 mt-2">
          <h2 className="font-headline font-bold text-2xl text-on-secondary-fixed">
            Olá, {user?.name || user?.email?.split('@')[0] || 'usuário'} 👋
          </h2>
          <p className="text-on-surface-variant text-sm">Selecione um evento para capturar leads</p>
        </section>

        {/* Evento ativo */}
        <section className="space-y-3">
          <h3 className="font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
            Evento Ativo
          </h3>

          {loading ? (
            <div className="bg-surface-container-lowest rounded-3xl p-6 flex justify-center">
              <span className="material-symbols-outlined text-primary text-3xl animate-spin">sync</span>
            </div>
          ) : !activeEvent ? (
            <div className="bg-surface-container-lowest rounded-3xl p-6 text-center text-on-surface-variant text-sm">
              <span className="material-symbols-outlined text-4xl block mb-2 text-on-surface-variant/40">event_busy</span>
              Nenhum evento cadastrado.{' '}
              <button onClick={() => navigate('/admin')} className="text-primary font-semibold underline">
                Criar evento
              </button>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-soft w-full">
              <div className="h-1.5 w-full" style={{ background: 'linear-gradient(135deg, #FF6B35, #FF8C42)' }} />
              <div className="p-6 space-y-5">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1 min-w-0 pr-3">
                    <h4 className="font-headline font-bold text-2xl text-on-secondary-fixed leading-tight">
                      {activeEvent.name}
                    </h4>
                    <div className="flex flex-col gap-1.5">
                      {activeEvent.location && (
                        <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                          <span className="material-symbols-outlined text-primary text-[18px]">location_on</span>
                          <span>{activeEvent.location}</span>
                        </div>
                      )}
                      {(activeEvent.date_start || activeEvent.date_end) && (
                        <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                          <span className="material-symbols-outlined text-primary text-[18px]">calendar_today</span>
                          <span>{formatEventDate(activeEvent)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold tracking-wider whitespace-nowrap shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                    AO VIVO
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-on-secondary-fixed">
                    <span className="material-symbols-outlined icon-filled text-[20px] text-on-surface-variant">person</span>
                    <span className="text-sm font-semibold">
                      <span className="text-on-secondary-fixed font-bold">{localCount}</span>
                      <span className="text-on-surface-variant font-normal"> leads</span>
                    </span>
                  </div>
                  {pendingCount > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-fixed">
                      <span className="material-symbols-outlined text-primary text-[16px]">hourglass_empty</span>
                      <span className="text-[11px] font-bold text-primary">
                        {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => goCapture(activeEvent)}
                  className="w-full py-4 rounded-xl flex items-center justify-center gap-2 text-white font-headline font-bold shadow-cta active:scale-[0.98] transition-all"
                  style={{ background: 'linear-gradient(135deg, #FF6B35, #FF8C42)' }}
                >
                  Capturar Leads
                  <span className="material-symbols-outlined text-xl">arrow_forward</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Outros eventos */}
        {otherEvents.length > 0 && (
          <section className="space-y-3 pb-4">
            <h3 className="font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
              Outros Eventos
            </h3>
            <div className="space-y-3">
              {otherEvents.map(event => {
                const status = eventStatus(event)
                return (
                  <button
                    key={event.id}
                    onClick={() => goCapture(event)}
                    className={`flex items-center p-4 bg-surface-container-lowest rounded-2xl gap-4 shadow-soft w-full text-left active:scale-[0.98] transition-all ${status === 'closed' ? 'opacity-50' : ''}`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${status === 'soon' ? 'bg-surface-container-low' : 'bg-surface-container-high'}`}>
                      <span className={`material-symbols-outlined ${status === 'soon' ? 'text-primary' : 'text-on-surface-variant'}`}>
                        {status === 'closed' ? 'history' : 'event'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-on-secondary-fixed truncate">{event.name}</h5>
                      <p className="text-[11px] text-on-surface-variant">
                        {formatEventDate(event)}{event.location ? ` · ${event.location}` : ''}
                      </p>
                    </div>
                    {status === 'soon' ? (
                      <span className="shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-primary-fixed text-primary">EM BREVE</span>
                    ) : status === 'closed' ? (
                      <span className="shrink-0 px-2.5 py-1.5 rounded-lg bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase">Encerrado</span>
                    ) : (
                      <span className="shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">ATIVO</span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
