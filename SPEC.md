# SPEC.md — BuyHelp LeadCapture Design Spec

> Documento spec-driven de design e componentes. Use como referência autoritativa para gerar, revisar ou refatorar qualquer tela do app.

---

## 1. Visão Geral do Produto

**BuyHelp LeadCapture** é um app mobile nativo (Capacitor + React) para captura de leads em eventos presenciais. Funciona 100% offline e sincroniza com PocketBase quando há conexão.

| Atributo         | Valor                                              |
|------------------|----------------------------------------------------|
| Plataforma       | Android (.apk) + iOS (.ipa) via Capacitor          |
| Usuários         | Até 10 internos da BuyHelp                         |
| Backend          | PocketBase no Fly.io                               |
| Armazenamento    | SQLite nativo no dispositivo                       |
| Offline-first    | Sim — salva local, sincroniza ao reconectar        |
| Admin web        | Sim — painel web para gestão de eventos e leads    |

---

## 2. Design Tokens

### 2.1 Paleta de Cores

#### Primária (Laranja — ação, destaque, CTA)
| Token                        | Hex       | Uso                                      |
|------------------------------|-----------|------------------------------------------|
| `primary`                    | `#ab3500` | Ícones, links, bordas de foco            |
| `primary-container`          | `#ff6b35` | Gradiente CTA início                     |
| `primary-fixed`              | `#ffdbd0` | Background de dicas / banners suaves     |
| `primary-fixed-dim`          | `#ffb59d` | Badges suaves                            |
| `on-primary`                 | `#ffffff` | Texto sobre botões laranja               |
| `on-primary-fixed`           | `#390c00` | Texto sobre `primary-fixed`              |
| `on-primary-fixed-variant`   | `#832600` | Variante de texto em áreas laranja       |

**Gradiente CTA:** `linear-gradient(135deg, #FF6B35, #FF8C42)`
**Sombra CTA:** `0 8px 24px rgba(255, 107, 53, 0.35)`

#### Secundária (Roxo/Azul — texto principal, superfícies)
| Token                          | Hex       | Uso                                    |
|--------------------------------|-----------|----------------------------------------|
| `on-secondary-fixed`           | `#1a1a2e` | Texto de headline / títulos            |
| `on-secondary-fixed-variant`   | `#45455b` | Texto secundário                       |
| `on-secondary-container`       | `#63627a` | Labels, placeholders                   |

#### Terciária (Verde — sucesso, online, sincronizado)
| Token                | Hex       | Uso                               |
|----------------------|-----------|-----------------------------------|
| `tertiary`           | `#006c49` | Ícone `cloud_done`                |
| `tertiary-container` | `#00af79` | Gradiente de estado salvo         |
| `on-tertiary`        | `#ffffff` | Texto sobre verde                 |

**Gradiente Salvo:** `linear-gradient(135deg, #006c49, #00af79)`
**Sombra Salvo:** `0 8px 24px rgba(0,175,121,0.35)`

#### Superfícies (Backgrounds e Cards)
| Token                        | Hex       | Uso                                     |
|------------------------------|-----------|-----------------------------------------|
| `surface`                    | `#f9f9ff` | Background padrão do app                |
| `surface-container-low`      | `#f0f3ff` | Background de páginas principais        |
| `surface-container-lowest`   | `#ffffff` | Cards, modais, inputs                   |
| `surface-container`          | `#e7eefe` | Chips, toggle selecionado               |
| `surface-container-high`     | `#e2e8f8` | Badges "Encerrado"                      |
| `surface-container-highest`  | `#dce2f3` | Separadores, borders                    |
| `on-surface`                 | `#151c27` | Texto padrão                            |
| `on-surface-variant`         | `#594139` | Texto de suporte / metadados            |

#### Erro
| Token              | Hex       | Uso                   |
|--------------------|-----------|-----------------------|
| `error`            | `#ba1a1a` | Mensagens de erro     |
| `error-container`  | `#ffdad6` | Background de erro    |

#### Outros
| Token              | Hex       | Uso                           |
|--------------------|-----------|-------------------------------|
| `outline`          | `#8d7168` | Bordas de input               |
| `outline-variant`  | `#e1bfb5` | Bordas de header glass        |

