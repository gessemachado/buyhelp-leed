import { useState, useRef } from 'react'
import { pb } from '../lib/pocketbase'

const PB_URL = import.meta.env.VITE_PB_URL || 'https://buyhelp-pb.fly.dev'

function getAuth() {
  // Tenta pocketbase_auth (admin login) primeiro
  try {
    const raw = localStorage.getItem('pocketbase_auth')
    if (raw) {
      const parsed = JSON.parse(raw)
      // formato do AdminLoginScreen: { token, model }
      if (parsed?.token && parsed?.model) return parsed
      // formato alternativo: { token, record }
      if (parsed?.token && parsed?.record) return { token: parsed.token, model: parsed.record }
    }
  } catch { /* ignore */ }
  // Fallback: SDK do PocketBase
  if (pb.authStore.isValid && pb.authStore.model) {
    return { token: pb.authStore.token, model: pb.authStore.model }
  }
  return null
}

function avatarUrl(model) {
  if (!model?.avatar) return null
  return `${PB_URL}/api/files/users/${model.id}/${model.avatar}`
}

// ── Avatar circular ───────────────────────────────────────────────────────────
export function UserAvatar({ model, size = 'sm' }) {
  const sz = size === 'sm' ? 'w-8 h-8 text-sm' : size === 'md' ? 'w-12 h-12 text-base' : 'w-20 h-20 text-2xl'
  const url = avatarUrl(model)
  const initials = (model?.name || model?.email || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  if (url) return (
    <img src={url} alt={model?.name} className={`${sz} rounded-full object-cover shrink-0 border-2 border-outline-variant/30`} />
  )
  return (
    <div className={`${sz} rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 border-2 border-primary/20`}>
      {initials}
    </div>
  )
}

// ── Botão de perfil no header ─────────────────────────────────────────────────
export function AdminProfileButton() {
  const [open, setOpen] = useState(false)
  const auth = getAuth()
  const model = auth?.model

  if (!model) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-surface-container transition-colors"
      >
        <div className="relative">
          <UserAvatar model={model} size="sm" />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-surface-container-lowest" />
        </div>
        <span className="text-sm font-semibold text-on-surface hidden sm:block max-w-[140px] truncate">
          {model.name || model.email}
        </span>
      </button>

      {open && <ProfileModal model={model} onClose={() => setOpen(false)} />}
    </>
  )
}

