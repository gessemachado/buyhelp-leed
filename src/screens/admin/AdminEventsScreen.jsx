import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { pb } from '../../lib/pocketbase'
import { eventsApi, leadsApi } from '../../lib/api'

function getStatus(ev) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = ev.date_start ? new Date(ev.date_start) : null
  const end   = ev.date_end   ? new Date(ev.date_end)   : null
  if (start && end) {
    if (today >= start && today <= end) return 'active'
    return 'inactive'
  }
  if (start) return today >= start ? 'active' : 'inactive'
  return 'inactive'
}

function formatDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export default function AdminEventsScreen() {
  const navigate = useNavigate()
  const [events, setEvents]       = useState([])
  const [leadCounts, setLeadCounts] = useState({})
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null)
  const [form, setForm]           = useState({ name: '', date_start: '', date_end: '', location: '', description: '' })
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(null)
  const [error, setError]         = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await eventsApi.list()
      const evts = data.items || []
      setEvents(evts)
      const counts = {}
      await Promise.all(evts.map(async ev => {
        try { counts[ev.id] = (await leadsApi.count(ev.name)).totalItems ?? 0 }
        catch { counts[ev.id] = 0 }
      }))
      setLeadCounts(counts)
    } catch (err) {
      setError('Erro ao carregar eventos: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setForm({ name: '', date_start: '', date_end: '', location: '', description: '' })
    setModal('create')
    setError('')
  }

  function openEdit(ev) {
    setForm({
      name:        ev.name        || '',
      date_start:  ev.date_start  || '',
      date_end:    ev.date_end    || '',
      location:    ev.location    || '',
      description: ev.description || '',
    })
    setModal(ev)
    setError('')
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true)
    setError('')
    try {
      if (modal === 'create') await eventsApi.create(form)
      else await eventsApi.update(modal.id, form)
      setModal(null)
      load()
    } catch (err) {
      setError(err?.message || 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(ev) {
    if (!confirm(`Excluir o evento "${ev.name}"?\nOs leads associados não serão excluídos.`)) return
    setDeleting(ev.id)
    try {
      await eventsApi.delete(ev.id)
      load()
    } catch (err) {
      alert('Erro ao excluir: ' + err.message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 font-body">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#FF6B35,#FF8C42)' }}>
            <span className="material-symbols-outlined text-white text-[18px]">rocket_launch</span>
          </div>
          <div>
            <h1 className="font-headline font-bold text-gray-900 text-lg leading-none">BuyHelp Admin</h1>
            <p className="text-xs text-gray-500">Gestão de Eventos e Leads</p>
          </div>
        </div>
        <button onClick={() => { pb.authStore.clear(); navigate('/admin/login') }} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-colors">
          <span className="material-symbols-outlined text-[18px]">logout</span>Sair
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-headline font-bold text-2xl text-gray-900">Eventos</h2>
            <p className="text-gray-500 text-sm mt-0.5">{events.length} evento{events.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm shadow-sm transition-all active:scale-95" style={{ background: 'linear-gradient(135deg,#FF6B35,#FF8C42)' }}>
            <span className="material-symbols-outlined text-[18px]">add</span>Novo Evento
          </button>
        </div>

        {error && !modal && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <span className="material-symbols-outlined text-4xl text-orange-400 animate-spin">sync</span>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl mb-3 block text-gray-300">event</span>
            <p className="font-semibold text-gray-600">Nenhum evento cadastrado</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map(ev => {
              const status = getStatus(ev)
              return (
                <div key={ev.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          status === 'active'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                          {status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <h3 className="font-headline font-bold text-gray-900 leading-tight">{ev.name}</h3>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(ev)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button onClick={() => handleDelete(ev)} disabled={deleting === ev.id} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40">
                        <span className={`material-symbols-outlined text-[18px] ${deleting === ev.id ? 'animate-spin' : ''}`}>{deleting === ev.id ? 'sync' : 'delete'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm text-gray-500">
                    {(ev.date_start || ev.date_end) && (
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                        {ev.date_start && ev.date_end
                          ? `${formatDate(ev.date_start)} → ${formatDate(ev.date_end)}`
                          : ev.date_start ? `De ${formatDate(ev.date_start)}` : `Até ${formatDate(ev.date_end)}`}
                      </div>
                    )}
                    {ev.location && (
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        {ev.location}
                      </div>
                    )}
                    {ev.description && (
                      <p className="text-xs text-gray-400 line-clamp-2 mt-1">{ev.description}</p>
                    )}
                  </div>

                  <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-orange-400">group</span>
                      <span className="font-bold text-gray-900">{leadCounts[ev.id] ?? '—'}</span>
                      <span className="text-xs text-gray-500">leads</span>
                    </div>
                    <button onClick={() => navigate(`/admin/eventos/${ev.id}`, { state: { eventName: ev.name } })} className="text-sm font-semibold text-orange-500 hover:text-orange-700 flex items-center gap-1 transition-colors">
                      Ver leads<span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Modal */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-headline font-bold text-xl text-gray-900 mb-5">
              {modal === 'create' ? 'Novo Evento' : 'Editar Evento'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Nome *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: ExpoVarejo 2026"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm text-gray-900 placeholder:text-gray-400" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Data Início</label>
                  <input type="date" value={form.date_start} onChange={e => setForm(f => ({ ...f, date_start: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm text-gray-900 placeholder:text-gray-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Data Fim</label>
                  <input type="date" value={form.date_end} onChange={e => setForm(f => ({ ...f, date_end: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm text-gray-900 placeholder:text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Status</label>
                <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${
                  form.date_start && form.date_end
                    ? getStatus({ date_start: form.date_start, date_end: form.date_end }) === 'active'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}>
                  {form.date_start && form.date_end
                    ? getStatus({ date_start: form.date_start, date_end: form.date_end }) === 'active'
                      ? '● Ativo — hoje está dentro do período'
                      : '○ Inativo — hoje está fora do período'
                    : 'Preencha as datas para ver o status'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Local</label>
                <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Cidade - UF"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm text-gray-900 placeholder:text-gray-400" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Descrição</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detalhes do evento..." rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm text-gray-900 placeholder:text-gray-400 resize-none" />
              </div>

              {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setModal(null); setError('') }} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60 transition-all" style={{ background: 'linear-gradient(135deg,#FF6B35,#FF8C42)' }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
