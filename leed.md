# leed.md — Guia de Design para Claude: Editorial Lead Capture

> Use este arquivo como referência de sistema de design ao gerar interfaces, componentes ou páginas de captura de leads. O Claude deve seguir todas as diretrizes abaixo para produzir resultados com qualidade editorial premium.

---

## 📱 Plataforma: Aplicativo Mobile Nativo — Android & iPhone

Este aplicativo é um **app nativo instalável via arquivo** (.apk no Android e .ipa no iPhone) para uso interno da **BuyHelp**. Não roda em browser — é instalado diretamente no celular como qualquer app. Atende até **10 usuários internos** com captura de leads offline-first e sincronização automática com o backend.

### Contexto de Uso — BuyHelp
- **Usuários:** até 10 usuários internos
- **Volume estimado:** centenas de leads/mês — baixo volume, alta confiabilidade
- **Distribuição:** arquivo `.apk` para Android + arquivo `.ipa` para iPhone — enviado por WhatsApp, e-mail ou link direto
- **Sem lojas:** não precisa de Google Play nem App Store
- **Prioridade:** app nativo real, funciona 100% offline, sincroniza quando tem internet

---

### Stack Recomendada — Capacitor (React + Nativo)

A tecnologia escolhida é o **Capacitor** (da Ionic), que compila o código React em um app nativo real para Android e iOS — gerando `.apk` e `.ipa` a partir do mesmo código.

| Camada              | Tecnologia                              | Motivo                                                         |
|---------------------|-----------------------------------------|----------------------------------------------------------------|
| UI / Lógica         | **React + Vite**                        | Mesmo código para Android e iPhone                             |
| Compilador nativo   | **Capacitor**                           | Gera `.apk` (Android) e `.ipa` (iPhone) a partir do React     |
| Armazenamento local | **@capacitor-community/sqlite**         | SQLite nativo no dispositivo — mais robusto que IndexedDB      |
| Backend             | **PocketBase** (Fly.io)                 | Banco + auth + API REST em um único binário — ~$5/mês          |
| Banco remoto        | **SQLite** embutido no PocketBase       | Suficiente para 10 usuários e milhares de leads                |
| Detecção de rede    | **@capacitor/network**                  | Plugin nativo para detectar conectividade (mais confiável)     |
| Fontes              | Embutidas no bundle do app              | Funciona sem internet, sem dependência de CDN                  |

> **Por que Capacitor e não React Native?**
> O Capacitor usa HTML/CSS/React puro — o mesmo código do design system deste documento. O React Native tem sua própria camada de UI que ignora CSS. Para manter o visual editorial do `leed.md`, Capacitor é a escolha certa.

---

### Por que PocketBase e não Supabase para a BuyHelp?

| Critério             | PocketBase + Fly.io             | Supabase Cloud                  |
|----------------------|---------------------------------|---------------------------------|
| **Custo mensal**     | ~$5 (Fly.io + volume)           | Grátis até 500MB, depois $25/mês|
| **Gestão**           | Zero — 1 binário rodando        | Gerenciado pela Supabase        |
| **Painel admin**     | ✅ Embutido em `/pb/_/`         | ✅ Dashboard online             |
| **Auth de usuários** | ✅ Nativo                       | ✅ Nativo                       |
| **API REST**         | ✅ Gerada automaticamente       | ✅ Gerada automaticamente       |
| **Capacidade**       | Milhões de registros (SQLite)   | PostgreSQL escalável            |
| **Vendor lock-in**   | ❌ Nenhum                       | Médio                           |
| **MCP para Claude**  | ✅ Via `fly mcp server --claude` | ✅ Via Supabase MCP             |

> **Regra de migração:** Se usuários passarem de 50 ou volume de leads explodir, migrar para Supabase ou Fly Postgres. A lógica offline do app **não muda** — só troca a connection string do backend.

---

### Como gerar os instaladores

#### Setup inicial do projeto

