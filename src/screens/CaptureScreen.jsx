import { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { pb } from '../lib/pocketbase'
import { saveLead } from '../lib/db'
import { syncPendingLeads } from '../lib/sync'
import { useApp } from '../context/AppContext'
import { OfflineBanner } from '../components/OfflineBanner'
import { BottomNav } from '../components/BottomNav'
import { scanBadge } from '../lib/ocr'


export default function CaptureScreen() {
  const navigate = useNavigate()
  const location = useLocation()

  // Redireciona se não tiver acesso a eventos
  const _user = pb.authStore.model
  if (_user && _user.eventos_access !== true) {
    navigate('/home', { replace: true })
    return null
  }
  const EVENT_NAME = location.state?.eventName || 'Evento'
  const { isOnline, refreshPendingCount, loadLeadsLocal } = useApp()

  const [form, setForm] = useState({
    name:             '',
    email:            '',
    phone:            '',
    company:          '',
    role:             '',
    website:          '',
    quantidade_lojas: '',
    software_house:   '',
    temperature:      'warm',
    notes:            '',
  })
  const [formError, setFormError] = useState('')
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [scanning, setScanning]   = useState(false)
  const [scanStep, setScanStep]   = useState('')
  const cameraRef                 = useRef()

  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleScanBadge(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setScanning(true)
    setScanStep('qr')
    try {
      const data = await scanBadge(file, (step) => setScanStep(step))
      setForm(f => ({
        ...f,
        name:    data.name    || f.name,
        email:   data.email   || f.email,
        phone:   data.phone   ? maskPhone(data.phone) : f.phone,
        company: data.company || f.company,
        role:    data.role    || f.role,
      }))
    } catch (err) {
      console.error('[OCR]', err)
    } finally {
      setScanning(false)
      setScanStep('')
    }
  }


  function maskPhone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 10) {
      return digits
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
    }
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError('Nome é obrigatório.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const user = pb.authStore.model
      const capturedBy = user?.name || user?.email?.split('@')[0] || ''
      await saveLead({
        ...form,
        eventName:   EVENT_NAME,
        deviceId:    Capacitor.isNativePlatform() ? 'native' : 'web',
        capturedBy,
        website:     form.website || '',
      })
      if (isOnline) {
        syncPendingLeads().catch(() => {})
      }
      await refreshPendingCount()
      await loadLeadsLocal()
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setForm({ name: '', email: '', phone: '', company: '', role: '', website: '', quantidade_lojas: '', software_house: '', temperature: 'warm', notes: '' })
      }, 1500)
    } catch (err) {
      console.error('[Save lead]', err)
      if (err?.name === 'QuotaExceededError' || err?.code === 22) {
        setFormError('Armazenamento cheio. Sincronize os leads pendentes e tente novamente.')
      } else {
        setFormError('Erro ao salvar: ' + (err?.message || String(err)))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-dvh bg-surface font-body pb-44">
      <div
        className="fixed top-0 left-0 right-0 h-1 z-[60]"
        style={{ background: 'linear-gradient(135deg, #FF6B35, #FF8C42)' }}
      />

      <header
        className="glass-header fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 max-w-lg mx-auto"
        style={{ marginTop: 4 }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/home')}
            className="text-primary active:scale-95 transition-all p-1 rounded-full hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline font-bold text-lg text-on-secondary-fixed">
            {EVENT_NAME}
          </h1>
        </div>
        <span className="font-label font-bold text-primary text-sm">
          {EVENT_NAME.split(' ')[0]}
        </span>
      </header>

      <OfflineBanner />

      <main className="pt-20 px-6 space-y-6 max-w-lg mx-auto w-full">
        {!isOnline && (
          <div className="mt-2 flex justify-center">
            <div className="glass px-4 py-2 rounded-full flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">cloud_off</span>
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider font-label">
                Modo offline
              </span>
            </div>
          </div>
        )}

        <div className="pt-2">
          <h2 className="font-headline text-3xl font-extrabold text-on-secondary-fixed leading-tight">
            Captura de <br />
            <span className="text-primary">Leads</span>
          </h2>
        </div>

        <div className="bg-primary-fixed p-5 rounded-3xl flex gap-4 items-start border border-primary/10">
          <div className="bg-surface-container-lowest p-2 rounded-xl shadow-sm shrink-0">
            <span className="material-symbols-outlined icon-filled text-primary">lightbulb</span>
          </div>
          <p className="text-sm font-medium text-on-primary-fixed leading-relaxed">
            Funciona online e offline. Seus leads são salvos no dispositivo e sincronizados automaticamente ao reconectar.
          </p>
        </div>


        <section className="bg-surface-container-lowest rounded-3xl p-6 shadow-float space-y-5">
          <div className="space-y-1">
            <h3 className="font-headline font-bold text-xl text-on-secondary-fixed">
              Dados do Lead
            </h3>
            <p className="text-on-secondary-container text-sm">
              Preencha as informações coletadas durante a abordagem.
            </p>
          </div>

          {/* Botão OCR Crachá */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleScanBadge}
          />
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={scanning}
            className="w-full py-4 rounded-2xl font-headline font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all border-2 border-dashed border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 disabled:opacity-60"
          >
            {scanning ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                {scanStep === 'qr' ? 'Lendo QR code...' : 'Analisando texto...'}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                Fotografar Crachá
              </>
            )}
          </button>

          <Field label="Nome completo" icon="person" required>
            <input
              type="text"
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="Nome do visitante"
              className="input-field"
            />
          </Field>

          <Field label="E-mail" icon="mail">
            <input
              type="email"
              value={form.email}
              onChange={e => setField('email', e.target.value)}
              placeholder="email@exemplo.com"
              className="input-field"
            />
          </Field>

          <div className="grid grid-cols-1 gap-5">
            <Field label="WhatsApp" icon="smartphone">
              <input
                type="tel"
                value={form.phone}
                onChange={e => setField('phone', maskPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
                className="input-field"
              />
            </Field>
            <Field label="Empresa" icon="corporate_fare">
              <input
                type="text"
                value={form.company}
                onChange={e => setField('company', e.target.value)}
                placeholder="Nome da empresa"
                className="input-field"
              />
            </Field>
          </div>

          <Field label="Cargo" icon="work">
            <input
              type="text"
              value={form.role}
              onChange={e => setField('role', e.target.value)}
              placeholder="Ex: Gerente Comercial"
              className="input-field"
            />
          </Field>

          <Field label="Site / Rede Social" icon="language">
            <input
              type="url"
              value={form.website}
              onChange={e => setField('website', e.target.value)}
              placeholder="https://seusite.com.br"
              className="input-field"
            />
          </Field>

          <Field label="Qtd. de Lojas" icon="storefront">
            <input
              type="number"
              min="0"
              value={form.quantidade_lojas}
              onChange={e => setField('quantidade_lojas', e.target.value)}
              placeholder="0"
              className="input-field"
            />
          </Field>

          <Field label="Software House" icon="terminal">
            <input
              type="text"
              value={form.software_house}
              onChange={e => setField('software_house', e.target.value)}
              placeholder="Ex: TOTVS"
              className="input-field"
            />
          </Field>


          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-on-secondary-fixed uppercase tracking-widest ml-1">
              Observações
            </label>
            <textarea
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              placeholder="Detalhes da conversa, interesses específicos..."
              rows={3}
              className="w-full p-4 bg-surface-container-low border-none rounded-xl focus:ring-1 focus:ring-primary/30 focus:bg-surface-container-lowest transition-all placeholder:text-on-surface-variant/40 font-body text-sm outline-none resize-none"
            />
          </div>

          {formError && (
            <p className="text-error text-sm font-medium px-1">{formError}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="w-full py-5 rounded-2xl text-white font-headline font-bold text-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-70 mt-2"
            style={{
              background: saved
                ? 'linear-gradient(135deg, #006c49, #00af79)'
                : 'linear-gradient(135deg, #FF6B35, #FF8C42)',
              boxShadow: saved
                ? '0 8px 24px rgba(0,175,121,0.35)'
                : '0 8px 24px rgba(255,107,53,0.35)',
            }}
          >
            {saved ? (
              <><span className="material-symbols-outlined icon-filled">check_circle</span>Lead Salvo!</>
            ) : saving ? (
              <><span className="material-symbols-outlined animate-spin">sync</span>Salvando...</>
            ) : (
              <><span className="material-symbols-outlined">save</span>{isOnline ? 'Salvar Lead' : '💾 Salvar Offline'}</>
            )}
          </button>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}

function Field({ label, icon, required, children }) {
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
