import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllLeads } from '../lib/db'
import { syncPendingLeads } from '../lib/sync'
import { leadsApi } from '../lib/api'
import { useApp } from '../context/AppContext'
import { BottomNav } from '../components/BottomNav'
import { OfflineBanner } from '../components/OfflineBanner'

const TEMP_COLORS = {
  hot:  { bg: 'bg-red-50',   text: 'text-red-600',   label: '🔥 Quente' },
  warm: { bg: 'bg-amber-50', text: 'text-amber-600',  label: '♨️ Morno'  },
  cold: { bg: 'bg-blue-50',  text: 'text-blue-600',   label: '❄️ Frio'   },
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr.replace(' ', 'T'))
  if (isNaN(d)) return ''
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function LeadsScreen() {
  const navigate = useNavigate()
  const { isOnline, pendingCount, refreshPendingCount } = useApp()

  const [leads, setLeads]       = useState([])
  const [source, setSource]     = useState('local') // 'local' | 'remote'
  const [filter, setFilter]     = useState('all')   // all | pending | synced
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [syncing, setSyncing]   = useState(false)

  useEffect(() => { loadLocal() }, [])

  async function loadLocal() {
    setLoading(true)
    try {
      const data = await getAllLeads()
      setLeads(data)
      setSource('local')
    } catch (err) {
      console.error('[LeadsScreen]', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadRemote() {
    setLoading(true)
    try {
      const res = await leadsApi.listAll()
      setLeads(res.items || [])
      setSource('remote')
    } catch (err) {
      console.error('[LeadsScreen] remote', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSync() {
    if (!isOnline || syncing) return
    setSyncing(true)
    try {
      await syncPendingLeads()
      await refreshPendingCount()
      await loadRemote()
    } finally {
      setSyncing(false)
    }
  }

  // Filtro por status (só relevante na view local)
  const byStatus = source === 'local'
    ? leads.filter(l => {
        if (filter === 'pending') return l.synced === 0
        if (filter === 'synced')  return l.synced === 1
        return true
      })
    : leads

  // Busca por nome, email, telefone, empresa
  const filtered = byStatus.filter(l => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return [l.name, l.email, l.phone, l.company].some(v => v?.toLowerCase().includes(q))
  })

  const syncedCount  = leads.filter(l => l.synced === 1).length
  const pendingLocal = leads.filter(l => l.synced === 0).length

  return (
    <div className="min-h-dvh bg-surface-container-low font-body pb-24">
      <header
        className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 max-w-lg mx-auto"
        style={{
          background: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(225,191,181,0.15)',
        }}
      >
        <h1 className="font-headline font-bold text-lg text-on-secondary-fixed">
          Leads Capturados
        </h1>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="bg-primary-fixed text-primary text-[11px] font-bold px-2.5 py-1 rounded-full">
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </span>
          )}
          {isOnline && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="text-primary active:scale-95 transition-all p-1 rounded-full hover:bg-surface-container-low disabled:opacity-50"
              title="Sincronizar e ver todos os leads"
            >
              <span className={`material-symbols-outlined text-[22px] ${syncing ? 'animate-spin' : ''}`}>
                sync
              </span>
            </button>
          )}
        </div>
      </header>

      <OfflineBanner />

      <main className="pt-20 px-6 space-y-4 max-w-lg mx-auto w-full">

        {/* Stats */}
        <section className="mt-2">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total',     count: leads.length,  color: 'text-on-secondary-fixed' },
              { label: 'Sincron.',  count: source === 'remote' ? leads.length : syncedCount, color: 'text-tertiary' },
              { label: 'Pendente',  count: source === 'remote' ? 0 : pendingLocal,           color: 'text-primary' },
            ].map(stat => (
              <div key={stat.label} className="bg-surface-container-lowest rounded-2xl p-4 shadow-soft text-center">
                <p className={`font-headline font-bold text-2xl ${stat.color}`}>{stat.count}</p>
                <p className="font-label text-[11px] text-on-surface-variant uppercase tracking-wider mt-0.5">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Indicador de fonte */}
        {source === 'remote' && (
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined icon-filled text-emerald-600 text-[18px]">cloud_done</span>
              <span className="text-xs font-bold text-emerald-700">Exibindo todos os leads sincronizados</span>
            </div>
            <button onClick={loadLocal} className="text-xs text-emerald-600 font-semibold underline">
              Ver local
            </button>
          </div>
        )}

        {/* Busca */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, email, telefone ou empresa..."
            className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/30 border border-transparent focus:border-primary/20"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        {/* Filtro status (só na view local) */}
        {source === 'local' && (
          <div className="flex p-1 bg-surface-container-low rounded-2xl">
            {[
              { value: 'all',     label: 'Todos' },
              { value: 'pending', label: 'Pendentes' },
              { value: 'synced',  label: 'Sincronizados' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                  filter === f.value
                    ? 'bg-surface-container-lowest shadow-sm text-on-secondary-fixed font-bold'
                    : 'text-on-secondary-container'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-16">
            <span className="material-symbols-outlined text-primary text-4xl animate-spin">sync</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="bg-surface-container-low p-6 rounded-full">
              <span className="material-symbols-outlined text-on-surface-variant text-5xl">person_search</span>
            </div>
            <div className="text-center">
              <p className="font-headline font-bold text-on-secondary-fixed">Nenhum lead encontrado</p>
              <p className="text-on-surface-variant text-sm mt-1">
                {search ? 'Tente outro termo de busca.' : filter === 'all' ? 'Capture o primeiro lead!' : 'Nenhum lead neste filtro.'}
              </p>
            </div>
            {!search && filter === 'all' && (
              <button
                onClick={() => navigate('/capture')}
                className="mt-2 px-6 py-3 rounded-xl text-white font-bold shadow-cta"
                style={{ background: 'linear-gradient(135deg, #FF6B35, #FF8C42)' }}
              >
                Capturar Lead
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {filtered.map(lead => {
              const temp = TEMP_COLORS[lead.temperature] || TEMP_COLORS.warm
              return (
                <div key={lead.id} className="bg-surface-container-lowest rounded-2xl p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs ${temp.bg} ${temp.text} px-2 py-0.5 rounded-full font-bold`}>
                          {temp.label}
                        </span>
                        {source === 'local' && (
                          lead.synced ? (
                            <span className="material-symbols-outlined icon-filled text-[16px]" style={{ color: '#006c49' }}>cloud_done</span>
                          ) : (
                            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">cloud_off</span>
                          )
                        )}
                      </div>
                      <h4 className="font-headline font-bold text-on-secondary-fixed truncate">
                        {lead.name}
                      </h4>
                      {(lead.company || lead.role) && (
                        <p className="text-on-surface-variant text-xs mt-0.5 truncate">
                          {[lead.role, lead.company].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {lead.email && (
                        <p className="text-on-surface-variant text-xs mt-0.5 truncate">{lead.email}</p>
                      )}
                      {lead.phone && (
                        <p className="text-on-surface-variant text-xs truncate">{lead.phone}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] text-on-surface-variant">{formatDate(lead.created)}</p>
                      {lead.event_name && (
                        <p className="text-[10px] text-on-surface-variant/60 mt-0.5 truncate max-w-[100px]">
                          {lead.event_name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Cadastrado por */}
                  {lead.captured_by && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px] text-on-surface-variant">badge</span>
                      <span className="text-[11px] text-on-surface-variant">por <span className="font-semibold">{lead.captured_by}</span></span>
                    </div>
                  )}

                  {lead.notes && (
                    <p className="mt-2 text-xs text-on-surface-variant bg-surface-container-low rounded-lg px-3 py-2 line-clamp-2">
                      {lead.notes}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      <button
        onClick={() => navigate('/capture')}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full text-white flex items-center justify-center shadow-cta active:scale-95 transition-all"
        style={{ background: 'linear-gradient(135deg, #FF6B35, #FF8C42)' }}
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      <BottomNav />
    </div>
  )
}
