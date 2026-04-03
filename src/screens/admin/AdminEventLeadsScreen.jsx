import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { leadsApi, eventsApi } from '../../lib/api'

const TEMP = {
  hot:  { label: '🔥 Quente', bg: 'bg-red-100',   text: 'text-red-700'   },
  warm: { label: '♨️ Morno',  bg: 'bg-amber-100', text: 'text-amber-700' },
  cold: { label: '❄️ Frio',   bg: 'bg-blue-100',  text: 'text-blue-700'  },
}

function formatDate(d) {
  if (!d) return '—'
  const date = new Date(d.replace(' ', 'T'))
  if (isNaN(date)) return '—'
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function toCSV(leads) {
  const headers = ['Nome', 'Email', 'WhatsApp', 'Empresa', 'Cargo', 'Qualificação', 'Cadastrado por', 'Observações', 'Evento', 'Data']
  const rows = leads.map(l => [
    l.name, l.email, l.phone, l.company, l.role,
    ({ hot: 'Quente', warm: 'Morno', cold: 'Frio' }[l.temperature] || l.temperature),
    l.captured_by, l.notes, l.event_name, formatDate(l.created),
  ].map(v => `"${(v || '').replace(/"/g, '""')}"`))
  return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
}

export default function AdminEventLeadsScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [event, setEvent] = useState(null)
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTemp, setFilterTemp] = useState('all')
  const [filterBy, setFilterBy] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  useEffect(() => {
    eventsApi.list().then(data => {
      const ev = data.items?.find(e => e.id === id)
      if (ev) setEvent(ev)
      else if (location.state?.eventName) setEvent({ name: location.state.eventName })
    }).catch(() => {
      if (location.state?.eventName) setEvent({ name: location.state.eventName })
    })
  }, [id])

  useEffect(() => {
    if (event?.name) loadLeads()
  }, [event, page, filterTemp])

  async function loadLeads() {
    setLoading(true)
    try {
      const res = await leadsApi.list(event.name, page, 50, filterTemp)
      setLeads(res.items || [])
      setTotalPages(res.totalPages || 1)
      setTotalItems(res.totalItems || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function downloadCSV() {
    try {
      const res = await leadsApi.all(event.name)
      const all = res.items || []
      const csv = toCSV(all)
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leads-${(event.name || 'evento').replace(/\s+/g, '-')}-${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Erro ao gerar CSV: ' + err.message)
    }
  }

  const capturedByOptions = [...new Set(leads.map(l => l.captured_by).filter(Boolean))].sort()

  const filtered = leads
    .filter(l => filterBy === 'all' || l.captured_by === filterBy)
    .filter(l => !search || [l.name, l.email, l.company, l.phone, l.role, l.captured_by].some(v => v?.toLowerCase().includes(search.toLowerCase())))

  const displayName = event?.name || '...'
  const hot  = leads.filter(l => l.temperature === 'hot').length
  const warm = leads.filter(l => l.temperature === 'warm').length
  const cold = leads.filter(l => l.temperature === 'cold').length

  return (
    <div className="min-h-screen bg-gray-50 font-body">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
          <div>
            <h1 className="font-headline font-bold text-gray-900 text-lg leading-none">{displayName}</h1>
            <p className="text-xs text-gray-500">{totalItems} lead{totalItems !== 1 ? 's' : ''} capturado{totalItems !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={downloadCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm shadow-sm transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg,#FF6B35,#FF8C42)' }}
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          Baixar CSV
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total',    value: totalItems, color: 'text-gray-900' },
            { label: '🔥 Quente', value: hot,  color: 'text-red-600' },
            { label: '♨️ Morno',  value: warm, color: 'text-amber-600' },
            { label: '❄️ Frio',   value: cold, color: 'text-blue-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-center shadow-sm">
              <p className={`font-headline font-bold text-2xl ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, email, empresa..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all',  label: 'Todos' },
              { value: 'hot',  label: '🔥 Quente' },
              { value: 'warm', label: '♨️ Morno' },
              { value: 'cold', label: '❄️ Frio' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => { setFilterTemp(f.value); setPage(1) }}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  filterTemp === f.value
                    ? 'bg-orange-100 text-orange-700 border border-orange-200'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro por capturador */}
        {capturedByOptions.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-5 items-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Cadastrado por:</span>
            <button
              onClick={() => setFilterBy('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filterBy === 'all' ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Todos
            </button>
            {capturedByOptions.map(name => (
              <button
                key={name}
                onClick={() => setFilterBy(filterBy === name ? 'all' : name)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  filterBy === name ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {/* Tabela */}
        {loading ? (
          <div className="flex justify-center py-20">
            <span className="material-symbols-outlined text-4xl text-orange-400 animate-spin">sync</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <span className="material-symbols-outlined text-5xl text-gray-300 block mb-2">person_search</span>
            <p className="text-gray-500">Nenhum lead encontrado</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Nome','Email','WhatsApp','Empresa','Cargo','Qualif.','Cadastrado por','Obs.'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(lead => {
                      const temp = TEMP[lead.temperature] || TEMP.warm
                      return (
                        <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{lead.name}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {lead.email ? <a href={`mailto:${lead.email}`} className="hover:text-orange-500 transition-colors">{lead.email}</a> : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {lead.phone ? <a href={`https://wa.me/55${lead.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="hover:text-green-600 transition-colors">{lead.phone}</a> : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{lead.company || <span className="text-gray-300">—</span>}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{lead.role || <span className="text-gray-300">—</span>}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${temp.bg} ${temp.text}`}>{temp.label}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap text-xs font-medium">{lead.captured_by || <span className="text-gray-300">—</span>}</td>
                          <td className="px-4 py-3 text-gray-500 max-w-[180px]">
                            <span className="line-clamp-2 text-xs">{lead.notes || <span className="text-gray-300">—</span>}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">Página {page} de {totalPages} · {totalItems} leads</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50">← Anterior</button>
                  <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50">Próxima →</button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