### 2.2 Tipografia

| Família          | Fonte              | Uso                                        |
|------------------|--------------------|--------------------------------------------|
| `font-headline`  | Plus Jakarta Sans  | Títulos, botões CTA, nomes de eventos      |
| `font-body`      | Be Vietnam Pro     | Corpo de texto, inputs, parágrafos         |
| `font-label`     | Be Vietnam Pro     | Labels de campo, badges uppercase, stats   |

**Pesos utilizados:** 400 (regular), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold)

**Padrões de label de campo:**
```
text-xs font-bold uppercase tracking-widest text-on-secondary-fixed ml-1
```

### 2.3 Border Radius

| Classe   | Valor   | Uso                               |
|----------|---------|-----------------------------------|
| `xl`     | 0.75rem | Inputs, botões secundários        |
| `2xl`    | 1rem    | Cards de lista, filtros           |
| `3xl`    | 1.5rem  | Cards principais, modal           |
| `4xl`    | 2rem    | Cards hero (não usado ainda)      |
| `full`   | 9999px  | Badges, FAB, avatares             |

### 2.4 Sombras

| Classe        | Valor                                    | Uso                         |
|---------------|------------------------------------------|-----------------------------|
| `shadow-soft` | `0 4px 20px rgba(0,0,0,0.08)`           | Cards de lista              |
| `shadow-float`| `0 8px 32px rgba(26,26,46,0.06)`        | Cards hero, modais          |
| `shadow-cta`  | `0 8px 24px rgba(255,107,53,0.35)`      | Botão CTA laranja           |

### 2.5 Efeito Glass (Header)

```css
background: rgba(255,255,255,0.8);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border-bottom: 1px solid rgba(225,191,181,0.15);
```

---

## 3. Ícones

**Biblioteca:** Material Symbols Outlined (carregado via CDN em `index.html`)

**Uso padrão:**
```jsx
<span className="material-symbols-outlined">icon_name</span>
// Preenchido:
<span className="material-symbols-outlined icon-filled">icon_name</span>
```

**Tamanhos:**
- `text-[16px]` — Metadados, indicadores secundários
- `text-[18px]` — Ícones em botões pequenos
- `text-[20px]` — Ícones em inputs
- `text-[22px]` — Ícones de header
- `text-[24px]` / padrão — Navegação, FAB
- `text-[28px]` — FAB principal
- `text-3xl` / `text-4xl` — Loading spinner, empty states

**Ícones usados no projeto:**
| Ícone                    | Onde                                  |
|--------------------------|---------------------------------------|
| `rocket_launch`          | Logo BuyHelp (filled)                 |
| `cloud_done`             | Online + sincronizado (filled)        |
| `cloud_off`              | Offline / não sincronizado            |
| `logout`                 | Botão de sair                         |
| `arrow_forward`          | Botão CTA                             |
| `arrow_back`             | Voltar                                |
| `event`                  | Evento em breve                       |
| `event_busy`             | Sem eventos                           |
| `history`                | Evento encerrado                      |
| `location_on`            | Localização                           |
| `calendar_today`         | Data                                  |
| `person`                 | Contagem de leads                     |
| `person_search`          | Empty state de leads                  |
| `hourglass_empty`        | Pendente de sync                      |
| `sync`                   | Loading / sincronizar (animate-spin)  |
| `search`                 | Campo de busca                        |
| `close`                  | Limpar busca                          |
| `add`                    | FAB de novo lead                      |
| `save`                   | Salvar lead offline                   |
| `check_circle`           | Lead salvo com sucesso (filled)       |
| `local_fire_department`  | Qualificação Quente                   |
| `thermostat`             | Qualificação Morno                    |
| `ac_unit`                | Qualificação Frio                     |
| `lightbulb`              | Dica offline (filled)                 |
| `badge`                  | Capturado por                         |
| `group`                  | Contagem de leads no admin            |
| `mail`                   | Campo e-mail                          |
| `lock`                   | Campo senha                           |
| `visibility`             | Mostrar senha                         |
| `visibility_off`         | Ocultar senha                         |
| `smartphone`             | Campo WhatsApp                        |
| `corporate_fare`         | Campo empresa                         |
| `work`                   | Campo cargo                           |
| `edit`                   | Editar evento (admin)                 |
| `delete`                 | Excluir evento (admin)                |

