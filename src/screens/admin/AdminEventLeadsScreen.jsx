import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { leadsApi, eventsApi } from '../../lib/api'
import { useTheme } from '../../context/ThemeContext'
import { pb } from '../../lib/pocketbase'

function formatDate(d) {
  if (!d) return '—'
  const date = new Date(d.replace(' ', 'T'))
  if (isNaN(date)) return '—'
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function safeEmail(email) {
  if (!email) return ''
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : ''
}

function maskPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

// CSV com as mesmas colunas da tabela
function toCSV(leads) {
  const headers = ['Nome', 'Email', 'WhatsApp', 'Empresa', 'Cargo', 'Qtd Lojas', 'Qtd PDVs', 'Software House', 'Cadastrado por', 'Observações', 'Data']
  const rows = leads.map(l => [
    l.name, l.email, l.phone, l.company, l.role,
    l.quantidade_lojas, l.quantidade_pdvs, l.software_house,
    l.captured_by, l.notes, formatDate(l.created),
  ].map(v => `"${(v || '').replace(/"/g, '""')}"`))
  return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
}

const EMPTY_FORM = {
  company: '', name: '', email: '', phone: '', role: '',
  website: '', quantidade_lojas: '', quantidade_pdvs: '', software_house: '', notes: '',
}

export default function AdminEventLeadsScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()

  const [event, setEvent]           = useState(null)
  const [leads, setLeads]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterBy, setFilterBy]     = useState('all')
  const [page, setPage]             = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving]       = useState(false)

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
  }, [event, page])

  async function loadLeads() {
    setLoading(true)
    try {
      const res = await leadsApi.list(event.name, page, 50, '')
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
      const csv = toCSV(res.items || [])
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
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

  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleCreateLead() {
    if (!form.name.trim()) { setFormError('Nome é obrigatório.'); return }
    setSaving(true)
    setFormError('')
    try {
      const user = pb.authStore.model
      const capturedBy = user?.name || user?.email?.split('@')[0] || 'Admin'
      await leadsApi.create({
        name:             form.name,
        email:            safeEmail(form.email),
        phone:            form.phone            || '',
        company:          form.company          || '',
        role:             form.role             || '',
        website:          form.website          || '',
        quantidade_lojas: form.quantidade_lojas || '',
        quantidade_pdvs:  form.quantidade_pdvs  || '',
        software_house:   form.software_house   || '',
        notes:            form.notes            || '',
        event_name:       event.name,
        temperature:      'warm',
        captured_by:      capturedBy,
        device_id:        'web-admin',
      })
      setShowForm(false)
      setForm(EMPTY_FORM)
      await loadLeads()
    } catch (err) {
      setFormError('Erro ao salvar: ' + (err?.message || String(err)))
    } finally {
      setSaving(false)
    }
  }

  const capturedByOptions = [...new Set(leads.map(l => l.captured_by).filter(Boolean))].sort()

  const filtered = leads
    .filter(l => filterBy === 'all' || l.captured_by === filterBy)
    .filter(l => !search || [l.name, l.email, l.company, l.phone, l.role, l.captured_by].some(v => v?.toLowerCase().includes(search.toLowerCase())))

  return (
    <div className="min-h-screen bg-surface-container-low font-body">
      <header className="bg-surface-container-lowest border-b border-outline-variant/30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/eventos')} className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
          <div>
            <h1 className="font-headline font-bold text-on-surface text-lg leading-none">{event?.name || '...'}</h1>
            <p className="text-xs text-on-surface-variant">{totalItems} lead{totalItems !== 1 ? 's' : ''} capturado{totalItems !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          >
            <span className="material-symbols-outlined text-[20px]">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
          </button>
          <button
            onClick={() => { setShowForm(true); setForm(EMPTY_FORM); setFormError('') }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border border-primary text-primary hover:bg-primary/5 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Novo Lead
          </button>
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm shadow-cta transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg,#FF6B35,#FF8C42)' }}
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Baixar CSV
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-5">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 px-6 py-3 text-center shadow-float inline-block">
            <p className="font-headline font-bold text-2xl text-on-surface">{totalItems}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">Total de leads</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, email, empresa..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm text-on-surface placeholder:text-on-surface-variant/40"
            />
          </div>
        </div>

        {capturedByOptions.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-5 items-center">
            <span className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-wider mr-1">Cadastrado por:</span>
            <button
              onClick={() => setFilterBy('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filterBy === 'all' ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}
            >
              Todos
            </button>
            {capturedByOptions.map(name => (
              <button
                key={name}
                onClick={() => setFilterBy(filterBy === name ? 'all' : name)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filterBy === name ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <span className="material-symbols-outlined text-4xl text-orange-400 animate-spin">sync</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-surface-container-lowest rounded-2xl border border-outline-variant/30">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 block mb-2">person_search</span>
            <p className="text-on-surface-variant">Nenhum lead encontrado</p>
          </div>
        ) : (
          <>
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-float overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-container border-b border-outline-variant/30">
                      {['Nome','Email','WhatsApp','Empresa','Cargo','Qtd Lojas','Qtd PDVs','Software House','Cadastrado por','Obs.','Data'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {filtered.map(lead => (
                      <tr key={lead.id} className="hover:bg-surface-container transition-colors">
                        <td className="px-4 py-3 font-semibold text-on-surface whitespace-nowrap">{lead.name}</td>
                        <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                          {lead.email ? <a href={`mailto:${lead.email}`} className="hover:text-primary transition-colors">{lead.email}</a> : <span className="text-on-surface-variant/30">—</span>}
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                          {lead.phone ? <a href={`https://wa.me/55${lead.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="hover:text-emerald-500 transition-colors">{lead.phone}</a> : <span className="text-on-surface-variant/30">—</span>}
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{lead.company || <span className="text-on-surface-variant/30">—</span>}</td>
                        <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{lead.role || <span className="text-on-surface-variant/30">—</span>}</td>
                        <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap text-center">{lead.quantidade_lojas || <span className="text-on-surface-variant/30">—</span>}</td>
                        <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap text-center">{lead.quantidade_pdvs || <span className="text-on-surface-variant/30">—</span>}</td>
                        <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{lead.software_house || <span className="text-on-surface-variant/30">—</span>}</td>
                        <td className="px-4 py-3 text-on-surface whitespace-nowrap text-xs font-medium">{lead.captured_by || <span className="text-on-surface-variant/30">—</span>}</td>
                        <td className="px-4 py-3 text-on-surface-variant max-w-[180px]">
                          <span className="line-clamp-2 text-xs">{lead.notes || <span className="text-on-surface-variant/30">—</span>}</span>
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap text-xs">{formatDate(lead.created)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-on-surface-variant">Página {page} de {totalPages} · {totalItems} leads</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="px-3 py-2 rounded-lg border border-outline-variant text-sm text-on-surface-variant disabled:opacity-40 hover:bg-surface-container">← Anterior</button>
                  <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-3 py-2 rounded-lg border border-outline-variant text-sm text-on-surface-variant disabled:opacity-40 hover:bg-surface-container">Próxima →</button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal novo lead */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-lg bg-surface rounded-3xl shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="sticky top-0 bg-surface rounded-t-3xl px-6 pt-5 pb-4 border-b border-outline-variant/20 flex items-center justify-between z-10">
              <h2 className="font-headline font-bold text-xl text-on-surface">Novo Lead</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <MField label="Empresa" icon="corporate_fare">
                <input type="text" value={form.company} onChange={e => setField('company', e.target.value)} placeholder="Nome da empresa" className="modal-input" />
              </MField>
              <MField label="Nome completo" icon="person" required>
                <input type="text" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Nome do visitante" className="modal-input" />
              </MField>
              <MField label="E-mail" icon="mail">
                <input type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="email@exemplo.com" className="modal-input" />
              </MField>
              <MField label="WhatsApp" icon="smartphone">
                <input type="tel" value={form.phone} onChange={e => setField('phone', maskPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} className="modal-input" />
              </MField>
              <MField label="Cargo" icon="work">
                <input type="text" value={form.role} onChange={e => setField('role', e.target.value)} placeholder="Ex: Gerente Comercial" className="modal-input" />
              </MField>
              <MField label="Site / Rede Social" icon="language">
                <input type="url" value={form.website} onChange={e => setField('website', e.target.value)} placeholder="https://seusite.com.br" className="modal-input" />
              </MField>
              <MField label="Qtd. de Lojas" icon="storefront">
                <input type="number" min="0" value={form.quantidade_lojas} onChange={e => setField('quantidade_lojas', e.target.value)} placeholder="0" className="modal-input" />
              </MField>
              <MField label="Qtd. de PDVs" icon="point_of_sale">
                <input type="number" min="0" value={form.quantidade_pdvs} onChange={e => setField('quantidade_pdvs', e.target.value)} placeholder="0" className="modal-input" />
              </MField>
              <MField label="Software House" icon="terminal">
                <input type="text" value={form.software_house} onChange={e => setField('software_house', e.target.value)} placeholder="Ex: TOTVS" className="modal-input" />
              </MField>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-on-surface uppercase tracking-widest ml-1">Observações</label>
                <textarea
                  value={form.notes}
                  onChange={e => setField('notes', e.target.value)}
                  placeholder="Detalhes da conversa, interesses específicos..."
                  rows={3}
                  className="w-full p-4 bg-surface-container-low border-none rounded-xl focus:ring-1 focus:ring-primary/30 focus:bg-surface-container-lowest transition-all placeholder:text-on-surface-variant/40 text-sm outline-none resize-none text-on-surface"
                />
              </div>

              {formError && <p className="text-error text-sm font-medium px-1">{formError}</p>}

              <button
                onClick={handleCreateLead}
                disabled={saving}
                className="w-full py-4 rounded-2xl text-white font-headline font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg,#FF6B35,#FF8C42)', boxShadow: '0 8px 24px rgba(255,107,53,0.35)' }}
              >
                {saving
                  ? <><span className="material-symbols-outlined animate-spin">sync</span>Salvando...</>
                  : <><span className="material-symbols-outlined">person_add</span>Cadastrar Lead</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MField({ label, icon, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-on-surface uppercase tracking-widest ml-1">
        {label}{required && <span className="text-error ml-0.5">*</span>}
      </label>
      <div className="relative group">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-[20px]">
          {icon}
        </span>
        <div className="[&>input]:w-full [&>input]:pl-12 [&>input]:pr-4 [&>input]:py-4 [&>input]:bg-surface-container-low [&>input]:border-none [&>input]:rounded-xl [&>input]:focus:ring-1 [&>input]:focus:ring-primary/30 [&>input]:focus:bg-surface-container-lowest [&>input]:transition-all [&>input]:placeholder:text-on-surface-variant/40 [&>input]:text-sm [&>input]:outline-none [&>input]:text-on-surface">
          {children}
        </div>
      </div>
    </div>
  )
}
