import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { syncPendingLeads } from '../lib/sync'
import { updateLead } from '../lib/db'
import { pb } from '../lib/pocketbase'
import { useApp } from '../context/AppContext'
import { BottomNav } from '../components/BottomNav'
import { OfflineBanner } from '../components/OfflineBanner'

function safeEmail(email) {
  if (!email) return ''
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : ''
}

function maskPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  }
  return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}


function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr.replace(' ', 'T'))
  if (isNaN(d)) return ''
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function LeadsScreen() {
  const navigate = useNavigate()
  const {
    isOnline,
    pendingCount,
    refreshPendingCount,
    leads,
    leadsSource,
    setLeadsSource,
    leadsLoading,
    activeEvent,
    loadLeadsLocal,
    loadLeadsRemote,
  } = useApp()

  const [filter, setFilter]         = useState('all')
  const [capturedBy, setCapturedBy] = useState('all')
  const [search, setSearch]         = useState('')
  const [syncing, setSyncing]       = useState(false)
  const [syncError, setSyncError]   = useState('')

  const [editingLead, setEditingLead] = useState(null)
  const [editForm, setEditForm]       = useState({})
  const [editSaving, setEditSaving]   = useState(false)
  const [editError, setEditError]     = useState('')

  function openEdit(lead) {
    setEditForm({
      company:          lead.company          || '',
      name:             lead.name             || '',
      email:            lead.email            || '',
      phone:            lead.phone            || '',
      role:             lead.role             || '',
      website:          lead.website          || '',
      quantidade_lojas: lead.quantidade_lojas || '',
      quantidade_pdvs:  lead.quantidade_pdvs  || '',
      software_house:   lead.software_house   || '',
      notes:            lead.notes            || '',
    })
    setEditError('')
    setEditingLead(lead)
  }

  function setEditField(field, value) {
    setEditForm(f => ({ ...f, [field]: value }))
  }

  async function handleEditSave() {
    if (!editForm.name.trim()) {
      setEditError('Nome é obrigatório.')
      return
    }
    setEditSaving(true)
    setEditError('')
    try {
      if (leadsSource === 'remote' && isOnline) {
        await pb.collection('leads').update(editingLead.id, {
          name:             editForm.name,
          email:            safeEmail(editForm.email),
          phone:            editForm.phone            || '',
          company:          editForm.company          || '',
          role:             editForm.role             || '',
          notes:            editForm.notes            || '',
          website:          editForm.website          || '',
          quantidade_lojas: editForm.quantidade_lojas || '',
          quantidade_pdvs:  editForm.quantidade_pdvs  || '',
          software_house:   editForm.software_house   || '',
        })
        await loadLeadsRemote()
      } else if (leadsSource === 'local') {
        await updateLead(editingLead.id, editForm)
        if (isOnline) syncPendingLeads().catch(() => {})
        await refreshPendingCount()
        await loadLeadsLocal()
      } else {
        // offline mas leadsSource ainda é 'remote (transição) — não deixa salvar
        setEditError('Sem conexão. Aguarde um instante e tente novamente.')
        return
      }
      setEditingLead(null)
    } catch (err) {
      console.error('[Edit lead]', err)
      setEditError('Erro ao salvar: ' + (err?.message || String(err)))
    } finally {
      setEditSaving(false)
    }
  }

  // Reage a mudanças de conectividade: online → remoto, offline → local
  useEffect(() => {
    if (isOnline) {
      loadLeadsRemote()
    } else {
      loadLeadsLocal()
    }
  }, [isOnline])

  async function handleSync() {
    if (!isOnline || syncing) return
    setSyncing(true)
    setSyncError('')
    try {
      const { failed } = await syncPendingLeads()
      await refreshPendingCount()
      if (failed > 0) {
        setSyncError(`${failed} lead(s) não puderam ser enviados. Tente novamente.`)
      }
      await loadLeadsRemote()
    } catch (err) {
      setSyncError('Erro ao sincronizar: ' + (err?.message || String(err)))
    } finally {
      setSyncing(false)
    }
  }

  // Lista única de capturadores para o filtro
  const capturedByOptions = [...new Set(leads.map(l => l.captured_by).filter(Boolean))].sort()

  // Filtro por status (só relevante na view local)
  const byStatus = leadsSource === 'local'
    ? leads.filter(l => {
        if (filter === 'pending') return l.synced === 0
        if (filter === 'synced')  return l.synced === 1
        return true
      })
    : leads

  // Filtro por capturador
  const byCaptured = capturedBy === 'all'
    ? byStatus
    : byStatus.filter(l => l.captured_by === capturedBy)

  // Busca por nome, email, telefone, empresa
  const filtered = byCaptured.filter(l => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return [l.name, l.email, l.phone, l.company].some(v => v?.toLowerCase().includes(q))
  })

  const syncedCount  = leads.filter(l => l.synced === 1).length
  const pendingLocal = leads.filter(l => l.synced === 0).length

  return (
    <div className="min-h-dvh bg-surface-container-low font-body pb-24">
      <header className="glass-header fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 max-w-lg mx-auto">
        <div className="flex flex-col">
          <h1 className="font-headline font-bold text-lg text-on-secondary-fixed leading-tight">
            Leads Capturados
          </h1>
          {activeEvent && (
            <p className="text-[11px] text-primary font-semibold truncate max-w-[200px]">
              {activeEvent.name}
            </p>
          )}
        </div>
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

        {/* Aviso se não há campanha ativa */}
        {!activeEvent && (
          <div className="mt-2 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-xl px-4 py-2.5">
            <span className="material-symbols-outlined text-amber-500 text-[18px]">info</span>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              Nenhuma campanha ativa no momento
            </span>
          </div>
        )}

        {/* Stats */}
        <section className="mt-2">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total',     count: leads.length,  color: 'text-on-secondary-fixed' },
              { label: 'Sincron.',  count: leadsSource === 'remote' ? leads.length : syncedCount, color: 'text-tertiary' },
              { label: 'Pendente',  count: leadsSource === 'remote' ? 0 : pendingLocal,           color: 'text-primary' },
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

        {/* Erro de sync */}
        {syncError && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 rounded-xl px-4 py-2.5">
            <span className="material-symbols-outlined text-error text-[18px]">error</span>
            <span className="text-xs font-semibold text-error">{syncError}</span>
          </div>
        )}

        {/* Indicador de fonte */}
        {leadsSource === 'remote' && (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl px-4 py-2.5">
            <span className="material-symbols-outlined icon-filled text-emerald-600 dark:text-emerald-400 text-[18px]">cloud_done</span>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Exibindo todos os leads sincronizados</span>
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
        {leadsSource === 'local' && (
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

        {/* Filtro por capturador */}
        {capturedByOptions.length > 1 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">
              Capturado por
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setCapturedBy('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  capturedBy === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-surface-container-lowest text-on-surface-variant'
                }`}
              >
                Todos
              </button>
              {capturedByOptions.map(name => (
                <button
                  key={name}
                  onClick={() => setCapturedBy(capturedBy === name ? 'all' : name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    capturedBy === name
                      ? 'bg-primary text-white'
                      : 'bg-surface-container-lowest text-on-surface-variant'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lista */}
        {leadsLoading ? (
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
            {!search && filter === 'all' && activeEvent && (
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
              return (
                <div key={lead.id} className="bg-surface-container-lowest rounded-2xl p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
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
                      {lead.website && (
                        <p className="text-primary text-xs truncate mt-0.5">{lead.website}</p>
                      )}
                      {(lead.quantidade_lojas || lead.quantidade_pdvs) && (
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {lead.quantidade_lojas && (
                            <span className="flex items-center gap-1 text-[11px] text-on-surface-variant">
                              <span className="material-symbols-outlined text-[13px]">storefront</span>
                              {lead.quantidade_lojas} loja{lead.quantidade_lojas !== '1' ? 's' : ''}
                            </span>
                          )}
                          {lead.quantidade_pdvs && (
                            <span className="flex items-center gap-1 text-[11px] text-on-surface-variant">
                              <span className="material-symbols-outlined text-[13px]">point_of_sale</span>
                              {lead.quantidade_pdvs} PDV{lead.quantidade_pdvs !== '1' ? 's' : ''}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right flex flex-col items-end gap-1.5">
                      <button
                        onClick={() => openEdit(lead)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 active:scale-95 transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <p className="text-[11px] text-on-surface-variant">{formatDate(lead.created)}</p>
                      {lead.event_name && (
                        <p className="text-[10px] text-on-surface-variant/60 truncate max-w-[100px]">
                          {lead.event_name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Rodapé: capturado por + status envio */}
                  <div className="mt-2.5 pt-2.5 border-t border-surface-container-low flex items-center justify-between gap-2">
                    {lead.captured_by ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-primary text-[13px]">person</span>
                        </div>
                        <span className="text-[11px] text-on-surface-variant">
                          por <span className="font-bold text-on-secondary-fixed">{lead.captured_by}</span>
                        </span>
                      </div>
                    ) : <span />}
                    {leadsSource === 'remote' || lead.synced === 1 ? (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10">
                        <span className="material-symbols-outlined icon-filled text-[13px]" style={{ color: '#00af79' }}>cloud_done</span>
                        <span className="text-[11px] font-bold" style={{ color: '#00af79' }}>Enviado</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10">
                        <span className="material-symbols-outlined text-[13px] text-primary">cloud_upload</span>
                        <span className="text-[11px] font-bold text-primary">Pendente</span>
                      </div>
                    )}
                  </div>

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

      {activeEvent && (
        <button
          onClick={() => navigate('/capture')}
          className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full text-white flex items-center justify-center shadow-cta active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, #FF6B35, #FF8C42)' }}
        >
          <span className="material-symbols-outlined text-[28px]">add</span>
        </button>
      )}

      <BottomNav />

      {/* Modal de edição */}
      {editingLead && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingLead(null)} />
          <div className="relative w-full max-w-lg bg-surface rounded-t-3xl px-6 pt-5 pb-10 shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-headline font-bold text-xl text-on-secondary-fixed">Editar Lead</h2>
              <button onClick={() => setEditingLead(null)} className="p-1 rounded-full hover:bg-surface-container-low text-on-surface-variant">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <EField label="Empresa" icon="corporate_fare">
                <input type="text" value={editForm.company} onChange={e => setEditField('company', e.target.value)} placeholder="Nome da empresa" className="edit-input" />
              </EField>
              <EField label="Nome completo" icon="person" required>
                <input type="text" value={editForm.name} onChange={e => setEditField('name', e.target.value)} placeholder="Nome do visitante" className="edit-input" />
              </EField>
              <EField label="E-mail" icon="mail">
                <input type="email" value={editForm.email} onChange={e => setEditField('email', e.target.value)} placeholder="email@exemplo.com" className="edit-input" />
              </EField>
              <EField label="WhatsApp" icon="smartphone">
                <input type="tel" value={editForm.phone} onChange={e => setEditField('phone', maskPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} className="edit-input" />
              </EField>
              <EField label="Cargo" icon="work">
                <input type="text" value={editForm.role} onChange={e => setEditField('role', e.target.value)} placeholder="Ex: Gerente Comercial" className="edit-input" />
              </EField>
              <EField label="Site / Rede Social" icon="language">
                <input type="url" value={editForm.website} onChange={e => setEditField('website', e.target.value)} placeholder="https://seusite.com.br" className="edit-input" />
              </EField>
              <EField label="Qtd. de Lojas" icon="storefront">
                <input type="number" min="0" value={editForm.quantidade_lojas} onChange={e => setEditField('quantidade_lojas', e.target.value)} placeholder="0" className="edit-input" />
              </EField>
              <EField label="Qtd. de PDVs" icon="point_of_sale">
                <input type="number" min="0" value={editForm.quantidade_pdvs} onChange={e => setEditField('quantidade_pdvs', e.target.value)} placeholder="0" className="edit-input" />
              </EField>
              <EField label="Software House" icon="terminal">
                <input type="text" value={editForm.software_house} onChange={e => setEditField('software_house', e.target.value)} placeholder="Ex: TOTVS" className="edit-input" />
              </EField>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-on-secondary-fixed uppercase tracking-widest ml-1">Observações</label>
                <textarea
                  value={editForm.notes}
                  onChange={e => setEditField('notes', e.target.value)}
                  placeholder="Detalhes da conversa..."
                  rows={3}
                  className="w-full p-4 bg-surface-container-low border-none rounded-xl focus:ring-1 focus:ring-primary/30 focus:bg-surface-container-lowest transition-all placeholder:text-on-surface-variant/40 font-body text-sm outline-none resize-none"
                />
              </div>

              {editError && <p className="text-error text-sm font-medium px-1">{editError}</p>}

              <button
                onClick={handleEditSave}
                disabled={editSaving}
                className="w-full py-4 rounded-2xl text-white font-headline font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, #FF6B35, #FF8C42)', boxShadow: '0 8px 24px rgba(255,107,53,0.35)' }}
              >
                {editSaving
                  ? <><span className="material-symbols-outlined animate-spin">sync</span>Salvando...</>
                  : <><span className="material-symbols-outlined">send</span>Salvar Alterações</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EField({ label, icon, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-on-secondary-fixed uppercase tracking-widest ml-1">
        {label}{required && <span className="text-error ml-0.5">*</span>}
      </label>
      <div className="relative group">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-secondary-container group-focus-within:text-primary transition-colors text-[20px]">
          {icon}
        </span>
        <div className="[&>input]:w-full [&>input]:pl-12 [&>input]:pr-4 [&>input]:py-4 [&>input]:bg-surface-container-low [&>input]:border-none [&>input]:rounded-xl [&>input]:focus:ring-1 [&>input]:focus:ring-primary/30 [&>input]:focus:bg-surface-container-lowest [&>input]:transition-all [&>input]:placeholder:text-on-surface-variant/40 [&>input]:font-body [&>input]:text-sm [&>input]:outline-none">
          {children}
        </div>
      </div>
    </div>
  )
}