---

## 4. Componentes

### 4.1 Header Mobile (Glass)

```
┌─────────────────────────────────────┐
│ 🚀 BuyHelp              cloud  exit │  h-16, fixed top-0
└─────────────────────────────────────┘
```

**Spec:**
- `fixed top-0 left-0 right-0 z-50 h-16`
- `flex items-center justify-between px-6`
- `max-w-lg mx-auto`
- Background glass: rgba branco 0.8 + blur(12px)
- Borda inferior: `1px solid rgba(225,191,181,0.15)`

**Variante com voltar (CaptureScreen):**
```
┌─────────────────────────────────────┐
│ ← Nome do Evento          ABREV     │
└─────────────────────────────────────┘
```
- Barra de 4px laranja no topo: `fixed top-0 h-1 bg-primary-gradient z-[60]`
- Header com `marginTop: 4`

### 4.2 BottomNav

```
┌───────────┬───────────┬───────────┐
│   home    │  capture  │   leads   │
│   (icon)  │  (icon)   │   (icon)  │
│   Início  │  Capturar │   Leads   │
└───────────┴───────────┴───────────┘
```

**Spec:**
- `fixed bottom-0 left-0 right-0 z-50`
- Background glass (rgba 0.9 + blur)
- 3 itens: `/home` (home), `/capture` (add_circle), `/leads` (group)
- Item ativo: cor `primary`, ícone filled
- Item inativo: cor `on-surface-variant`
- `pb-safe` para iOS home indicator
- `max-w-lg mx-auto`

### 4.3 OfflineBanner

```
┌─────────────────────────────────────────┐
│  wifi_off  Sem conexão – modo offline   │  amarelo
└─────────────────────────────────────────┘
```

**Spec:**
- Aparece quando `!isOnline`
- `fixed` abaixo do header (top-16)
- Background âmbar com ícone e texto
- Anima entrada com slide-down

### 4.4 Botão CTA Principal

```
┌─────────────────────────────────────┐
│   ► Capturar Leads / Salvar Lead    │  laranja gradiente
└─────────────────────────────────────┘
```

**Spec:**
```jsx
className="w-full py-4 rounded-xl text-white font-headline font-bold shadow-cta active:scale-[0.98] transition-all"
style={{ background: 'linear-gradient(135deg, #FF6B35, #FF8C42)' }}
```

**Estados:**
- Default: gradiente laranja + shadow-cta
- Saving: ícone `sync` animate-spin + "Salvando..."
- Saved: gradiente verde + ícone `check_circle` + "Lead Salvo!"
- Disabled: `opacity-70`

### 4.5 Card de Evento Ativo (Hero Card)

```
┌────────────────────────────────────────┐
│▓▓ (barra laranja 6px)                  │
│                                        │
│  Nome do Evento              • AO VIVO │
│  📍 Local                              │
│  📅 Data início → Data fim             │
│                                        │
│  👤 42 leads  [2 pendentes]            │
│                                        │
│  [ ► Capturar Leads                 ] │
└────────────────────────────────────────┘
```

**Spec:**
- `bg-surface-container-lowest rounded-3xl overflow-hidden shadow-soft`
- Barra topo: `h-1.5 bg-primary-gradient`
- Padding: `p-6 space-y-5`
- Badge AO VIVO: `bg-emerald-50 text-emerald-600 rounded-full` + dot `animate-pulse`
- Badge pendentes: `bg-primary-fixed text-primary rounded-xl`

### 4.6 Card de Evento (Lista)

```
┌────────────────────────────────────────┐
│ [icon 48px]  Nome do Evento  [EM BREVE]│
│              dd/mm/aaaa · Local        │
└────────────────────────────────────────┘
```

