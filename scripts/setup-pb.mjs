/**
 * setup-pb.mjs — Configura o PocketBase para o BuyHelp Leads
 *
 * Uso:
 *   node scripts/setup-pb.mjs <admin-email> <admin-senha>
 *
 * Exemplo:
 *   node scripts/setup-pb.mjs admin@test.com minhasenha123
 */

const PB_URL     = 'http://127.0.0.1:8090'
const adminEmail    = process.argv[2]
const adminPassword = process.argv[3]

if (!adminEmail || !adminPassword) {
  console.error('\n❌ Uso: node scripts/setup-pb.mjs <admin-email> <admin-senha>\n')
  process.exit(1)
}

async function api(method, path, body, token) {
  const res = await fetch(`${PB_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = { message: text } }
  if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`)
  return json
}

async function main() {
  console.log('\n🚀 Iniciando setup do PocketBase...')
  console.log(`   URL: ${PB_URL}\n`)

  // ── 1. Autenticar admin ───────────────────────────────────────────────────
  let token
  try {
    // Tenta v0.20+ e v0.22+
    let auth
    try {
      auth = await api('POST', '/api/admins/auth-with-password', {
        identity: adminEmail,
        password: adminPassword,
      })
    } catch {
      // PocketBase v0.23+ usa superusers
      auth = await api('POST', '/api/collections/_superusers/auth-with-password', {
        identity: adminEmail,
        password: adminPassword,
      })
    }
    token = auth.token
    console.log('✅ Admin autenticado')
  } catch (err) {
    console.error('❌ Falha ao autenticar admin:', err.message)
    console.error('   Verifique o email/senha e se o PocketBase está rodando em', PB_URL)
    process.exit(1)
  }

  // ── 2. Criar collection `leads` ───────────────────────────────────────────
  try {
    await api('GET', '/api/collections/leads', null, token)
    console.log('⏭️  Collection `leads` já existe')
  } catch {
    try {
      await api('POST', '/api/collections', {
        name: 'leads',
        type: 'base',
        schema: [
          { name: 'name',        type: 'text',  required: true  },
          { name: 'email',       type: 'email', required: false },
          { name: 'phone',       type: 'text',  required: false },
          { name: 'company',     type: 'text',  required: false },
          { name: 'role',        type: 'text',  required: false },
          { name: 'temperature', type: 'text',  required: false },
          { name: 'notes',       type: 'text',  required: false },
          { name: 'device_id',   type: 'text',  required: false },
          { name: 'event_name',  type: 'text',  required: false },
        ],
        listRule:   '@request.auth.id != ""',
        viewRule:   '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null,
      }, token)
      console.log('✅ Collection `leads` criada')
    } catch (err) {
      console.error('❌ Erro ao criar collection leads:', err.message)
    }
  }

  // ── 3. Criar usuário de teste ─────────────────────────────────────────────
  const testEmail    = 'vendas@buyhelp.com'
  const testPassword = 'buyhelp2026'

  try {
    // Desativa verificação de email na collection users
    const usersCollection = await api('GET', '/api/collections/users', null, token)
    if (usersCollection.options?.requireEmail !== false) {
      await api('PATCH', '/api/collections/users', {
        options: { requireEmail: false, emailVisibility: true },
      }, token)
      console.log('✅ Verificação de email desativada em users')
    }
  } catch (_) {}

  try {
    await api('POST', '/api/collections/users/records', {
      email:           testEmail,
      password:        testPassword,
      passwordConfirm: testPassword,
      name:            'Carlos BuyHelp',
      emailVisibility: true,
      verified:        true,
    }, token)
    console.log(`✅ Usuário criado: ${testEmail} / ${testPassword}`)
  } catch (err) {
    if (err.message.toLowerCase().includes('unique') || err.message.toLowerCase().includes('already')) {
      console.log(`⏭️  Usuário ${testEmail} já existe`)
    } else {
      console.error('❌ Erro ao criar usuário:', err.message)
    }
  }

  // ── 4. Inserir leads de exemplo ───────────────────────────────────────────
  const leads = [
    { name: 'Ana Paula Ferreira',  email: 'ana@varejo.com',       phone: '(11) 99887-6655', company: 'Rede Varejo Express',     role: 'Diretora Comercial',  temperature: 'hot',  notes: 'Muito interessada. Quer demo semana que vem.', event_name: 'ExpoVarejo 2026' },
    { name: 'Ricardo Melo',        email: 'rmelo@supermercados.com', phone: '(21) 98765-4321', company: 'Grupo Melo Supermercados', role: 'Gerente de TI',     temperature: 'warm', notes: 'Avaliando 3 fornecedores. Precisa de proposta.', event_name: 'ExpoVarejo 2026' },
    { name: 'Fernanda Souza',      email: 'fsouza@atacadao.net',  phone: '(31) 97654-3210', company: 'Atacadão Central',          role: 'Compradora',          temperature: 'cold', notes: 'Pegou material. Contato apenas para newsletter.', event_name: 'ExpoVarejo 2026' },
    { name: 'Marcos Oliveira',     email: 'marcos@distribol.com', phone: '(48) 99123-4567', company: 'Distribuidora Oliveira',   role: 'CEO',                  temperature: 'hot',  notes: 'Dono da empresa. Quer assinar neste trimestre!', event_name: 'ExpoVarejo 2026' },
    { name: 'Juliana Costa',       email: 'jcosta@farmbell.com',  phone: '(85) 98877-6655', company: 'Farmácia Bell',             role: 'Gerente Operacional', temperature: 'warm', notes: 'Rede de 12 lojas. Interesse em integração PDV.', event_name: 'ExpoVarejo 2026' },
  ]

  console.log('\n📦 Inserindo leads de exemplo...')
  let ok = 0
  for (const lead of leads) {
    try {
      await api('POST', '/api/collections/leads/records', { ...lead, device_id: 'setup' }, token)
      console.log(`   ✅ ${lead.name} (${lead.temperature})`)
      ok++
    } catch (err) {
      console.error(`   ❌ ${lead.name}: ${err.message}`)
    }
  }

  console.log(`\n🎉 Setup concluído! ${ok} leads inseridos.`)
  console.log(`\n   Login no app:`)
  console.log(`   • URL:   http://localhost:5173/`)
  console.log(`   • Email: ${testEmail}`)
  console.log(`   • Senha: ${testPassword}\n`)
}

main().catch(err => {
  console.error('\n❌ Erro inesperado:', err.message)
  process.exit(1)
})
