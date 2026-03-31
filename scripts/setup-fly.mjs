/**
 * setup-fly.mjs — Configura o PocketBase no Fly.io
 *
 * Uso:
 *   node scripts/setup-fly.mjs <admin-email> <admin-senha>
 *
 * Exemplo:
 *   node scripts/setup-fly.mjs admin@buyhelp.com minhasenha123
 */

const PB_URL        = 'https://buyhelp-pb.fly.dev'
const adminEmail    = process.argv[2]
const adminPassword = process.argv[3]

if (!adminEmail || !adminPassword) {
  console.error('\n❌ Uso: node scripts/setup-fly.mjs <admin-email> <admin-senha>\n')
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
  console.log('\n🚀 Configurando PocketBase no Fly.io...')
  console.log(`   URL: ${PB_URL}\n`)

  // 1. Autenticar admin
  let token
  try {
    let auth
    try {
      auth = await api('POST', '/api/admins/auth-with-password', {
        identity: adminEmail, password: adminPassword,
      })
    } catch {
      auth = await api('POST', '/api/collections/_superusers/auth-with-password', {
        identity: adminEmail, password: adminPassword,
      })
    }
    token = auth.token
    console.log('✅ Admin autenticado')
  } catch (err) {
    console.error('❌ Falha ao autenticar admin:', err.message)
    process.exit(1)
  }

  // 2. Criar collection leads
  try {
    await api('GET', '/api/collections/leads', null, token)
    console.log('⏭️  Collection `leads` já existe')
  } catch {
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
  }

  // 3. Criar usuário vendas@buyhelp.com
  try {
    await api('PATCH', '/api/collections/users', {
      options: { requireEmail: false, emailVisibility: true },
    }, token)
  } catch (_) {}

  try {
    await api('POST', '/api/collections/users/records', {
      email:           'vendas@buyhelp.com',
      password:        'buyhelp2026',
      passwordConfirm: 'buyhelp2026',
      name:            'Carlos BuyHelp',
      emailVisibility: true,
      verified:        true,
    }, token)
    console.log('✅ Usuário criado: vendas@buyhelp.com / buyhelp2026')
  } catch (err) {
    if (err.message.toLowerCase().includes('unique') || err.message.toLowerCase().includes('already')) {
      console.log('⏭️  Usuário vendas@buyhelp.com já existe')
    } else {
      console.error('❌ Erro ao criar usuário:', err.message)
    }
  }

  // 4. Leads de exemplo
  const leads = [
    { name: 'Ana Paula Ferreira',  email: 'ana@varejo.com',          phone: '(11) 99887-6655', company: 'Rede Varejo Express',      role: 'Diretora Comercial',  temperature: 'hot',  notes: 'Muito interessada. Quer demo semana que vem.',        event_name: 'ExpoVarejo 2026' },
    { name: 'Ricardo Melo',        email: 'rmelo@supermercados.com',  phone: '(21) 98765-4321', company: 'Grupo Melo Supermercados', role: 'Gerente de TI',       temperature: 'warm', notes: 'Avaliando 3 fornecedores. Precisa de proposta.',      event_name: 'ExpoVarejo 2026' },
    { name: 'Fernanda Souza',      email: 'fsouza@atacadao.net',      phone: '(31) 97654-3210', company: 'Atacadão Central',         role: 'Compradora',          temperature: 'cold', notes: 'Pegou material. Contato apenas para newsletter.',     event_name: 'ExpoVarejo 2026' },
    { name: 'Marcos Oliveira',     email: 'marcos@distribol.com',     phone: '(48) 99123-4567', company: 'Distribuidora Oliveira',   role: 'CEO',                 temperature: 'hot',  notes: 'Dono da empresa. Quer assinar neste trimestre!',      event_name: 'ExpoVarejo 2026' },
    { name: 'Juliana Costa',       email: 'jcosta@farmbell.com',      phone: '(85) 98877-6655', company: 'Farmácia Bell',            role: 'Gerente Operacional', temperature: 'warm', notes: 'Rede de 12 lojas. Interesse em integração PDV.',     event_name: 'ExpoVarejo 2026' },
  ]

  console.log('\n📦 Inserindo leads de exemplo...')
  for (const lead of leads) {
    try {
      await api('POST', '/api/collections/leads/records', { ...lead, device_id: 'setup' }, token)
      console.log(`   ✅ ${lead.name}`)
    } catch (err) {
      console.error(`   ❌ ${lead.name}: ${err.message}`)
    }
  }

  console.log('\n🎉 Setup concluído!')
  console.log('\n   Acesse o app:')
  console.log(`   • Web:   https://buyhelp-app.fly.dev/`)
  console.log(`   • Admin: https://buyhelp-pb.fly.dev/_/`)
  console.log(`   • Login: vendas@buyhelp.com / buyhelp2026\n`)
}

main().catch(err => {
  console.error('\n❌ Erro inesperado:', err.message)
  process.exit(1)
})