**Spec:**
- `bg-surface-container-lowest rounded-2xl p-4 gap-4 shadow-soft`
- Ícone container: `w-12 h-12 rounded-xl`
- Status badges:
  - `EM BREVE`: background `#FFF5E9`, texto `#FF8C42`
  - `ATIVO`: `bg-emerald-50 text-emerald-600`
  - `Encerrado`: `bg-surface-container-high text-on-surface-variant` + `opacity-50` no card
- `active:scale-[0.98] transition-all`

### 4.7 Card de Lead

```
┌────────────────────────────────────────┐
│ 🔥 Quente  ☁️                          │  badge temp + sync icon
│ Nome Completo                    12/03 │
│ Cargo · Empresa                 Evento │
│ email@exemplo.com                      │
│ (11) 99999-9999                        │
│                                        │
│ 🏷 por Nome do Capturador              │
│ ┌──────────────────────────────────┐   │
│ │ Observações do lead...           │   │
│ └──────────────────────────────────┘   │
└────────────────────────────────────────┘
```

**Spec:**
- `bg-surface-container-lowest rounded-2xl p-4 shadow-soft`
- Temperatura badges: red/amber/blue 50 + respectivo 600
- Ícone sync: `cloud_done` filled verde ou `cloud_off` cinza
- Notas: `bg-surface-container-low rounded-lg px-3 py-2 line-clamp-2`

### 4.8 Campo de Input

```
┌────────────────────────────────────────┐
│ LABEL *                                │
│ [icon]  Placeholder...                 │
└────────────────────────────────────────┘
```

**Spec:**
```
label: text-xs font-bold text-on-secondary-fixed uppercase tracking-widest ml-1
input: pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-xl
       focus:ring-1 focus:ring-primary/30 focus:bg-surface-container-lowest
       transition-all placeholder:text-on-surface-variant/40 font-body text-sm outline-none
ícone: absolute left-4 top-1/2 -translate-y-1/2 text-on-secondary-container
       group-focus-within:text-primary transition-colors text-[20px]
```

### 4.9 Qualificação de Lead (Temperature)

```
┌──────────┬──────────┬──────────┐
│ 🔥       │ ♨️       │ ❄️       │
│ Quente   │ Morno    │ Frio     │
└──────────┴──────────┴──────────┘
```

**Spec:**
- `grid grid-cols-3 gap-3`
- Cada botão: `flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all`
- Inativo: `bg-surface-container-low border-transparent`
- Ativo Quente: `bg-red-50 border-red-400 text-red-700 scale-[1.03] shadow-sm`
- Ativo Morno: `bg-amber-50 border-amber-400 text-amber-700 scale-[1.03] shadow-sm`
- Ativo Frio: `bg-blue-50 border-blue-400 text-blue-700 scale-[1.03] shadow-sm`
- Ícone filled quando selecionado

### 4.10 Stats Grid (3 colunas)

```
┌──────────┬──────────┬──────────┐
│    42    │    40    │     2    │
│  TOTAL   │ SINCRON. │ PENDENTE │
└──────────┴──────────┴──────────┘
```

**Spec:**
- `grid grid-cols-3 gap-3`
- Card: `bg-surface-container-lowest rounded-2xl p-4 shadow-soft text-center`
- Número: `font-headline font-bold text-2xl`
- Total: `text-on-secondary-fixed`
- Sincron.: `text-tertiary`
- Pendente: `text-primary`
- Label: `font-label text-[11px] text-on-surface-variant uppercase tracking-wider mt-0.5`

### 4.11 Filtro Toggle (Pills)

```
┌────────────────────────────────────────┐
│  [Todos]  [Pendentes]  [Sincronizados] │
└────────────────────────────────────────┘
```

**Spec:**
- Container: `flex p-1 bg-surface-container-low rounded-2xl`
- Item ativo: `bg-surface-container-lowest shadow-sm text-on-secondary-fixed font-bold rounded-xl py-2.5`
- Item inativo: `text-on-secondary-container`

### 4.12 Campo de Busca

```
┌────────────────────────────────────────┐
│ 🔍  Buscar por nome, email...      [x] │
└────────────────────────────────────────┘
```

