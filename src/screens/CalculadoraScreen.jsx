import { useState, useCallback } from 'react'
import { BottomNav } from '../components/BottomNav'
import { OfflineBanner } from '../components/OfflineBanner'

// Formata número em BRL enquanto digita
function formatBRL(value) {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  const number = parseInt(digits, 10) / 100
  return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseBRL(formatted) {
  return parseFloat(formatted.replace(/\./g, '').replace(',', '.')) || 0
}

function formatPercent(value) {
  const digits = value.replace(/[^0-9,]/g, '')
  return digits
}

function parsePercent(value) {
  return parseFloat(value.replace(',', '.')) || 0
}

export default function CalculadoraScreen() {
  const [faturamento, setFaturamento] = useState('')
  const [aliquota, setAliquota]       = useState('')


  const faturamentoNum   = parseBRL(faturamento)
  const aliquotaNum      = parsePercent(aliquota)
  const desconto         = faturamentoNum * (aliquotaNum / 100)
  const totalTaxa        = (desconto / 0.75) - desconto
  const taxaBuyHelp      = totalTaxa * 0.60
  const taxaCredenciado  = totalTaxa * 0.40
  const hasResult        = faturamentoNum > 0 && aliquotaNum > 0

  const handleFaturamento = useCallback((e) => {
    setFaturamento(formatBRL(e.target.value))
  }, [])

  const handleAliquota = useCallback((e) => {
    const v = e.target.value.replace(/[^0-9,]/g, '')
    setAliquota(v)
  }, [])

  function handleClear() {
    setFaturamento('')
    setAliquota('')
  }

  return (
    <div className="min-h-dvh bg-surface-container-low font-body pb-24">
      {/* Header */}
      <header className="glass-header fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 max-w-lg mx-auto">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-primary text-[24px]">calculate</span>
          <h1 className="font-headline font-bold text-lg text-on-secondary-fixed">Calculadora BuyHelp</h1>
        </div>
        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface-variant hover:text-error transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">restart_alt</span>
          <span className="text-xs font-semibold font-label">Limpar</span>
        </button>
      </header>

      <OfflineBanner />

      <main className="pt-20 px-6 space-y-5 max-w-lg mx-auto w-full">

        {/* Banner explicativo */}
        <div className="rounded-2xl bg-primary/10 border border-primary/20 px-5 py-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-[22px] mt-0.5 shrink-0">info</span>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Informe o <strong className="text-on-secondary-fixed">faturamento</strong> e a{' '}
            <strong className="text-on-secondary-fixed">alíquota DES</strong> para calcular o desconto ao cliente BuyHelp.
          </p>
        </div>

        {/* Card de inputs */}
        <section className="bg-surface-container-lowest rounded-2xl shadow-soft overflow-hidden">

          {/* Faturamento */}
          <div className="px-5 py-4 border-b border-surface-container-low">
            <label className="block font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
              Faturamento
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-sm font-bold text-on-surface-variant select-none">R$</span>
              <input
                id="campo-faturamento"
                inputMode="numeric"
                value={faturamento}
                onChange={handleFaturamento}
                placeholder="0,00"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-container text-on-secondary-fixed font-bold text-lg tracking-wide placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/60 transition-all"
              />
            </div>
          </div>

          {/* Alíquota DES */}
          <div className="px-5 py-4">
            <label className="block font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
              Alíquota DES
            </label>
            <div className="relative flex items-center">
              <input
                id="campo-aliquota"
                inputMode="decimal"
                value={aliquota}
                onChange={handleAliquota}
                placeholder="0,00"
                className="w-full pl-4 pr-10 py-3 rounded-xl bg-surface-container text-on-secondary-fixed font-bold text-lg tracking-wide placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/60 transition-all"
              />
              <span className="absolute right-3 text-sm font-bold text-on-surface-variant select-none">%</span>
            </div>
          </div>
        </section>

        {/* Resultado */}
        <section
          className={`rounded-2xl overflow-hidden shadow-soft transition-all duration-300 ${
            hasResult
              ? 'bg-primary/10 border border-primary/25 opacity-100 scale-100'
              : 'bg-surface-container-lowest border border-transparent opacity-60'
          }`}
        >
          <div className="px-5 pt-5 pb-4">
            <p className="font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
              Desconto Cliente
            </p>

            <div className="flex items-end gap-3">
              <div>
                <p
                  id="resultado-desconto"
                  className={`font-headline font-extrabold transition-all duration-300 ${
                    hasResult
                      ? 'text-3xl text-primary'
                      : 'text-2xl text-on-surface-variant/40'
                  }`}
                >
                  {hasResult
                    ? `R$ ${desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : 'R$ —'}
                </p>
                {hasResult && (
                  <p className="text-xs text-on-surface-variant mt-1">
                    {faturamentoNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    {' × '}
                    {aliquotaNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%
                  </p>
                )}
              </div>
            </div>
          </div>

          {hasResult && (
            <div className="px-5 py-3 bg-primary/5 border-t border-primary/15 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[16px]">percent</span>
              <p className="text-xs text-on-surface-variant">
                Economia de{' '}
                <strong className="text-primary">
                  {aliquotaNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%
                </strong>{' '}
                sobre o faturamento informado.
              </p>
            </div>
          )}
        </section>

        {/* Total Taxa */}
        <section
          className={`rounded-2xl overflow-hidden shadow-soft transition-all duration-300 ${
            hasResult
              ? 'bg-amber-500/10 border border-amber-500/25 opacity-100'
              : 'bg-surface-container-lowest border border-transparent opacity-60'
          }`}
        >
          <div className="px-5 pt-5 pb-4">
            <p className="font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
              Total Taxa
            </p>

            <div className="flex items-end justify-between gap-3">
              <div>
                <p
                  id="resultado-total-taxa"
                  className={`font-headline font-extrabold transition-all duration-300 ${
                    hasResult
                      ? 'text-3xl text-amber-600 dark:text-amber-400'
                      : 'text-2xl text-on-surface-variant/40'
                  }`}
                >
                  {hasResult
                    ? `R$ ${totalTaxa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : 'R$ —'}
                </p>
                {hasResult && (
                  <p className="text-xs text-on-surface-variant mt-1">
                    (Desconto ÷ 75%) − Desconto
                  </p>
                )}
              </div>
            </div>
          </div>

          {hasResult && (
            <div className="px-5 py-3 bg-amber-500/5 border-t border-amber-500/15 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-[16px]">receipt_long</span>
              <p className="text-xs text-on-surface-variant">
                Taxa total de{' '}
                <strong className="text-amber-600 dark:text-amber-400">
                  R$ {totalTaxa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>{' '}
                sobre o desconto concedido.
              </p>
            </div>
          )}
        </section>

        {/* Taxa BuyHelp + Taxa Credenciado */}
        <div className="grid grid-cols-2 gap-3">

          {/* Taxa BuyHelp */}
          <section
            className={`rounded-2xl overflow-hidden shadow-soft transition-all duration-300 ${
              hasResult
                ? 'bg-blue-500/10 border border-blue-500/25 opacity-100'
                : 'bg-surface-container-lowest border border-transparent opacity-60'
            }`}
          >
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="material-symbols-outlined text-blue-500 text-[16px]">storefront</span>
                <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Taxa BuyHelp
                </p>
              </div>
              <p
                id="resultado-taxa-buyhelp"
                className={`font-headline font-extrabold transition-all duration-300 ${
                  hasResult
                    ? 'text-xl text-blue-600 dark:text-blue-400'
                    : 'text-lg text-on-surface-variant/40'
                }`}
              >
                {hasResult
                  ? `R$ ${taxaBuyHelp.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : 'R$ —'}
              </p>
              {hasResult && (
                <p className="text-[10px] text-on-surface-variant mt-1">Total Taxa × 60%</p>
              )}
            </div>
          </section>

          {/* Taxa Credenciado */}
          <section
            className={`rounded-2xl overflow-hidden shadow-soft transition-all duration-300 ${
              hasResult
                ? 'bg-emerald-500/10 border border-emerald-500/25 opacity-100'
                : 'bg-surface-container-lowest border border-transparent opacity-60'
            }`}
          >
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="material-symbols-outlined text-emerald-500 text-[16px]">badge</span>
                <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Taxa Credenciado
                </p>
              </div>
              <p
                id="resultado-taxa-credenciado"
                className={`font-headline font-extrabold transition-all duration-300 ${
                  hasResult
                    ? 'text-xl text-emerald-600 dark:text-emerald-400'
                    : 'text-lg text-on-surface-variant/40'
                }`}
              >
                {hasResult
                  ? `R$ ${taxaCredenciado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : 'R$ —'}
              </p>
              {hasResult && (
                <p className="text-[10px] text-on-surface-variant mt-1">Total Taxa × 40%</p>
              )}
            </div>
          </section>

        </div>

      </main>

      <BottomNav />
    </div>
  )
}
