/**
 * setup-kanban.mjs — Cria as coleções do Kanban no PocketBase e insere as colunas padrão
 *
 * Uso:
 *   node scripts/setup-kanban.mjs <admin-email> <admin-senha>
 *
 * Exemplo:
 *   node scripts/setup-kanban.mjs admin@buyhelp.com minhasenha123
 */

const PB_URL        = 'https://buyhelp-pb.fly.dev'
const adminEmail    = process.argv[2]
const adminPassword = process.argv[3]

if (!adminEmail || !adminPassword) {
  console.error('\n❌ Uso: node scripts/setup-kanban.mjs <admin-email> <admin-senha>\n')
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
  console.log('\n🚀 Configurando Kanban no PocketBase...')
  console.log(`   URL: ${PB_URL}\n`)

  // ── 1. Autenticar admin ────────────────────────────────────────────────────
  let token
  try {
    let auth
    try {
      auth = await api('POST', '/api/admins/auth-with-password', { identity: adminEmail, password: adminPassword })
    } catch {
      auth = await api('POST', '/api/collections/_superusers/auth-with-password', { identity: adminEmail, password: adminPassword })
    }
    token = auth.token
    console.log('✅ Admin autenticado')
  } catch (err) {
    console.error('❌ Falha ao autenticar:', err.message)
    process.exit(1)
  }

  // ── 2. Criar collection `kanban_columns` ───────────────────────────────────
  try {
    await api('GET', '/api/collections/kanban_columns', null, token)
    console.log('⏭️  Collection `kanban_columns` já existe')
  } catch {
    try {
      await api('POST', '/api/collections', {
        name: 'kanban_columns',
        type: 'base',
        schema: [
          { name: 'name',     type: 'text',   required: true  },
          { name: 'color',    type: 'text',   required: false },
          { name: 'position', type: 'number', required: false },
        ],
        listRule:   '@request.auth.id != ""',
        viewRule:   '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
      }, token)
      console.log('✅ Collection `kanban_columns` criada')
    } catch (err) {
      console.error('❌ Erro ao criar kanban_columns:', err.message)
    }
  }

  // ── 3. Criar collection `kanban_cards` ────────────────────────────────────
  try {
    await api('GET', '/api/collections/kanban_cards', null, token)
    console.log('⏭️  Collection `kanban_cards` já existe')
  } catch {
    try {
      await api('POST', '/api/collections', {
        name: 'kanban_cards',
        type: 'base',
        schema: [
          { name: 'title',       type: 'text',   required: true  },
          { name: 'description', type: 'text',   required: false },
          { name: 'responsible', type: 'text',   required: false },
          { name: 'deadline',    type: 'text',   required: false },
          { name: 'column_id',   type: 'text',   required: true  },
          { name: 'gravidade',   type: 'number', required: false },
          { name: 'urgencia',    type: 'number', required: false },
          { name: 'tendencia',   type: 'number', required: false },
          { name: 'position',    type: 'number', required: false },
        ],
        listRule:   '@request.auth.id != ""',
        viewRule:   '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
      }, token)
      console.log('✅ Collection `kanban_cards` criada')
    } catch (err) {
      console.error('❌ Erro ao criar kanban_cards:', err.message)
    }
  }

  // ── 4. Inserir colunas padrão ─────────────────────────────────────────────
  const existing = await api('GET', '/api/collections/kanban_columns/records?perPage=1', null, token)
  if (existing.totalItems > 0) {
    console.log('⏭️  Colunas padrão já existem')
  } else {
    const defaultCols = [
      { name: 'A Fazer',      color: 'gray',   position: 0 },
      { name: 'Em Andamento', color: 'blue',   position: 1 },
      { name: 'Em Revisão',   color: 'orange', position: 2 },
      { name: 'Concluído',    color: 'green',  position: 3 },
    ]
    console.log('\n📋 Inserindo colunas padrão...')
    for (const col of defaultCols) {
      try {
        await api('POST', '/api/collections/kanban_columns/records', col, token)
        console.log(`   ✅ ${col.name}`)
      } catch (err) {
        console.error(`   ❌ ${col.name}: ${err.message}`)
      }
    }
  }

  console.log('\n🎉 Kanban configurado! Acesse:')
  console.log(`   https://buyhelp-app.fly.dev/admin/kanban\n`)
}

main().catch(err => {
  console.error('\n❌ Erro inesperado:', err.message)
  process.exit(1)
})