**Spec:**
- `w-full pl-10 pr-4 py-3 bg-surface-container-lowest rounded-2xl`
- `focus:ring-2 focus:ring-primary/30 border border-transparent focus:border-primary/20`
- Ícone `close` aparece quando há texto

### 4.13 FAB (Floating Action Button)

```
      ┌──────┐
      │  +   │  ← fixed bottom-24 right-6
      └──────┘
```

**Spec:**
- `fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full text-white`
- Background: gradiente laranja
- `shadow-cta active:scale-95 transition-all`

### 4.14 Banner de Dica (Offline-first)

```
┌────────────────────────────────────────┐
│ [💡]  Funciona online e offline...     │
└────────────────────────────────────────┘
```

**Spec:**
- `bg-primary-fixed p-5 rounded-3xl flex gap-4 items-start border border-primary/10`
- Ícone container: `bg-white p-2 rounded-xl shadow-sm`
- Texto: `text-sm font-medium text-on-primary-fixed leading-relaxed`

### 4.15 Empty State

```
         ┌──────────────┐
         │  (ícone 5xl) │  bg-surface-container-low rounded-full p-6
         └──────────────┘
         
         Nenhum lead encontrado
         Capture o primeiro lead!
         
         [  Capturar Lead  ]
```

**Spec:**
- `flex flex-col items-center gap-4 py-16`
- Ícone container: `bg-surface-container-low p-6 rounded-full`
- Título: `font-headline font-bold text-on-secondary-fixed`
- Subtítulo: `text-on-surface-variant text-sm mt-1`

### 4.16 Loading State

```
         ↻  (text-primary text-4xl animate-spin)
```

**Spec:**
- `flex justify-center py-16`
- Ícone `sync` com `animate-spin text-primary text-4xl`

### 4.17 Section Label (Eyebrow)

```
EVENTO ATIVO
```

**Spec:**
```
font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant
```

---

## 5. Telas

### 5.1 LoginScreen (`/login`)

**Layout:**
```
┌─────────────────────────────────────┐
│                                     │
│  ┌─────────────────────────────┐    │  h-280px gradiente laranja
│  │  🚀 BuyHelp                 │    │  rounded-b-[32px]
│  │   LeadCapture               │    │
│  │   Capture leads em eventos  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │  card -mt-10 z-10
│  │  Bem-vindo!                 │    │
│  │  Acesse sua conta...        │    │
│  │                             │    │
│  │  [📧] E-mail                │    │
│  │  [🔒] Senha        [👁️]    │    │
│  │                             │    │
│  │  [erro se houver]           │    │
│  │                             │    │
│  │  [    Entrar    ]           │    │  CTA laranja
│  └─────────────────────────────┘    │
│                                     │
│  BuyHelp Leads v1.2 · url          │
└─────────────────────────────────────┘
```

**Estados:**
- Loading: botão mostra `sync` animate-spin + "Entrando..."
- Erro de rede: mensagem com URL do servidor
- Erro de credenciais: mensagem genérica de erro

**Regras:**
- Sem BottomNav
- Campo senha tem toggle show/hide
- Sem link "Esqueci a senha" (app interno)
- Versão e URL do PB no rodapé

---

### 5.2 HomeScreen (`/home`)

**Layout:**
```
[Header glass: 🚀 BuyHelp | cloud_done + logout]
[OfflineBanner se offline]

  Olá, {nome} 👋
  Selecione um evento para capturar leads

  EVENTO ATIVO
  ┌─────────────────────────────────────┐
  │▓▓ (barra laranja)                   │
  │ Nome do Evento          • AO VIVO   │
  │ 📍 Local                            │
  │ 📅 Data início → Data fim           │
  │                                     │
  │ 👤 42 leads  [2 pendentes]          │
  │                                     │
  │ [     ► Capturar Leads           ]  │
  └─────────────────────────────────────┘

  OUTROS EVENTOS
  ┌─────────────────────────────────────┐
  │ [📅]  Evento 2    dd/mm · local  EM BREVE│
  └─────────────────────────────────────┘
  ┌─────────────────────────────────────┐
  │ [🕐]  Evento 3    dd/mm · local  Encerrado│
  └─────────────────────────────────────┘

[BottomNav]
```

