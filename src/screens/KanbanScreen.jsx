import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { pb } from '../lib/pocketbase'
import { kanbanApi } from '../lib/api'
import { useTheme } from '../context/ThemeContext'
import { AdminProfileButton } from '../components/AdminProfile'

// ── Coluna padrão semeada na primeira carga ──────────────────────────────────
const DEFAULT_COLUMNS = [
  { name: 'A Fazer',       color: 'gray',   position: 0 },
  { name: 'Em Andamento',  color: 'blue',   position: 1 },
  { name: 'Em Revisão',    color: 'orange', position: 2 },
  { name: 'Concluído',     color: 'green',  position: 3 },
]

const COLOR_MAP = {
  gray:   { dot: 'bg-gray-400',    badge: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700/40 dark:text-gray-300 dark:border-gray-600',      colBg: 'bg-gray-50 dark:bg-gray-500/10',    colBorder: 'border-gray-200 dark:border-gray-500/30' },
  blue:   { dot: 'bg-blue-400',    badge: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-700/30 dark:text-blue-300 dark:border-blue-600/40',       colBg: 'bg-blue-50 dark:bg-blue-500/10',    colBorder: 'border-blue-200 dark:border-blue-500/30' },
  orange: { dot: 'bg-orange-400',  badge: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-700/30 dark:text-orange-300 dark:border-orange-600/40', colBg: 'bg-orange-50 dark:bg-orange-500/10',  colBorder: 'border-orange-200 dark:border-orange-500/30' },
  green:  { dot: 'bg-emerald-400', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-700/30 dark:text-emerald-300 dark:border-emerald-600/40', colBg: 'bg-emerald-50 dark:bg-emerald-500/10', colBorder: 'border-emerald-200 dark:border-emerald-500/30' },
  purple: { dot: 'bg-purple-400',  badge: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-700/30 dark:text-purple-300 dark:border-purple-600/40', colBg: 'bg-purple-50 dark:bg-purple-500/10',  colBorder: 'border-purple-200 dark:border-purple-500/30' },
  red:    { dot: 'bg-red-400',     badge: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-700/30 dark:text-red-300 dark:border-red-600/40',           colBg: 'bg-red-50 dark:bg-red-500/10',     colBorder: 'border-red-200 dark:border-red-500/30' },
}

const COLOR_OPTIONS = ['gray', 'blue', 'orange', 'green', 'purple', 'red']
const COLOR_LABELS  = { gray: 'Cinza', blue: 'Azul', orange: 'Laranja', green: 'Verde', purple: 'Roxo', red: 'Vermelho' }

const today = () => new Date().toISOString().split('T')[0]
const EMPTY_CARD = { title: '', description: '', solicitante: '', solicitado: '', departamento: '', credenciado: '', tipo: 'tarefa', data_abertura: today(), deadline: '', gravidade: 3, urgencia: 3, tendencia: 3 }
const DEPARTAMENTOS = ['Comercial', 'Marketing', 'Operação', 'Financeiro', 'Desenvolvimento']
const EMPTY_COL  = { name: '', color: 'blue' }

// Extrai dd/mm de qualquer string de data (ISO YYYY-MM-DD ou BR DD/MM/YYYY)
function ddmm(s) {
  if (!s || typeof s !== 'string') return ''
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[3]}/${iso[2]}`
  const br = s.match(/^(\d{2})\/(\d{2})/)
  if (br) return `${br[1]}/${br[2]}`
  return ''
}

// ── File helpers ─────────────────────────────────────────────────────────────
function fileIcon(name = '') {
  const ext = name.split('.').pop().toLowerCase()
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'picture_as_pdf'
  if (['doc','docx'].includes(ext)) return 'description'
  if (['xls','xlsx'].includes(ext)) return 'table_chart'
  if (['mp3','wav','ogg','m4a'].includes(ext)) return 'audio_file'
  if (['mp4','mov','avi','webm'].includes(ext)) return 'video_file'
  return 'attach_file'
}

// ── GUT helpers ──────────────────────────────────────────────────────────────
function gut(g, u, t) { return (Number(g) || 1) * (Number(u) || 1) * (Number(t) || 1) }

function GutBadge({ g, u, t }) {
  const s = gut(g, u, t)
  const cls = s >= 76 ? 'bg-red-100 text-red-700 border-red-200'
            : s >= 26 ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : 'bg-emerald-100 text-emerald-700 border-emerald-200'
  return (
    <span className={`inline-flex items-center gap-0.5 px-1 py-px rounded-full text-[9px] font-bold border ${cls}`}>
      GUT {s}
    </span>
  )
}

function GutRow({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              value === n
                ? 'text-white shadow-sm'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
            style={value === n ? { background: 'linear-gradient(135deg,#FF6B35,#FF8C42)' } : {}}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function KanbanScreen() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [columns, setColumns]       = useState([])
  const [cards, setCards]           = useState([])
  const [users, setUsers]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  // modal de card
  const [cardModal, setCardModal]       = useState(null)
  const [cardForm, setCardForm]         = useState(EMPTY_CARD)
  const [cardColId, setCardColId]       = useState('')
  const [newFiles, setNewFiles]         = useState([])       // File[] a enviar
  const [removedFiles, setRemovedFiles] = useState([])       // nomes a remover
  const [savingCard, setSavingCard]     = useState(false)
  const [deletingCard, setDeletingCard] = useState(false)

  // drag
  const [draggingId, setDraggingId]   = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)

  // filtros
  const [filterSolicitante,  setFilterSolicitante]  = useState('')
  const [filterSolicitado,   setFilterSolicitado]   = useState('')
  const [filterDepartamento, setFilterDepartamento] = useState('')
  const [filterTipo,         setFilterTipo]         = useState('')

  // modal de coluna
  const [colModal, setColModal]     = useState(null)   // null | 'new' | column
  const [colForm, setColForm]       = useState(EMPTY_COL)
  const [savingCol, setSavingCol]   = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [colData, cardData, userData] = await Promise.all([
        kanbanApi.listColumns(),
        kanbanApi.listCards(),
        kanbanApi.listUsers(),
      ])
      setUsers(userData.items || [])
      let cols = colData.items || []
      if (cols.length === 0) {
        for (const col of DEFAULT_COLUMNS) await kanbanApi.createColumn(col)
        const seeded = await kanbanApi.listColumns()
        cols = seeded.items || []
      }
      setColumns(cols)

      // Identifica colunas "Concluído"
      const concludedColIds = new Set(cols.filter(c => c.name.toLowerCase().includes('conclu')).map(c => c.id))

      // Auto-arquiva cards concluídos há mais de 30 dias
      const allCards = cardData.items || []
      const now = Date.now()
      const toArchive = allCards.filter(card => {
        if (card.archived) return false
        if (!concludedColIds.has(card.column_id)) return false
        if (!card.concluded_at) return false
        const days = (now - new Date(card.concluded_at).getTime()) / (1000 * 60 * 60 * 24)
        return days >= 30
      })

      if (toArchive.length > 0) {
        await Promise.all(toArchive.map(card =>
          kanbanApi.updateCard(card.id, { archived: true })
        ))
      }

      // Filtra arquivados do estado
      setCards(allCards.filter(c => !c.archived && !toArchive.find(a => a.id === c.id)))
    } catch (err) {
      setError('Erro ao carregar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Cards ─────────────────────────────────────────────────────────────────
  function openNewCard(colId) {
    setCardForm({ ...EMPTY_CARD })
    setCardColId(colId)
    setNewFiles([])
    setRemovedFiles([])
    setCardModal('new')
  }

  function openEditCard(card) {
    setNewFiles([])
    setRemovedFiles([])
    setCardForm({
      title:       card.title       || '',
      description: card.description || '',
      solicitante:  card.solicitante  || '',
      solicitado:   card.solicitado   || '',
      departamento: card.departamento || '',
      credenciado:  card.credenciado  || '',
      tipo:         card.tipo         || 'tarefa',
      deadline:    card.deadline    ? card.deadline.split(' ')[0] : '',
      gravidade:   card.gravidade   || 3,
      urgencia:    card.urgencia    || 3,
      tendencia:   card.tendencia   || 3,
    })
    setCardColId(card.column_id)
    setCardModal(card)
  }

  async function handleSaveCard() {
    if (!cardForm.title.trim()) return
    setSavingCard(true)
    try {
      const now = new Date()
      const dataAbertura = now.toISOString().split('T')[0]
      const isMovingToConcluded = isConcludedCol(cardColId) &&
        (cardModal === 'new' || cardModal?.column_id !== cardColId)
      const payload = {
        ...cardForm,
        column_id: cardColId,
        position: 0,
        ...(cardModal === 'new' ? { data_abertura: dataAbertura } : {}),
        ...(isMovingToConcluded ? { concluded_at: new Date().toISOString() } : {}),
      }
      if (cardModal === 'new') {
        const created = await kanbanApi.createCard(payload, newFiles)
        setCards(c => [created, ...c])
      } else {
        const updated = await kanbanApi.updateCard(cardModal.id, payload, newFiles, removedFiles)
        setCards(c => c.map(x => x.id === cardModal.id ? { ...x, ...updated } : x))
      }
      setCardModal(null)
    } catch (err) {
      alert('Erro ao salvar: ' + err.message)
    } finally {
      setSavingCard(false)
    }
  }

  async function handleDeleteCard() {
    if (!confirm('Excluir esta demanda?')) return
    setDeletingCard(true)
    try {
      await kanbanApi.deleteCard(cardModal.id)
      setCards(c => c.filter(x => x.id !== cardModal.id))
      setCardModal(null)
    } catch (err) {
      alert('Erro: ' + err.message)
    } finally {
      setDeletingCard(false)
    }
  }

  function isConcludedCol(colId) {
    const col = columns.find(c => c.id === colId)
    return col?.name.toLowerCase().includes('conclu') || false
  }

  function concludedPayload(newColId) {
    return isConcludedCol(newColId) ? { concluded_at: new Date().toISOString() } : {}
  }

  async function moveCard(card, direction) {
    const idx = columns.findIndex(c => c.id === card.column_id)
    const next = idx + direction
    if (next < 0 || next >= columns.length) return
    const newColId = columns[next].id
    try {
      const extra = concludedPayload(newColId)
      await kanbanApi.updateCard(card.id, { column_id: newColId, ...extra })
      setCards(c => c.map(x => x.id === card.id ? { ...x, column_id: newColId, ...extra } : x))
    } catch (err) {
      alert('Erro ao mover: ' + err.message)
    }
  }

  // ── Colunas ───────────────────────────────────────────────────────────────
  function openNewCol() {
    setColForm({ ...EMPTY_COL })
    setColModal('new')
  }

  function openEditCol(col) {
    setColForm({ name: col.name, color: col.color || 'gray' })
    setColModal(col)
  }

  async function handleSaveCol() {
    if (!colForm.name.trim()) return
    setSavingCol(true)
    try {
      if (colModal === 'new') {
        const created = await kanbanApi.createColumn({ ...colForm, position: columns.length })
        setColumns(c => [...c, created])
      } else {
        const updated = await kanbanApi.updateColumn(colModal.id, colForm)
        setColumns(c => c.map(x => x.id === colModal.id ? { ...x, ...updated } : x))
      }
      setColModal(null)
    } catch (err) {
      alert('Erro ao salvar coluna: ' + err.message)
    } finally {
      setSavingCol(false)
    }
  }

  async function handleDeleteCol() {
    const colCards = cards.filter(c => c.column_id === colModal.id)
    if (colCards.length > 0) {
      alert(`Esta coluna tem ${colCards.length} demanda(s). Mova ou exclua antes de deletar.`)
      return
    }
    if (!confirm(`Excluir a coluna "${colModal.name}"?`)) return
    try {
      await kanbanApi.deleteColumn(colModal.id)
      setColumns(c => c.filter(x => x.id !== colModal.id))
      setColModal(null)
    } catch (err) {
      alert('Erro: ' + err.message)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-container-low font-body">
      {/* Header admin */}
      <header className="bg-surface-container-lowest border-b border-outline-variant/30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#FF6B35,#FF8C42)' }}>
            <span className="material-symbols-outlined text-white text-[18px]">rocket_launch</span>
          </div>
          <div>
            <h1 className="font-headline font-bold text-on-surface text-lg leading-none">BuyHelp Admin</h1>
            <p className="text-xs text-on-surface-variant">Gestão de Demandas</p>
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
          <button className="text-sm text-primary font-semibold flex items-center gap-1 px-2 py-1.5 rounded-xl bg-primary/10 cursor-default">
            <span className="material-symbols-outlined text-[18px]">view_kanban</span>Kanban
          </button>
          {(() => {
            try {
              const auth = JSON.parse(localStorage.getItem('pocketbase_auth') || '{}')
              const m = auth.model || {}
              const isSuperuser = m.collectionName === '_superusers' || m.collectionId === '_superusers'
              if (isSuperuser || m.eventos_access === true) return (
                <button onClick={() => navigate('/admin/eventos')} className="text-sm text-on-surface-variant hover:text-on-surface flex items-center gap-1 transition-colors px-2 py-1.5 rounded-xl hover:bg-surface-container">
                  <span className="material-symbols-outlined text-[18px]">event</span>Eventos
                </button>
              )
            } catch {}
            return null
          })()}
          <AdminProfileButton />
          <button onClick={() => { pb.authStore.clear(); navigate('/admin/login') }} className="text-sm text-on-surface-variant hover:text-on-surface flex items-center gap-1 transition-colors px-2 py-1.5 rounded-xl hover:bg-surface-container">
            <span className="material-symbols-outlined text-[18px]">logout</span>Sair
          </button>
        </div>
      </header>

      <main className="pb-4">
        {/* Sub-header */}
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="font-headline font-bold text-2xl text-on-surface">Kanban</h2>
            <p className="text-on-surface-variant text-sm mt-0.5">{cards.length} demanda{cards.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={openNewCol}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm shadow-sm transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg,#FF6B35,#FF8C42)' }}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>Nova Coluna
          </button>
        </div>

        {/* Filtros */}
        <div className="px-6 pb-4 flex flex-wrap gap-3 items-center">
          <span className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">filter_list</span>Filtros
          </span>

          <select value={filterSolicitante} onChange={e => setFilterSolicitante(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">Solicitante: Todos</option>
            {users.map(u => <option key={u.id} value={u.name || u.email}>{u.name || u.email}</option>)}
          </select>

          <select value={filterSolicitado} onChange={e => setFilterSolicitado(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">Solicitado: Todos</option>
            {users.map(u => <option key={u.id} value={u.name || u.email}>{u.name || u.email}</option>)}
          </select>

          <select value={filterDepartamento} onChange={e => setFilterDepartamento(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">Departamento: Todos</option>
            {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">Tipo: Todos</option>
            <option value="tarefa">Tarefa</option>
            <option value="bug">Bug</option>
          </select>

          {(filterSolicitante || filterSolicitado || filterDepartamento || filterTipo) && (
            <button onClick={() => { setFilterSolicitante(''); setFilterSolicitado(''); setFilterDepartamento(''); setFilterTipo('') }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs text-error border border-error/30 hover:bg-error/10 transition-colors">
              <span className="material-symbols-outlined text-[14px]">close</span>Limpar
            </button>
          )}
        </div>

        {error && (
          <div className="mx-6 mb-4 bg-error-container/20 border border-error/20 text-error rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-32">
            <span className="material-symbols-outlined text-5xl text-orange-400 animate-spin">sync</span>
          </div>
        ) : (
          /* Board horizontal */
          <div className="flex gap-4 px-6 overflow-x-auto pb-6" style={{ minHeight: 'calc(100vh - 200px)' }}>
            {columns.map((col, colIdx) => {
              const colCards = cards
                .filter(c => c.column_id === col.id)
                .filter(c => !filterSolicitante  || c.solicitante  === filterSolicitante)
                .filter(c => !filterSolicitado   || c.solicitado   === filterSolicitado)
                .filter(c => !filterDepartamento || c.departamento === filterDepartamento)
                .filter(c => !filterTipo         || (c.tipo || 'tarefa') === filterTipo)
                .sort((a, b) => gut(b.gravidade, b.urgencia, b.tendencia) - gut(a.gravidade, a.urgencia, a.tendencia))
              const clr = COLOR_MAP[col.color] || COLOR_MAP.gray

              const isDragOver = dragOverCol === col.id

              return (
                <div
                  key={col.id}
                  className={`flex-shrink-0 w-72 rounded-2xl border-2 flex flex-col transition-colors ${
                    isDragOver ? 'border-orange-400 bg-orange-50/60' : `${clr.colBorder} ${clr.colBg}`
                  }`}
                  style={{ maxHeight: 'calc(100dvh - 150px)' }}
                  onDragOver={e => { e.preventDefault(); setDragOverCol(col.id) }}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverCol(null) }}
                  onDrop={async e => {
                    e.preventDefault()
                    setDragOverCol(null)
                    const cardId = e.dataTransfer.getData('cardId')
                    if (!cardId) return
                    const card = cards.find(c => c.id === cardId)
                    if (!card || card.column_id === col.id) return
                    try {
                      const extra = concludedPayload(col.id)
                      await kanbanApi.updateCard(cardId, { column_id: col.id, ...extra })
                      setCards(cs => cs.map(c => c.id === cardId ? { ...c, column_id: col.id, ...extra } : c))
                    } catch (err) { alert('Erro ao mover: ' + err.message) }
                    setDraggingId(null)
                  }}
                >
                  {/* Header da coluna */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${clr.dot}`} />
                      <span className="font-headline font-bold text-sm text-on-surface truncate">{col.name}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${clr.badge}`}>
                        {colCards.length}
                      </span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openEditCol(col)}
                        className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button
                        onClick={() => openNewCard(col.id)}
                        className="p-1 rounded-lg text-on-surface-variant hover:text-primary hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                      </button>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2.5">
                    {colCards.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-on-surface-variant/40">
                        <span className="material-symbols-outlined text-3xl mb-1">inbox</span>
                        <span className="text-xs">Sem demandas</span>
                      </div>
                    )}
                    {colCards.map(card => (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={e => { e.dataTransfer.setData('cardId', card.id); setDraggingId(card.id) }}
                        onDragEnd={() => setDraggingId(null)}
                        onClick={() => openEditCard(card)}
                        className={`rounded-xl p-3.5 shadow-float border cursor-grab active:cursor-grabbing hover:shadow-soft transition-all ${
                          card.tipo === 'bug'
                            ? 'bg-red-500/10 border-red-500/25'
                            : 'bg-surface-container-lowest border-outline-variant/30'
                        } ${draggingId === card.id ? 'opacity-40 scale-95' : ''}`}
                      >
                        <div className="flex items-center gap-1 mb-1.5">
                          {card.tipo === 'bug' ? (
                            <span className="inline-flex items-center gap-0.5 px-1 py-px rounded-full text-[9px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                              <span className="material-symbols-outlined text-[9px]">bug_report</span>Bug
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1 py-px rounded-full text-[9px] font-bold bg-primary/10 text-primary border border-primary/20">
                              <span className="material-symbols-outlined text-[9px]">task_alt</span>Tarefa
                            </span>
                          )}
                          <GutBadge g={card.gravidade} u={card.urgencia} t={card.tendencia} />
                        </div>
                        <p className="font-semibold text-xs text-on-surface leading-snug mb-2">{card.title}</p>

                        {(card.solicitante || card.solicitado) && (
                          <div className="flex items-center gap-1 text-[10px] text-on-surface-variant mb-1 truncate">
                            <span className="material-symbols-outlined text-[11px] shrink-0">person</span>
                            {card.solicitante && <span className="truncate">{card.solicitante}</span>}
                            {card.solicitante && card.solicitado && <span className="shrink-0 text-on-surface-variant/40">→</span>}
                            {card.solicitado && <span className="truncate">{card.solicitado}</span>}
                          </div>
                        )}
                        {(() => {
                          const opened = ddmm(card.data_abertura)
                          const prazo  = ddmm(card.deadline)
                          if (!opened && !prazo) return null
                          return (
                            <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant">
                              {opened && <span className="flex items-center gap-0.5 shrink-0">
                                <span className="material-symbols-outlined text-[10px]">event</span>{opened}
                              </span>}
                              {opened && prazo && <span className="text-on-surface-variant/30">·</span>}
                              {prazo && <span className="flex items-center gap-0.5 shrink-0">
                                <span className="material-symbols-outlined text-[10px]">schedule</span>{prazo}
                              </span>}
                            </div>
                          )
                        })()}

                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Botão nova coluna inline */}
            <button
              onClick={openNewCol}
              className="flex-shrink-0 w-16 rounded-2xl border-2 border-dashed border-outline-variant/40 flex flex-col items-center justify-center gap-2 text-on-surface-variant/30 hover:border-primary/40 hover:text-primary/60 transition-colors self-start py-8"
            >
              <span className="material-symbols-outlined text-3xl">add</span>
            </button>
          </div>
        )}
      </main>

      {/* ── Modal de Card (Jira-style) ────────────────────────────────────── */}
      {cardModal !== null && (
        <CardModal
          cardModal={cardModal}
          cardForm={cardForm} setCardForm={setCardForm}
          cardColId={cardColId} setCardColId={setCardColId}
          newFiles={newFiles} setNewFiles={setNewFiles}
          removedFiles={removedFiles} setRemovedFiles={setRemovedFiles}
          savingCard={savingCard} deletingCard={deletingCard}
          columns={columns} users={users}
          onSave={handleSaveCard}
          onDelete={handleDeleteCard}
          onClose={() => setCardModal(null)}
        />
      )}

      {/* ── Modal de Coluna ───────────────────────────────────────────────── */}
      {colModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-outline-variant/30">
            <h3 className="font-headline font-bold text-lg text-on-surface mb-5">
              {colModal === 'new' ? 'Nova Coluna' : 'Editar Coluna'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Nome</label>
                <input
                  type="text"
                  value={colForm.name}
                  onChange={e => setColForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Em Teste"
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm text-on-surface placeholder:text-on-surface-variant/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColForm(f => ({ ...f, color: c }))}
                      title={COLOR_LABELS[c]}
                      className={`w-8 h-8 rounded-full transition-all ${COLOR_MAP[c].dot} ${
                        colForm.color === c ? 'ring-2 ring-offset-2 ring-outline scale-110' : 'opacity-60 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              {colModal !== 'new' && (
                <button
                  onClick={handleDeleteCol}
                  className="p-3 rounded-xl border border-error/30 text-error hover:bg-error/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              )}
              <button
                onClick={() => setColModal(null)}
                className="flex-1 py-3 rounded-xl border border-outline-variant text-on-surface-variant font-semibold text-sm hover:bg-surface-container transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCol}
                disabled={savingCol || !colForm.name.trim()}
                className="flex-1 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60 transition-all"
                style={{ background: 'linear-gradient(135deg,#FF6B35,#FF8C42)' }}
              >
                {savingCol ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 'sm' }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  return (
    <div className={`${sz} rounded-full bg-orange-100 text-orange-600 font-bold flex items-center justify-center shrink-0`}>
      {initials}
    </div>
  )
}

// ── Render mention text ───────────────────────────────────────────────────────
function MentionText({ text }) {
  const parts = text.split(/(@\w+(?:\s\w+)?)/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('@')
          ? <span key={i} className="text-orange-500 font-semibold bg-orange-50 rounded px-0.5">{p}</span>
          : p
      )}
    </>
  )
}

// ── Seção de comentários ──────────────────────────────────────────────────────
function CommentSection({ cardId, users }) {
  // Nome do usuário admin logado (salvo pelo AdminLoginScreen)
  const currentUser = (() => {
    try {
      const raw = localStorage.getItem('pocketbase_auth')
      const model = raw ? JSON.parse(raw).model : null
      return model?.name || model?.email?.split('@')[0] || 'Usuário'
    } catch { return 'Usuário' }
  })()
  const [comments, setComments]         = useState([])
  const [loadingC, setLoadingC]         = useState(true)
  const [text, setText]                 = useState('')
  const [saving, setSaving]             = useState(false)
  const [mentionQuery, setMentionQuery] = useState(null)
  const [mentionStart, setMentionStart] = useState(0)

  useEffect(() => {
    if (!cardId) return
    kanbanApi.listComments(cardId)
      .then(d => setComments(d.items || []))
      .catch(() => {})
      .finally(() => setLoadingC(false))
  }, [cardId])

  function handleInput(e) {
    const val = e.target.value
    setText(val)
    const cursor = e.target.selectionStart
    const before = val.slice(0, cursor)
    const m = before.match(/@(\w*)$/)
    if (m) { setMentionQuery(m[1].toLowerCase()); setMentionStart(m.index) }
    else setMentionQuery(null)
  }

  const filteredUsers = mentionQuery !== null
    ? users.filter(u => (u.name || u.email).toLowerCase().includes(mentionQuery)).slice(0, 6)
    : []

  function pickMention(user) {
    const name = (user.name || user.email).split(' ')[0]
    const before = text.slice(0, mentionStart)
    const after  = text.slice(mentionStart + 1 + (mentionQuery?.length || 0))
    setText(before + '@' + name + ' ' + after)
    setMentionQuery(null)
  }

  async function submit() {
    if (!text.trim()) return
    setSaving(true)
    try {
      const created = await kanbanApi.createComment({ card_id: cardId, author: currentUser, content: text })
      setComments(c => [...c, created])
      setText('')
      setMentionQuery(null)
    } catch (err) { alert('Erro: ' + err.message) }
    finally { setSaving(false) }
  }

  async function removeComment(id) {
    if (!confirm('Excluir comentário?')) return
    await kanbanApi.deleteComment(id)
    setComments(c => c.filter(x => x.id !== id))
  }

  return (
    <div>
      <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">chat</span>
        Comentários {comments.length > 0 && <span className="text-xs text-gray-400">({comments.length})</span>}
      </h4>

      {loadingC ? (
        <p className="text-xs text-on-surface-variant/50">Carregando...</p>
      ) : (
        <div className="space-y-4 mb-4">
          {comments.map(c => (
            <div key={c.id} className="flex gap-3 group">
              <Avatar name={c.author} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-on-surface">{c.author}</span>
                  <span className="text-[11px] text-on-surface-variant/50">
                    {new Date((c.created || '').replace(' ', 'T')).toLocaleString('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </span>
                </div>
                <div className="bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface leading-relaxed border border-outline-variant/30">
                  <MentionText text={c.content} />
                </div>
              </div>
              <button onClick={() => removeComment(c.id)}
                className="opacity-0 group-hover:opacity-100 text-on-surface-variant/30 hover:text-error transition-all p-1 self-start mt-5">
                <span className="material-symbols-outlined text-[15px]">delete</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-3">
        <Avatar name={currentUser} />
        <div className="flex-1 relative">
          <textarea
            value={text}
            onChange={handleInput}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) submit() }}
            placeholder="Adicionar comentário… Use @ para mencionar alguém"
            rows={2}
            className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm text-on-surface resize-none placeholder:text-on-surface-variant/40"
          />
          {filteredUsers.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-float z-20 w-52 overflow-hidden">
              {filteredUsers.map(u => (
                <button key={u.id} type="button" onMouseDown={e => { e.preventDefault(); pickMention(u) }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-surface-container flex items-center gap-2 transition-colors text-on-surface">
                  <Avatar name={u.name || u.email} size="sm" />
                  <span className="truncate">{u.name || u.email}</span>
                </button>
              ))}
            </div>
          )}
          {text.trim() && (
            <div className="flex items-center gap-2 mt-2">
              <button onClick={submit} disabled={saving}
                className="px-4 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#FF6B35,#FF8C42)' }}>
                {saving ? 'Enviando…' : 'Comentar'}
              </button>
              <span className="text-[11px] text-on-surface-variant/50">ou Ctrl+Enter</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Modal de Card (Jira-style) ────────────────────────────────────────────────
function safeAttachments(cardModal) {
  const raw = cardModal?.attachments
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  if (typeof raw === 'string') return raw ? [raw] : []
  return []
}

function CardModal({ cardModal, cardForm, setCardForm, cardColId, setCardColId,
  newFiles, setNewFiles, removedFiles, setRemovedFiles,
  savingCard, deletingCard, columns, users, onSave, onDelete, onClose }) {

  const isNew = cardModal === 'new'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-7xl flex flex-col border border-outline-variant/30"
           style={{ height: 'min(92vh, 900px)' }}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30 shrink-0">
          <span className="text-sm text-on-surface-variant font-medium">{isNew ? 'Nova Demanda' : 'Demanda'}</span>
          <div className="flex items-center gap-2">
            {!isNew && (
              <button onClick={onDelete} disabled={deletingCard}
                className="p-2 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50">
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Painel esquerdo ── */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            <textarea
              value={cardForm.title}
              onChange={e => setCardForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Título da demanda…"
              rows={2}
              className="w-full text-2xl font-bold text-on-surface resize-none border-none outline-none bg-transparent placeholder:text-on-surface-variant/30 leading-snug"
            />

            <div>
              <h4 className="font-semibold text-on-surface mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">description</span>Descrição
              </h4>
              <textarea
                value={cardForm.description}
                onChange={e => setCardForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Adicione uma descrição detalhada…"
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm text-on-surface placeholder:text-on-surface-variant/40 resize-none"
              />
            </div>

            <div>
              <h4 className="font-semibold text-on-surface mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">attach_file</span>Anexos
              </h4>
              {!isNew && safeAttachments(cardModal).filter(f => !removedFiles.includes(f)).map(fname => (
                <div key={fname} className="flex items-center gap-2 px-3 py-2 mb-1.5 bg-surface-container rounded-xl border border-outline-variant/30">
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant">{fileIcon(fname)}</span>
                  <a href={kanbanApi.fileUrl(cardModal.id, fname)} target="_blank" rel="noreferrer"
                    className="flex-1 text-xs text-primary hover:underline truncate">{fname}</a>
                  <button type="button" onClick={() => setRemovedFiles(r => [...r, fname])}
                    className="text-on-surface-variant hover:text-error transition-colors">
                    <span className="material-symbols-outlined text-[15px]">close</span>
                  </button>
                </div>
              ))}
              {newFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 mb-1.5 bg-primary/10 rounded-xl border border-primary/20">
                  <span className="material-symbols-outlined text-[16px] text-primary">{fileIcon(f.name)}</span>
                  <span className="flex-1 text-xs text-on-surface truncate">{f.name}</span>
                  <button type="button" onClick={() => setNewFiles(nf => nf.filter((_, j) => j !== i))}
                    className="text-on-surface-variant hover:text-error transition-colors">
                    <span className="material-symbols-outlined text-[15px]">close</span>
                  </button>
                </div>
              ))}
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-outline-variant/40 hover:border-primary/40 hover:bg-primary/5 cursor-pointer transition-colors mt-1">
                <span className="material-symbols-outlined text-on-surface-variant text-[18px]">upload_file</span>
                <span className="text-sm text-on-surface-variant">Clique para anexar</span>
                <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,audio/*,video/*" className="hidden"
                  onChange={e => setNewFiles(nf => [...nf, ...Array.from(e.target.files)])} />
              </label>
            </div>

            {!isNew && <CommentSection cardId={cardModal.id} users={users} />}
          </div>

          {/* ── Sidebar direita ── */}
          <div className="w-80 border-l border-outline-variant/30 bg-surface-container overflow-y-auto px-5 py-6 space-y-5 shrink-0">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Tipo</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'tarefa', label: 'Tarefa', icon: 'task_alt' },
                  { value: 'bug',    label: 'Bug',    icon: 'bug_report' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCardForm(f => ({ ...f, tipo: opt.value }))}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      cardForm.tipo === opt.value
                        ? opt.value === 'bug'
                          ? 'bg-red-500 text-white'
                          : 'bg-primary text-on-primary'
                        : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-outline-variant/30" />

            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Status</label>
              <select value={cardColId} onChange={e => setCardColId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm text-on-surface font-semibold">
                {columns.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
              </select>
            </div>

            <div className="border-t border-outline-variant/30" />

            <div className="space-y-4">
              <p className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-wider">Detalhes</p>
              <div className="flex items-center gap-3">
                <span className="text-xs text-on-surface-variant w-24 shrink-0">Solicitante</span>
                <select value={cardForm.solicitante} onChange={e => setCardForm(f => ({ ...f, solicitante: e.target.value }))}
                  className="flex-1 px-2 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary/30 text-xs text-on-surface">
                  <option value="">—</option>
                  {users.map(u => <option key={u.id} value={u.name || u.email}>{u.name || u.email}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-on-surface-variant w-24 shrink-0">Solicitado a</span>
                <select value={cardForm.solicitado} onChange={e => setCardForm(f => ({ ...f, solicitado: e.target.value }))}
                  className="flex-1 px-2 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary/30 text-xs text-on-surface">
                  <option value="">—</option>
                  {users.map(u => <option key={u.id} value={u.name || u.email}>{u.name || u.email}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-on-surface-variant w-24 shrink-0">Departamento</span>
                <select value={cardForm.departamento} onChange={e => setCardForm(f => ({ ...f, departamento: e.target.value }))}
                  className="flex-1 px-2 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary/30 text-xs text-on-surface">
                  <option value="">—</option>
                  {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-on-surface-variant w-24 shrink-0">Credenciado</span>
                <input
                  type="text"
                  value={cardForm.credenciado}
                  onChange={e => setCardForm(f => ({ ...f, credenciado: e.target.value }))}
                  placeholder="Nome do credenciado"
                  className="flex-1 px-2 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary/30 text-xs text-on-surface placeholder:text-on-surface-variant/40"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-on-surface-variant w-24 shrink-0">Dt. Abertura</span>
                <div className="flex-1 px-2 py-1.5 rounded-lg bg-surface-container border border-outline-variant/30 text-xs text-on-surface-variant select-none cursor-not-allowed flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] text-on-surface-variant/50">lock</span>
                  {cardModal !== 'new' && cardModal?.data_abertura
                    ? cardModal.data_abertura
                    : <span className="italic">Auto ao criar</span>}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-on-surface-variant w-24 shrink-0">Prazo</span>
                <div className="flex-1 relative">
                  <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[15px] pointer-events-none">calendar_month</span>
                  <input type="date" value={cardForm.deadline} onChange={e => setCardForm(f => ({ ...f, deadline: e.target.value }))}
                    className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary/30 text-xs text-on-surface" />
                </div>
              </div>
            </div>

            <div className="border-t border-outline-variant/30" />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-wider">Matriz GUT</p>
                <GutBadge g={cardForm.gravidade} u={cardForm.urgencia} t={cardForm.tendencia} />
              </div>
              <GutRow label="G — Gravidade" value={cardForm.gravidade} onChange={v => setCardForm(f => ({ ...f, gravidade: v }))} />
              <GutRow label="U — Urgência"  value={cardForm.urgencia}  onChange={v => setCardForm(f => ({ ...f, urgencia: v }))} />
              <GutRow label="T — Tendência" value={cardForm.tendencia} onChange={v => setCardForm(f => ({ ...f, tendencia: v }))} />
            </div>

            <div className="border-t border-outline-variant/30" />

            {!isNew && cardModal?.created && (
              <div className="text-[11px] text-on-surface-variant/50 space-y-1">
                <p>Criado em {new Date((cardModal.created || '').replace(' ', 'T')).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' })}</p>
                {cardModal.updated && <p>Atualizado em {new Date((cardModal.updated || '').replace(' ', 'T')).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' })}</p>}
              </div>
            )}

            <button onClick={onSave} disabled={savingCard || !cardForm.title.trim()}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60 transition-all"
              style={{ background: 'linear-gradient(135deg,#FF6B35,#FF8C42)' }}>
              {savingCard ? 'Salvando…' : isNew ? 'Criar Demanda' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
