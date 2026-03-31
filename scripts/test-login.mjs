const res = await fetch('http://127.0.0.1:8090/api/collections/users/auth-with-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identity: 'vendas@buyhelp.com', password: 'buyhelp2026' }),
})
const data = await res.json()
console.log('Status:', res.status)
console.log(JSON.stringify(data, null, 2))