**Estados do evento ativo:**
- Loading: card com `sync animate-spin` centralizado
- Sem evento: empty state com link para `/admin`
- Com evento: hero card completo

**Status de eventos:**
- `active`: dentro do período (start ≤ hoje ≤ end) → badge AO VIVO verde pulsante
- `soon`: antes do início → badge EM BREVE âmbar
- `closed`: após o fim → badge Encerrado cinza + card com opacity-50

**Lógica de seleção do evento ativo:**
1. Primeiro evento com status `active`
2. Se nenhum ativo, primeiro `soon`
3. Se nenhum, primeiro da lista

**Cache offline:** Carrega `buyhelp_events_cache` do localStorage imediatamente, depois busca da API se online.

---

### 5.3 CaptureScreen (`/capture`)

**Layout:**
```
[Barra laranja 4px no topo absoluto]
[Header glass: ← {Nome do Evento} | {Abrev}]
[OfflineBanner se offline]

  [🟠 Badge modo offline, se offline]

  Captura de
  Leads (primary color)

  [💡 Banner dica offline-first]

  ┌─────────────────────────────────────┐
  │ Dados do Lead                       │
  │ Preencha as informações coletadas   │
  │                                     │
  │ NOME COMPLETO *                     │
  │ [👤] Nome do visitante              │
  │                                     │
  │ E-MAIL                              │
  │ [📧] email@exemplo.com              │
  │                                     │
  │ WHATSAPP                            │
  │ [📱] (00) 00000-0000                │
  │                                     │
  │ EMPRESA                             │
  │ [🏢] Nome da empresa                │
  │                                     │
  │ CARGO                               │
  │ [💼] Ex: Gerente Comercial          │
  │                                     │
  │ QUALIFICAÇÃO DO LEAD                │
  │ ┌────────┬────────┬────────┐        │
  │ │ 🔥     │ ♨️     │ ❄️     │        │
  │ │ Quente │ Morno  │ Frio   │        │
  │ └────────┴────────┴────────┘        │
  │                                     │
  │ OBSERVAÇÕES                         │
  │ ┌─────────────────────────────┐     │
  │ │ Detalhes da conversa...     │     │
  │ └─────────────────────────────┘     │
  │                                     │
  │ [erro se houver]                    │
  │                                     │
  │ [   💾 Salvar Lead / Offline    ]   │
  └─────────────────────────────────────┘

[BottomNav]
```

**Estados do botão salvar:**
| Estado   | Visual                                     |
|----------|--------------------------------------------|
| Default  | Gradiente laranja + "Salvar Lead"          |
| Offline  | Gradiente laranja + "💾 Salvar Offline"    |
| Saving   | `sync` animate-spin + "Salvando..."        |
| Saved    | Gradiente verde + `check_circle` + "Lead Salvo!" |

**Após salvar (1,5s):**
- Reseta todos os campos
- Volta ao estado default
- Temperatura padrão: `warm`

**Máscara de telefone:**
- ≤10 dígitos: `(XX) XXXX-XXXX`
- 11 dígitos: `(XX) XXXXX-XXXX`

**Regras de validação:**
- Nome: obrigatório — exibe erro inline se vazio

---

### 5.4 LeadsScreen (`/leads`)

**Layout:**
```
[Header glass: Leads Capturados | [badge pendentes] [sync]]

  ┌──────────┬──────────┬──────────┐
  │    42    │    40    │     2    │
  │  TOTAL   │ SINCRON. │ PENDENTE │
  └──────────┴──────────┴──────────┘

  [Banner: ☁️ Exibindo todos... | Ver local]  ← só quando source=remote

  [🔍 Buscar por nome, email, telefone ou empresa...]

  [Todos] [Pendentes] [Sincronizados]  ← só quando source=local

  ┌────────────────────────────────────┐
  │ 🔥 Quente  ☁️                      │
  │ João Silva                  12/03  │
  │ Gerente · Acme Corp     Evento X   │
  │ joao@acme.com                      │
  │ (11) 99999-0000                    │
  │ 🏷 por Maria                       │
  │ ┌────────────────────────────┐     │
  │ │ Interessado no produto X   │     │
  │ └────────────────────────────┘     │
  └────────────────────────────────────┘
  ... (mais cards)

[FAB +]
[BottomNav]
```