// ── Modal de perfil ───────────────────────────────────────────────────────────
function ProfileModal({ model: initialModel, onClose }) {
  const [model, setModel] = useState(initialModel)
  const [tab, setTab] = useState('perfil') // 'perfil' | 'senha'
  const fileRef = useRef()

  // Perfil
  const [name, setName] = useState(model.name || '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')

  // Senha
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)
  const [pwdMsg, setPwdMsg] = useState('')

  async function updateLocalStorage(updated) {
    const raw = localStorage.getItem('pocketbase_auth')
    if (!raw) return
    const auth = JSON.parse(raw)
    auth.model = { ...auth.model, ...updated }
    localStorage.setItem('pocketbase_auth', JSON.stringify(auth))
    setModel(m => ({ ...m, ...updated }))
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSavingProfile(true)
    setProfileMsg('')
    try {
      const auth = getAuth()
      const form = new FormData()
      form.append('avatar', file)
      const res = await fetch(`${PB_URL}/api/collections/users/records/${model.id}`, {
        method: 'PATCH',
        headers: { Authorization: auth.token },
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      await updateLocalStorage({ avatar: data.avatar })
      setProfileMsg('Foto atualizada!')
    } catch (err) {
      setProfileMsg('Erro: ' + err.message)
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleSaveName() {
    if (!name.trim()) return
    setSavingProfile(true)
    setProfileMsg('')
    try {
      const auth = getAuth()
      const res = await fetch(`${PB_URL}/api/collections/users/records/${model.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: auth.token },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      await updateLocalStorage({ name: data.name })
      setProfileMsg('Nome atualizado!')
    } catch (err) {
      setProfileMsg('Erro: ' + err.message)
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword() {
    if (!oldPwd || !newPwd || !confirmPwd) { setPwdMsg('Preencha todos os campos.'); return }
    if (newPwd !== confirmPwd) { setPwdMsg('A nova senha e confirmação não coincidem.'); return }
    if (newPwd.length < 8) { setPwdMsg('A nova senha deve ter pelo menos 8 caracteres.'); return }
    setSavingPwd(true)
    setPwdMsg('')
    try {
      const auth = getAuth()
      const res = await fetch(`${PB_URL}/api/collections/users/records/${model.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: auth.token },
        body: JSON.stringify({ oldPassword: oldPwd, password: newPwd, passwordConfirm: confirmPwd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Senha atual incorreta.')
      setPwdMsg('Senha alterada com sucesso!')
      setOldPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch (err) {
      setPwdMsg('Erro: ' + err.message)
    } finally {
      setSavingPwd(false)
    }
  }

  const isSuccess = (msg) => msg.includes('!') && !msg.includes('Erro')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md border border-outline-variant/30">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
          <h2 className="font-headline font-bold text-on-surface text-lg">Meu Perfil</h2>
          <button onClick={onClose} className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center pt-6 pb-4 px-6">
          <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
            <UserAvatar model={model} size="lg" />
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-white text-[20px]">photo_camera</span>
            </div>
            {savingProfile && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[20px] animate-spin">sync</span>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <p className="text-xs text-on-surface-variant mt-2">Clique na foto para alterar</p>
          <p className="font-headline font-bold text-on-surface text-lg mt-1">{model.name || '—'}</p>
          <p className="text-xs text-on-surface-variant">{model.email}</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-outline-variant/30 px-6">
          {[
            { key: 'perfil', label: 'Dados', icon: 'person' },
            { key: 'senha',  label: 'Senha', icon: 'lock' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setProfileMsg(''); setPwdMsg('') }}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="px-6 py-5">
          {tab === 'perfil' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm text-on-surface"
                />
              </div>
              {profileMsg && (
                <p className={`text-sm px-3 py-2 rounded-lg ${isSuccess(profileMsg) ? 'bg-emerald-500/10 text-emerald-500' : 'bg-error/10 text-error'}`}>
                  {profileMsg}
                </p>
              )}
              <button
                onClick={handleSaveName}
                disabled={savingProfile}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60 transition-all"
                style={{ background: 'linear-gradient(135deg,#FF6B35,#FF8C42)' }}
              >
                {savingProfile ? 'Salvando...' : 'Salvar Nome'}
              </button>
            </div>
          )}

          {tab === 'senha' && (
            <div className="space-y-4">
              {[
                { label: 'Senha atual',       val: oldPwd,     set: setOldPwd,     show: showOld, toggle: () => setShowOld(v=>!v) },
                { label: 'Nova senha',        val: newPwd,     set: setNewPwd,     show: showNew, toggle: () => setShowNew(v=>!v) },
                { label: 'Confirmar senha',   val: confirmPwd, set: setConfirmPwd, show: showNew, toggle: null },
              ].map(({ label, val, set, show, toggle }) => (
                <div key={label}>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">{label}</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">lock</span>
                    <input
                      type={show ? 'text' : 'password'}
                      value={val}
                      onChange={e => set(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-surface-container-low border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm text-on-surface"
                    />
                    {toggle && (
                      <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                        <span className="material-symbols-outlined text-[18px]">{show ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {pwdMsg && (
                <p className={`text-sm px-3 py-2 rounded-lg ${isSuccess(pwdMsg) ? 'bg-emerald-500/10 text-emerald-500' : 'bg-error/10 text-error'}`}>
                  {pwdMsg}
                </p>
              )}
              <button
                onClick={handleChangePassword}
                disabled={savingPwd}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60 transition-all"
                style={{ background: 'linear-gradient(135deg,#FF6B35,#FF8C42)' }}
              >
                {savingPwd ? 'Alterando...' : 'Alterar Senha'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
