// API helper — usa fetch direto para compatibilidade com PocketBase v0.36+

const PB_URL = import.meta.env.VITE_PB_URL || 'https://buyhelp-pb.fly.dev'

function getToken() {
  // PocketBase SDK salva o token em localStorage com a chave 'pocketbase_auth'
  try {
    const raw = localStorage.getItem('pocketbase_auth')
    if (raw) return JSON.parse(raw).token
  } catch {}
  return null
}

async function req(method, path, body) {
  const token = getToken()
  const res = await fetch(`${PB_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return null // No Content (DELETE)
  const json = await res.json()
  if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`)
  return json
}

// Events
export const eventsApi = {
  list: () => req('GET', '/api/collections/events/records?perPage=200'),
  create: (data) => req('POST', '/api/collections/events/records', data),
  update: (id, data) => req('PATCH', `/api/collections/events/records/${id}`, data),
  delete: (id) => req('DELETE', `/api/collections/events/records/${id}`),
}

// Leads
export const leadsApi = {
  list: (eventName, page = 1, perPage = 50, temp = '') => {
    let filter = eventName ? `event_name='${eventName}'` : ''
    if (temp && temp !== 'all') filter = filter ? `${filter}&&temperature='${temp}'` : `temperature='${temp}'`
    const params = new URLSearchParams({ page, perPage, ...(filter ? { filter } : {}) })
    return req('GET', `/api/collections/leads/records?${params}`)
  },
  count: (eventName) => {
    const params = new URLSearchParams({ page: 1, perPage: 1, filter: `event_name='${eventName}'` })
    return req('GET', `/api/collections/leads/records?${params}`)
  },
  all: (eventName) => {
    const params = new URLSearchParams({ page: 1, perPage: 500, filter: `event_name='${eventName}'` })
    return req('GET', `/api/collections/leads/records?${params}`)
  },
  listAll: () => {
    const params = new URLSearchParams({ page: 1, perPage: 500 })
    return req('GET', `/api/collections/leads/records?${params}`)
  },
}
