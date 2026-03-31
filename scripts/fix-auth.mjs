const PB_URL = 'http://127.0.0.1:8090'
const adminEmail    = process.argv[2]
const adminPassword = process.argv[3]

if (!adminEmail || !adminPassword) {
  console.error('Uso: node scripts/fix-auth.mjs <admin-email> <admin-senha>')
  process.exit(1)
}

async function api(method, path, body, token) {
  const res = await fetch(`${PB_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`)
  return json
}

async function main() {
  // Auth admin
  let token
  try {
    const auth = await api('POST', '/api/admins/auth-with-password', { identity: adminEmail, password: adminPassword })
    token = auth.token
  } catch {
    const auth = await api('POST', '/api/collections/_superusers/auth-with-password', { identity: adminEmail, password: adminPassword })
    token = auth.token
  }
  console.log('✅ Admin autenticado')

  // Ver opções atuais
  const col = await api('GET', '/api/collections/users', null, token)
  console.log('Opções atuais:', JSON.stringify(col.options, null, 2))

  // Desativar TUDO relacionado a email
  await api('PATCH', '/api/collections/users', {
    options: {
      ...col.options,
      requireEmail:             true,
      exceptEmailDomains:       [],
      onlyEmailDomains:         [],
      onlyVerified:             false,
      allowEmailAuth:           true,
      allowUsernameAuth:        false,
      minPasswordLength:        8,
    }
  }, token)
  console.log('✅ Opções atualizadas')

  // Teste de login direto
  console.log('\nTestando login...')
  const loginRes = await fetch(`${PB_URL}/api/collections/users/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'vendas@buyhelp.com', password: 'buyhelp2026' }),
  })
  const loginData = await loginRes.json()
  console.log('Status:', loginRes.status)
  if (loginRes.ok) {
    console.log('✅ Login OK! Token:', loginData.token?.substring(0, 30) + '...')
  } else {
    console.log('❌ Login falhou:', loginData)
  }
}

main().catch(err => { console.error('Erro:', err.message); process.exit(1) })