```bash
# 1. Criar o projeto React + Vite
npm create vite@latest buyhelp-leads -- --template react
cd buyhelp-leads
npm install

# 2. Instalar o Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init "BuyHelp Leads" "com.buyhelp.leads" --web-dir dist

# 3. Instalar plugins nativos necessários
npm install @capacitor/android @capacitor/ios
npm install @capacitor/network              # detecta online/offline
npm install @capacitor-community/sqlite      # banco local nativo

# 4. Adicionar plataformas
npx cap add android
npx cap add ios
```

```json
// capacitor.config.json
{
  "appId": "com.buyhelp.leads",
  "appName": "BuyHelp Leads",
  "webDir": "dist",
  "server": {
    "androidScheme": "https"
  },
  "plugins": {
    "CapacitorSQLite": {
      "iosDatabaseLocation": "Library/CapacitorDatabase"
    }
  }
}
```

---

#### 📱 Gerar o `.apk` para Android

**Pré-requisito:** Android Studio instalado ([developer.android.com/studio](https://developer.android.com/studio))

```bash
# 1. Build do React
npm run build

# 2. Sincronizar com o projeto Android
npx cap sync android

# 3. Abrir no Android Studio
npx cap open android
```

No Android Studio:
1. Menu **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. O arquivo `.apk` será gerado em `android/app/build/outputs/apk/debug/app-debug.apk`
3. Enviar o `.apk` para os usuários da BuyHelp por WhatsApp, e-mail ou link

> ⚠️ **No celular Android:** O usuário precisa ativar "Instalar apps de fontes desconhecidas" nas configurações de segurança antes de instalar o `.apk`.

---

#### 🍎 Gerar o `.ipa` para iPhone

**Pré-requisito:** Mac com Xcode instalado ([App Store da Apple](https://apps.apple.com/app/xcode/id497799835))

```bash
# 1. Build do React
npm run build

# 2. Sincronizar com o projeto iOS
npx cap sync ios

# 3. Abrir no Xcode
npx cap open ios
```

No Xcode:
1. Selecionar o target **BuyHelp Leads**
2. Em **Signing & Capabilities**, configurar o Apple Developer Account
3. Menu **Product → Archive**
4. Na janela Organizer: **Distribute App → Ad Hoc** (para distribuição interna sem App Store)
5. O arquivo `.ipa` é gerado e pode ser enviado por link, AirDrop ou serviço como o **Diawi**

> ⚠️ **Requisito Apple:** É necessário ter uma conta **Apple Developer** ($99/ano) para assinar o `.ipa`. Sem ela, só é possível instalar em até 3 dispositivos cadastrados via cabo USB.

---

#### Alternativa sem Mac para iPhone — Expo EAS Build

Se não houver Mac disponível, usar o **Expo EAS** para compilar o `.ipa` na nuvem:

```bash
# Instalar Expo EAS
npm install -g eas-cli
eas login
eas build --platform ios --profile preview
```

O EAS compila na nuvem e entrega o link do `.ipa` — sem precisar de Mac. Plano gratuito com 30 builds/mês.

---

### Fluxo de distribuição para a BuyHelp

```
Developer (Claude gera o código)
       │
       ▼
npm run build → npx cap sync
       │
       ├── Android Studio → .apk
       │        │
       │        └── WhatsApp / Google Drive → usuário instala
       │
       └── Xcode / EAS Build → .ipa
                │
                └── Diawi / AirDrop / TestFlight → usuário instala
```

---

### Checklist de ícones necessários

| Arquivo           | Tamanho    | Usado em                       |
|-------------------|------------|--------------------------------|
| `icon-1024.png`   | 1024×1024px| Base — gerado pelo Capacitor   |
| `splash.png`      | 2732×2732px| Splash screen Android + iPhone |

Usar o comando do Capacitor para gerar todos os tamanhos automaticamente:

```bash
npm install @capacitor/assets --save-dev
npx capacitor-assets generate
```

Coloca apenas o `icon-1024.png` e o `splash.png` na pasta `assets/` e o Capacitor gera todos os tamanhos necessários para Android e iPhone automaticamente.

---

## 🔌 Arquitetura Offline-First

### Princípio Central
> **O app deve funcionar 100% sem internet.** A conectividade é um bônus, não um requisito.

O fluxo de dados segue sempre este caminho:

```
Usuário preenche lead
       │
       ▼
IndexedDB (local)   ← salva imediatamente, sempre
       │
       ▼
[ Tem internet? ]
   │         │
  Sim        Não
   │         │
   ▼         ▼
PocketBase  Fila de    ← fica na fila até reconectar
 (Fly.io)  pendentes
  (sync)
```

### Estados do App

| Estado        | Comportamento                                                          | UI                                      |
|---------------|------------------------------------------------------------------------|-----------------------------------------|
| **Online**    | Salva local + sincroniza PocketBase imediatamente                      | Sem banner — fluxo normal               |
| **Offline**   | Salva apenas no IndexedDB, enfileira para sync                         | Banner glassmorphism no topo (laranja)  |
| **Syncing**   | Reconnectou — enviando leads pendentes em background                   | Indicador sutil de progresso no topo    |
| **Erro sync** | Falha ao enviar para PocketBase após reconexão                         | Toast de erro com opção de retry        |

---

## 💾 Armazenamento Local (SQLite Nativo via Capacitor)

No app nativo, usar **`@capacitor-community/sqlite`** em vez de IndexedDB — é mais robusto, não tem limite de espaço arbitrário do browser e funciona igual no Android e iPhone.

```javascript
// db.js — SQLite nativo via Capacitor
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

const sqlite = new SQLiteConnection(CapacitorSQLite);

export async function initDB() {
  const db = await sqlite.createConnection('buyhelp', false, 'no-encryption', 1, false);
  await db.open();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS leads (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT NOT NULL,
      email     TEXT,
      phone     TEXT,
      device_id TEXT,
      created   TEXT DEFAULT (datetime('now')),
      synced    INTEGER DEFAULT 0
    );
  `);

  return db;
}
```

### Operações principais

```javascript
// Salvar lead (sempre offline-first)
async function saveLead(db, data) {
  await db.run(
    `INSERT INTO leads (name, email, phone, device_id) VALUES (?, ?, ?, ?)`,
    [data.name, data.email, data.phone, data.deviceId]
  );
}

// Buscar leads não sincronizados
async function getPendingLeads(db) {
  const result = await db.query(`SELECT * FROM leads WHERE synced = 0`);
  return result.values ?? [];
}

// Marcar como sincronizado
async function markAsSynced(db, id) {
  await db.run(`UPDATE leads SET synced = 1 WHERE id = ?`, [id]);
}
```

---

## ☁️ Integração com PocketBase (Fly.io)

### Infraestrutura no Fly.io

```bash
# 1. Instalar flyctl e fazer login
curl -L https://fly.io/install.sh | sh
fly auth login

# 2. Criar o app
fly launch --name buyhelp-leads --no-deploy

# 3. Criar volume persistente para o SQLite (dados não se perdem ao reiniciar)
fly volumes create pb_data --size 10

# 4. Deploy
fly deploy
```

```toml
# fly.toml — configuração mínima
[mounts]
  source = "pb_data"
  destination = "/pb/pb_data"

[[services]]
  internal_port = 8090
  protocol = "tcp"
```

### MCP do Fly.io no Claude

Para gerenciar o deploy diretamente pelo Claude (sem terminal):

```bash
fly mcp server --claude
```

Isso configura o Claude para controlar o Fly.io via MCP — criar volumes, ver logs, fazer deploy, tudo por linguagem natural.

---

### Configuração do PocketBase no app

```javascript
// pocketbase.js
import PocketBase from 'pocketbase';

export const pb = new PocketBase(import.meta.env.VITE_PB_URL);
```

```env
# .env
VITE_PB_URL=https://buyhelp-leads.fly.dev
```

### Collection no PocketBase

Criar via painel admin em `https://buyhelp-leads.fly.dev/_/` ou via API:

```
Collection: leads
├── name     (text, required)
├── email    (email)
├── phone    (text)
├── device_id (text)   ← identifica o dispositivo de origem
└── created  (autodate)
```

### Função de Sincronização

```javascript
// sync.js
import { pb } from './pocketbase';
import { getPendingLeads, markAsSynced } from './db';

export async function syncPendingLeads() {
  if (!navigator.onLine) return;

  const pending = await getPendingLeads();
  if (pending.length === 0) return;

  for (const lead of pending) {
    try {
      await pb.collection('leads').create({
        name:      lead.name,
        email:     lead.email,
        phone:     lead.phone,
        device_id: lead.deviceId,
      });
      await markAsSynced(lead.id);
    } catch (err) {
      console.error('Sync falhou para lead:', lead.id, err);
    }
  }
}

// Sincroniza automaticamente ao reconectar
window.addEventListener('online', syncPendingLeads);
```

### Backup automático do SQLite

O SQLite fica no volume do Fly.io. Configurar backup diário simples:

```bash
# Via SSH no Fly.io — copiar o .db para Tigris (S3 gratuito do Fly)
fly ssh console -a buyhelp-leads
cp /pb/pb_data/data.db /backup/data-$(date +%Y%m%d).db
```

> O Fly.io oferece **Tigris** (S3-compatível) gratuito até 5GB — ideal para guardar backups diários do SQLite.

---

## 📡 Detecção de Conectividade & UI de Status

### Plugin nativo de rede — @capacitor/network

No app nativo, usar o plugin **`@capacitor/network`** em vez de `navigator.onLine` — é mais confiável em Android e iPhone, especialmente em redes instáveis.

```javascript
// useNetworkStatus.js
import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Verificar status atual ao montar
    Network.getStatus().then(status => setIsOnline(status.connected));

    // Ouvir mudanças de conectividade
    const listener = Network.addListener('networkStatusChange', status => {
      setIsOnline(status.connected);
    });

    return () => { listener.then(l => l.remove()); };
  }, []);

  return isOnline;
}
```

### Banner Offline (componente)

Aplique o estilo glassmorphism definido no sistema de design. O banner aparece **fixo no topo** quando offline:

```jsx
// OfflineBanner.jsx
import { useNetworkStatus } from './useNetworkStatus';

export function OfflineBanner() {
  const isOnline = useNetworkStatus();
  if (isOnline) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 9999,
      background: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(171, 53, 0, 0.15)',
      padding: '0.625rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontFamily: "'Be Vietnam Pro', sans-serif",
      fontSize: '0.8rem',
      color: '#ab3500',
      fontWeight: 600,
    }}>
      <span>⚡</span>
      Modo offline — seus dados estão salvos e serão enviados ao reconectar.
    </div>
  );
}
```

---

## 📐 Adaptações de Layout para Celular (Android & iPhone)

### Regras Mobile-First

O app foi projetado **exclusivamente para celular** — não é um site responsivo adaptado, é uma experiência pensada do zero para a tela do smartphone.

- **Viewport:** `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">`
- **Touch targets:** Botões e inputs com mínimo de `48px` de altura — dedo humano médio é ~44px
- **Safe areas iOS (notch + home indicator):** Usar `env(safe-area-inset-*)` obrigatoriamente
- **Scroll:** Apenas vertical — nunca scroll horizontal em componentes internos
- **Teclado virtual:** Inputs usam `scroll-padding-bottom` para não ficarem escondidos quando o teclado abre
- **Orientação:** Fixar em `portrait` no manifest — app de captura de leads não precisa de landscape

```css
/* Safe area obrigatória — respeita notch do iPhone e barra de navegação Android */
.app-container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* CTA sticky respeitando home indicator do iPhone */
.cta-sticky {
  position: fixed;
  bottom: 0;
  left: 0; right: 0;
  padding: 1rem 1.25rem;
  padding-bottom: calc(1rem + env(safe-area-inset-bottom));
  background: rgba(255,255,255,0.9);
  backdrop-filter: blur(12px);
}

/* Touch target mínimo em todos os elementos interativos */
button, input, select, a {
  min-height: 48px;
}
```

### Breakpoints

O app é **mobile-only** por padrão. Apenas um breakpoint opcional para tablets:

```css
/* Celular: padrão (320px – 480px) — layout principal */
/* Tablet: centralizado com max-width */
@media (min-width: 768px) {
  .app-root {
    max-width: 480px;
    margin: 0 auto;
    box-shadow: 0 0 48px rgba(26,26,46,0.08);
    min-height: 100dvh;
  }
}
```

### Diferenças Android vs iPhone a considerar no código

| Comportamento | Android (Chrome) | iPhone (Safari) |
|---|---|---|
| Instalação PWA | Banner automático + menu | Manual via Safari → Compartilhar |
| Barra de status | `theme_color` no manifest pinta a barra | Controlada por `apple-mobile-web-app-status-bar-style` |
| Teclado virtual | Reduz o viewport | Pode sobrepor elementos — usar `dvh` em vez de `vh` |
| `100vh` | Funciona normalmente | Inclui barra do Safari — usar `100dvh` |
| Notch/safe area | Variável por modelo | Sempre usar `env(safe-area-inset-*)` |

```css
/* Usar dvh (dynamic viewport height) em vez de vh para compatibilidade */
.full-screen {
  min-height: 100dvh; /* compatível com iOS Safari e Android Chrome */
}
```

---

## 🔢 Contador de Leads Pendentes

Exibir visualmente quantos leads aguardam sincronização:

```jsx
// PendingBadge.jsx
import { useEffect, useState } from 'react';
import { getPendingLeads } from './db';

export function PendingBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    getPendingLeads().then(leads => setCount(leads.length));
  }, []);

  if (count === 0) return null;

  return (
    <span style={{
      background: 'linear-gradient(135deg, #FF6B35, #FF8C42)',
      color: '#fff',
      borderRadius: '999px',
      padding: '2px 10px',
      fontSize: '0.75rem',
      fontWeight: 700,
      fontFamily: "'Be Vietnam Pro', sans-serif",
    }}>
      {count} pendente{count > 1 ? 's' : ''}
    </span>
  );
}
```

---

## 🎨 Design Visual: Seguir Exatamente o Projeto Stitch

> ⚠️ **INSTRUÇÃO OBRIGATÓRIA PARA O CLAUDE**
> O design de todas as telas, componentes e interfaces deste app **deve seguir exatamente** o projeto abaixo. Não inventar, não adaptar livremente, não usar outros estilos.

**🔗 Projeto oficial:**
**[https://stitch.withgoogle.com/projects/11656084295829490347](https://stitch.withgoogle.com/projects/11656084295829490347)**

---

### O que fazer ANTES de gerar qualquer tela

1. **Acessar o projeto Stitch** no link acima
2. **Exportar o `DESIGN.md`** do projeto (menu do projeto → Export Design System → DESIGN.md) — esse arquivo contém todos os tokens exatos: cores, tipografia, espaçamentos, border-radius, sombras
3. **Ler o `DESIGN.md` exportado** como fonte de verdade absoluta de design tokens
4. **Exportar o código React/HTML+CSS** das telas já geradas no Stitch e usá-lo como ponto de partida — não recriar do zero
5. Adaptar o código exportado para a stack **React + Capacitor** definida neste documento

---

### Regras de fidelidade visual

| Elemento | Instrução |
|---|---|
| **Cores** | Usar exatamente as cores do projeto Stitch — não substituir por outras |
| **Tipografia** | Usar exatamente as fontes e pesos definidos no Stitch |
| **Espaçamento** | Respeitar os valores de padding/margin/gap do Stitch |
| **Border-radius** | Usar os valores exatos de arredondamento do Stitch |
| **Componentes** | Copiar a estrutura visual dos componentes gerados no Stitch |
| **Layout** | Manter a hierarquia visual e composição de telas do Stitch |
| **Ícones** | Usar o mesmo sistema de ícones que aparece no projeto Stitch |

---

### Workflow obrigatório: Stitch → App Nativo

```
Abrir projeto Stitch
       │
       ▼
Exportar DESIGN.md + código React
       │
       ▼
Usar código como base — NÃO recriar do zero
       │
       ├── Adaptar para React + Capacitor
       ├── Integrar SQLite nativo (@capacitor-community/sqlite)
       ├── Adicionar lógica offline-first
       └── Conectar ao PocketBase (Fly.io)
```

---

### O que é o Google Stitch

O Stitch é a ferramenta de design de UI do Google Labs (Gemini 2.5 Pro) que gerou o design oficial deste app. Ele exporta código React/HTML+CSS e um `DESIGN.md` com todos os tokens de design — cores, tipografia, espaçamentos — em formato compatível com agentes de IA como o Claude.

> **Regra de conflito:** Se houver qualquer conflito entre o visual do projeto Stitch e outras definições deste `leed.md`, **o projeto Stitch sempre prevalece** — ele é a fonte de verdade visual do produto.

---

## 🎯 Identidade Criativa: "The Guided High-Light"

**Tom:** Editorial de luxo. Concierge digital de alto padrão.
**Não é:** Template SaaS genérico, formulário comum, grid rígido.
**É:** Uma conversa premium — fluida, espaçosa, com autoridade e calor.

**Conceito-chave:** *Organic Intentionality* — espaço em branco generoso, tipografia de alto contraste e camadas tonais suaves guiam o olho com autoridade. O laranja primário não é apenas uma cor: é energia e direção.

---

## 🎨 Paleta de Cores

| Token                     | Hex       | Uso principal                              |
|---------------------------|-----------|--------------------------------------------|
| `primary`                 | `#ab3500` | Ações principais, bordas ativas            |
| `primary_container`       | `#ff6b35` | Gradientes de CTA                          |
| `primary_fixed`           | `#ffdbd0` | Cards em destaque ("Lead Highlight")       |
| `surface_container_lowest`| `#ffffff` | Camada de card ativo / interativo          |
| `surface_container_low`   | `#f0f3ff` | Seções e fundos de input                   |
| `background`              | `#f9f9ff` | Camada base da página                      |
| `on_secondary_fixed`      | `#1a1a2e` | Tipografia "tinta sobre papel" — navy escuro |
| `error`                   | `#ba1a1a` | Validação de erros                         |
| `on_surface_variant`      | *(tom médio)* | Textos secundários / metadados          |

### Gradiente Assinatura
```css
background: linear-gradient(135deg, #FF6B35, #FF8C42);
```
Usado exclusivamente em botões primários e na Progress Micro-Bar.

---

## 📐 Regra "No-Line"

> **Nunca use bordas `1px solid` para separar seções.**

Limites são definidos por **mudanças de cor de fundo** entre camadas:

```
background (#f9f9ff)
  └── surface_container_low (#f0f3ff)   ← seção
        └── surface_container_lowest (#ffffff) ← card ativo
              └── surface_container_high       ← campo de input
```

A diferença de tom *é* a borda. Nenhuma linha é necessária.

---

## 🔡 Tipografia

### Fontes
- **Display & Headlines:** `Plus Jakarta Sans` — geométrica, moderna, amigável
- **Body & Labels:** `Be Vietnam Pro` — legível, profissional em escalas pequenas

### Hierarquia

| Papel         | Fonte             | Uso                                      |
|---------------|-------------------|------------------------------------------|
| `display-lg`  | Plus Jakarta Sans | Hero / mensagem de boas-vindas           |
| `display-md`  | Plus Jakarta Sans | Propostas de valor principais            |
| `headline-sm` | Plus Jakarta Sans | Títulos de card e cabeçalhos de seção    |
| `body-md`     | Be Vietnam Pro    | Labels e descrições de campos            |
| `label-sm`    | Be Vietnam Pro    | Metadados, botões pequenos (all-caps)    |

### Regra tipográfica
- **Nunca use `#000000`** — use `on_secondary_fixed` (`#1a1a2e`) como "preto"
- Textos secundários usam `on_surface_variant` para contraste suave

---

## 📦 Componentes

### Botão Primário
```css
background: linear-gradient(135deg, #FF6B35, #FF8C42);
border-radius: 14px;
box-shadow: 0 8px 24px rgba(255, 107, 53, 0.35);
color: #ffffff;
font-family: 'Be Vietnam Pro';
font-weight: 700;
```

### Botão Secundário
```css
background: transparent;
border: 1px solid rgba(171, 53, 0, 0.20); /* primary @ 20% */
color: #ab3500;
border-radius: 14px;
```

### Botão Terciário
```css
background: none;
border: none;
color: #ab3500;
font-weight: 600;
```

---

### Input Field
```css
/* Estado padrão */
background: #f0f3ff; /* surface_container_low */
border-radius: 12px;
border: none;

/* Estado ativo */
background: #ffffff; /* surface_container_lowest */
border: 1px solid rgba(171, 53, 0, 0.30); /* primary @ 30% */

/* Erro */
/* Use texto em #ba1a1a abaixo do campo — nunca apenas borda vermelha */
```

---

### Card Principal
```css
background: #ffffff;
border-radius: 24px; /* roundedness.xl = 1.5rem */
padding: 1.25rem; /* spacing.5 */
box-shadow: none; /* use tonal layering, não shadow */
```

### Card em Destaque ("Lead Highlight")
```css
background: #ffdbd0; /* primary_fixed */
border-radius: 24px;
```

---

### Componente Assinatura: Progress Micro-Bar
```css
/* Barra de 4px no topo da tela para formulários multi-etapa */
height: 4px;
background: linear-gradient(135deg, #FF6B35, #FF8C42);
position: fixed;
top: 0;
left: 0;
width: var(--progress-percent); /* ex: 66% */
transition: width 0.4s ease;
```

---

### Header Flutuante / Banner Offline (Glassmorphism)
```css
background: rgba(255, 255, 255, 0.7);
backdrop-filter: blur(12px);
border: 1px solid rgba(/* outline_variant */ 0, 0, 0, 0.15);
```

---

## 🌊 Elevação & Sombras

| Situação                         | Regra                                              |
|----------------------------------|----------------------------------------------------|
| Elementos estáticos              | Sem sombra — use tonal layering                    |
| Elementos flutuantes (modal, CTA sticky) | `0 8px 32px rgba(26, 26, 46, 0.06)`     |
| Botão primário                   | `0 8px 24px rgba(255, 107, 53, 0.35)`              |

---

## 📏 Espaçamento & Ritmo

| Token       | Valor   | Uso                          |
|-------------|---------|------------------------------|
| `spacing.4` | `1rem`  | Gap entre elementos          |
| `spacing.5` | `1.25rem` | Padding interno de cards   |
| `spacing.6` | `1.5rem` | Separação de itens de lista |
| `spacing.8` | `2rem`  | Padding de seções            |

> **Regra de ouro:** Se um elemento parece apertado, suba um nível no scale (ex: `spacing.4` → `spacing.5`). Nunca compacte — o espaço em branco é o elemento de design mais importante.

---

## ✅ Do's & Don'ts

### ✅ Faça
- Use margens assimétricas em headlines para criar "pull" editorial
- Use `border-radius: 1.5rem` em cards principais (roundedness.xl)
- Separe itens de lista com espaço vertical (`spacing.6`/`spacing.8`) — sem divisórias
- Use `on_surface_variant` para textos secundários
- Use o gradiente assinatura exclusivamente para CTAs e a Progress Bar

### ❌ Não faça
- ❌ Não use `#000000` — sempre `#1a1a2e`
- ❌ Não use divisórias `1px` cinzas — elas quebram o fluxo premium
- ❌ Não use Inter, Roboto, Arial ou fontes de sistema
- ❌ Não use gradientes roxos em fundos brancos
- ❌ Não use sombras em elementos estáticos
- ❌ Não compacte — se estiver apertado, aumente o espaçamento

---

## 🏗️ Hierarquia de Superfícies (resumo visual)

```
┌─────────────────────────────────────────┐
│  background: #f9f9ff                    │  ← Base da página
│  ┌───────────────────────────────────┐  │
│  │  surface_container_low: #f0f3ff   │  │  ← Seção
│  │  ┌─────────────────────────────┐  │  │
│  │  │  surface_container_lowest   │  │  │  ← Card / área interativa
│  │  │  #ffffff                    │  │  │
│  │  │  ┌───────────────────────┐  │  │  │
│  │  │  │ surface_container_high│  │  │  │  ← Campo de input
│  │  │  └───────────────────────┘  │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 🚀 Instrução para o Claude

Ao gerar qualquer tela, componente ou lógica para este projeto:

### ⚠️ Regra #0 — Design Stitch (prioridade máxima)
**Antes de qualquer coisa**, acessar e seguir exatamente o design do projeto Stitch:
🔗 **https://stitch.withgoogle.com/projects/11656084295829490347**
- Exportar o `DESIGN.md` do projeto e usá-lo como fonte de verdade de tokens
- Exportar o código React das telas e usá-lo como ponto de partida
- **Nunca** recriar telas do zero ignorando o Stitch
- O visual do Stitch **prevalece** sobre qualquer outra definição deste documento

### Design & Visual
1. **Nunca use bordas de 1px cinzas** — use shifts de cor de fundo
2. **Sempre importe** `Plus Jakarta Sans` e `Be Vietnam Pro` do Google Fonts (ou embuta via `@font-face` para funcionar offline)
3. **Aplique o gradiente assinatura** apenas em botões primários e a progress bar
4. **Respeite a hierarquia de superfícies** — cada nível mais interno é mais claro
5. **Use espaço generoso** — se parecer apertado, está errado
6. **Tipografia navy** `#1a1a2e` substituindo qualquer preto puro
7. **Cards com `border-radius: 24px`** (1.5rem) para o visual "concierge premium"
8. **Validação de erros** sempre em texto `#ba1a1a` — nunca só borda colorida

### Mobile
9. **Sempre use layout mobile-first** — max-width 480px centralizado para tablet
10. **Touch targets mínimos de 48px** em altura para botões e inputs
11. **Inclua `env(safe-area-inset-*)`** para respeitar notch e home indicator do iOS
12. **Nunca gere scroll horizontal** em nenhum componente

### Offline & Dados
13. **Todo lead é salvo no SQLite nativo primeiro** (`@capacitor-community/sqlite`) — nunca enviar só para PocketBase sem salvar local
14. **Use `@capacitor/network`** para detectar conectividade — nunca `navigator.onLine` neste projeto
15. **Exiba o banner offline** (glassmorphism laranja) sempre que `status.connected === false`
16. **A função `syncPendingLeads()`** deve ser chamada ao evento `networkStatusChange` com `connected: true`
17. **Marque leads como `synced = 1`** no SQLite local após confirmação do PocketBase (sem erro no `try/catch`)

### Backend — PocketBase no Fly.io
18. **O cliente é `PocketBase`** do npm — nunca usar `@supabase/supabase-js` neste projeto
19. **A URL base é** `import.meta.env.VITE_PB_URL` apontando para `https://buyhelp-leads.fly.dev`
20. **Operações de escrita** usam `pb.collection('leads').create({...})`
21. **Para deploy e gestão** via Claude, usar o MCP do Fly.io: `fly mcp server --claude`
22. **O SQLite do PocketBase persiste** no volume `/pb/pb_data` — nunca gerar código que apague este diretório

### App Nativo — Capacitor
23. **O compilador é o Capacitor** — nunca gerar PWA (`manifest.json`, Service Worker, `vite-plugin-pwa`)
24. **Usar `@capacitor-community/sqlite`** para armazenamento local — nunca IndexedDB ou Dexie.js
25. **Usar `@capacitor/network`** para status de rede — nunca `navigator.onLine`
26. **Para gerar o `.apk`:** `npm run build → npx cap sync android → npx cap open android → Build APK`
27. **Para gerar o `.ipa`:** `npm run build → npx cap sync ios → npx cap open ios → Product → Archive`
28. **Ícones:** apenas `icon-1024.png` e `splash.png` em `assets/` — rodar `npx capacitor-assets generate`

---

> *"Consistência no espaço em branco é a diferença entre um formulário e uma experiência assinada. Offline-first é a diferença entre um app e uma promessa."*