**Fontes de dados:**
- `local` (padrão): SQLite do dispositivo — mostra filtro de status
- `remote`: PocketBase — após sync, exibe banner verde

**Fluxo de sync:**
1. Usuário toca `sync` no header
2. `syncPendingLeads()` — envia pendentes para PocketBase
3. `loadRemote()` — busca todos os leads do servidor
4. Stats mostram contagem remota

**Busca:** filtra por name, email, phone, company (case-insensitive)

---

### 5.5 AdminLoginScreen (`/admin/login`)

Visual semelhante ao LoginScreen, mas sem o layout hero. Usa credenciais de admin separadas.

---

### 5.6 AdminEventsScreen (`/admin`)

**Layout (web, max-w-5xl):**
```
[Header branco: Logo BuyHelp Admin | Sair]

  Eventos                    [+ Novo Evento]
  3 eventos

  ┌────────────┐  ┌────────────┐  ┌────────────┐
  │ • Ativo    │  │ ○ Inativo  │  │ • Ativo    │
  │ Nome Evento│  │ Nome Evento│  │ Nome Evento│
  │            │  │            │  │            │
  │ 📅 Datas   │  │ 📅 Datas   │  │ 📅 Datas   │
  │ 📍 Local   │  │ 📍 Local   │  │ 📍 Local   │
  │            │  │            │  │            │
  │ ─────────  │  │ ─────────  │  │ ─────────  │
  │ 👥 42 leads│  │ 👥 0 leads │  │ 👥 8 leads │
  │ Ver leads→ │  │ Ver leads→ │  │ Ver leads→ │
  └────────────┘  └────────────┘  └────────────┘
```

**Grid:** `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`

**Card de evento (admin):**
- `bg-white rounded-2xl shadow-sm border border-gray-100 p-5`
- Badge ativo: `bg-emerald-50 text-emerald-600` + dot pulsante
- Badge inativo: `bg-gray-100 text-gray-500`
- Ações: edit (azul) + delete (vermelho) — hover reveal

**Modal criar/editar:**
```
┌───────────────────────────────────────┐
│ Novo Evento                           │
│                                       │
│ NOME *                                │
│ [Ex: ExpoVarejo 2026              ]   │
│                                       │
│ DATA INÍCIO      DATA FIM             │
│ [date picker ]   [date picker ]       │
│                                       │
│ STATUS (calculado automaticamente)    │
│ [● Ativo — hoje está no período  ]    │
│                                       │
│ LOCAL                                 │
│ [Cidade - UF                      ]   │
│                                       │
│ DESCRIÇÃO                             │
│ ┌───────────────────────────────┐     │
│ │ Detalhes do evento...         │     │
│ └───────────────────────────────┘     │
│                                       │
│ [Cancelar]           [Salvar]         │
└───────────────────────────────────────┘
```

**Overlay:** `bg-black/40 fixed inset-0 z-50`
**Card modal:** `bg-white rounded-2xl shadow-2xl w-full max-w-md p-6`

---

### 5.7 AdminEventLeadsScreen (`/admin/eventos/:id`)

Lista de leads de um evento específico, com filtros e exportação. Visual similar ao LeadsScreen mas em contexto web/admin.

---

## 6. Padrões de Interação

### 6.1 Touch Feedback
```
active:scale-[0.98] transition-all   — cards clicáveis, botões
active:scale-95                      — botões menores (FAB, nav)
```

### 6.2 Animações
- Loading: `animate-spin` no ícone `sync`
- Badge online: `animate-pulse` no dot verde
- Transições: `transition-all` + `transition-colors` para mudanças de estado

