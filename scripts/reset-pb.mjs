/**
 * reset-pb.mjs — Apaga todos os dados do PocketBase e recria do zero
 *
 * Uso:
 *   node scripts/reset-pb.mjs <admin-email> <admin-senha>
 *
 * Exemplo:
 *   node scripts/reset-pb.mjs admin@buyhelp.com.br minhasenha123
 */

const PB_URL      = 'http://127.0.0.1:8090'
const adminEmail    = process.argv[2]
const adminPassword = process.argv[3]

if (!adminEmail || !adminPassword) {
  console.error('\n❌ Uso: node scripts/reset-pb.mjs <admin-email> <admin-senha>\n')
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

async function deleteAllRecords(collection, token) {
  let page = 1
  let deleted = 0
  while (true) {
    const result = await api('GET', `/api/collections/${collection}/records?perPage=200&page=${page}`, null, token)
    const items = result.items ?? []
    if (items.length === 0) break
    for (const item of items) {
      await api('DELETE', `/api/collections/${collection}/records/${item.id}`, null, token)
      deleted++
    }
    if (items.length < 200) break
    page++
  }
  return deleted
}

async function main() {
  console.log('\n🗑️  Reset do PocketBase — BuyHelp Leads')
  console.log(`   URL: ${PB_URL}\n`)

  // ── 1. Autenticar admin ───────────────────────────────────────────────────
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

  // ── 2. Apagar todos os leads ──────────────────────────────────────────────
  try {
    const n = await deleteAllRecords('leads', token)
    console.log(`✅ ${n} lead(s) removido(s)`)
  } catch (err) {
    console.error('❌ Erro ao apagar leads:', err.message)
  }

  // ── 3. Apagar todos os usuários da coleção users ──────────────────────────
  try {
    const n = await deleteAllRecords('users', token)
    console.log(`✅ ${n} usuário(s) removido(s)`)
  } catch (err) {
    console.error('❌ Erro ao apagar usuários:', err.message)
  }

  // ── 4. Apagar coleção leads e recriar do zero ─────────────────────────────
  try {
    await api('DELETE', '/api/collections/leads', null, token)
    console.log('✅ Collection `leads` removida')
  } catch (err) {
    console.warn('⚠️  Não foi possível remover collection leads:', err.message)
  }

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
        { name: 'badge_front', type: 'text',  required: false },
        { name: 'badge_back',  type: 'text',  required: false },
        { name: 'captured_by', type: 'text',  required: false },
        { name: 'website',     type: 'text',  required: false },
      ],
      listRule:   '@request.auth.id != ""',
      viewRule:   '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: null,
    }, token)
    console.log('✅ Collection `leads` recriada')
  } catch (err) {
    console.error('❌ Erro ao recriar collection leads:', err.message)
  }

  console.log('\n🎉 Reset concluído! Banco remoto está limpo e pronto para uso.\n')
  console.log('   Próximo passo: rode setup-pb.mjs para criar usuários e configurar o app.\n')
}

main().catch(err => {
  console.error('\n❌ Erro inesperado:', err.message)
  process.exit(1)
})