### 6.3 Safe Areas (Mobile)
```css
env(safe-area-inset-top)     /* notch iOS */
env(safe-area-inset-bottom)  /* home indicator iOS */
```
- Header fixo: `h-16` + considera safe area no topo
- BottomNav: adiciona `padding-bottom: env(safe-area-inset-bottom)`
- Main content: `pb-24` (altura BottomNav) ou `pb-44` (BottomNav + FAB)

### 6.4 Touch Targets Mínimos
```css
button, input, select, textarea, a { min-height: 44px; }
```

### 6.5 Scroll
- `min-h-dvh` (dynamic viewport height — correto para mobile)
- `overflow-x: hidden` no body
- `scroll-padding-bottom: 120px` para scroll com teclado virtual

---

## 7. Fluxo de Navegação

```
/login
  └── [autenticado] → /home
        ├── [toca evento] → /capture
        │     └── [volta] → /home
        └── [nav] → /leads
              └── [FAB +] → /capture

/admin/login
  └── [autenticado admin] → /admin
        └── [Ver leads] → /admin/eventos/:id
```

**Guards:**
- `ProtectedRoute`: verifica `pb.authStore.isValid` → redireciona `/login`
- `AdminRoute`: verifica `localStorage['pocketbase_auth'].token` → redireciona `/admin/login`

---

## 8. Dados e Modelos

### Lead (SQLite local)
```
id           TEXT PRIMARY KEY
name         TEXT NOT NULL
email        TEXT
phone        TEXT
company      TEXT
role         TEXT
temperature  TEXT  -- 'hot' | 'warm' | 'cold'
notes        TEXT
event_name   TEXT
event_id     TEXT
captured_by  TEXT
device_id    TEXT
created      TEXT  -- ISO datetime
synced       INTEGER  -- 0 | 1
```

### Event (PocketBase)
```
id           string (auto)
name         string (required)
date_start   date
date_end     date
location     string
description  string
```

### Lead (PocketBase — sincronizado)
```
id           string
name         string
email        string
phone        string
company      string
role         string
temperature  string
notes        string
event_name   string
event_id     string
captured_by  string
device_id    string
created      datetime
```

---

## 9. Regras de Design — Resumo Rápido

| Regra                                | Detalhe                                        |
|--------------------------------------|------------------------------------------------|
| Fonte de títulos                     | Plus Jakarta Sans (font-headline)              |
| Fonte de corpo                       | Be Vietnam Pro (font-body / font-label)        |
| Cor de ação principal                | `#FF6B35 → #FF8C42` (gradiente)                |
| Fundo de página                      | `#f0f3ff` (surface-container-low)              |
| Fundo de card/input                  | `#ffffff` (surface-container-lowest)           |
| Texto de título                      | `#1a1a2e` (on-secondary-fixed)                 |
| Texto de suporte                     | `#594139` (on-surface-variant)                 |
| Border radius padrão de card         | `rounded-2xl` (1rem) ou `rounded-3xl` (1.5rem) |
| Padding de card                      | `p-4` (lista) ou `p-6` (hero)                  |
| Max width (mobile)                   | `max-w-lg mx-auto w-full`                      |
| Touch feedback                       | `active:scale-[0.98] transition-all`           |
| Ícones                               | Material Symbols Outlined                      |
| Fontes bundled                       | Sim — funcionam 100% offline                   |
| Scroll padding teclado               | `scroll-padding-bottom: 120px`                 |

---

## 10. Convenções de Código

### Estrutura de tela
```jsx
export default function XxxScreen() {
  // 1. hooks (navigate, location, context)
  // 2. estado local (useState)
  // 3. efeitos (useEffect)
  // 4. handlers (async functions)
  // 5. computed values (filtros, derivados)
  // 6. return JSX
}
```

### Componentes auxiliares na mesma tela
- Componentes simples (Field, etc.) ficam no mesmo arquivo, abaixo do export default
- Só extrair para componente separado quando reutilizado em ≥2 telas

### Classes Tailwind — ordem preferida
1. Layout (flex, grid, position)
2. Tamanho (w, h, min, max)
3. Espaçamento (p, m, gap)
4. Visual (bg, text, border, rounded, shadow)
5. Estados (hover, active, focus, disabled)
6. Animações (transition, animate)
