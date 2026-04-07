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

async function reqForm(method, path, formData) {
  const token = getToken()
  const res = await fetch(`${PB_URL}${path}`, {
    method,
    headers: { ...(token ? { Authorization: token } : {}) },
    body: formData,
  })
  if (res.status === 204) return null
  const json = await res.json()
  if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`)
  return json
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

// Kanban
export const kanbanApi = {
  listColumns: () => req('GET', '/api/collections/kanban_columns/records?perPage=200'),
  createColumn: (data) => req('POST', '/api/collections/kanban_columns/records', data),
  updateColumn: (id, data) => req('PATCH', `/api/collections/kanban_columns/records/${id}`, data),
  deleteColumn: (id) => req('DELETE', `/api/collections/kanban_columns/records/${id}`),

  listUsers: () => req('GET', '/api/collections/users/records?perPage=200'),
  listCards: () => req('GET', '/api/collections/kanban_cards/records?perPage=500'),
  createCard: (data, files) => {
    if (!files?.length) return req('POST', '/api/collections/kanban_cards/records', data)
    const form = new FormData()
    Object.entries(data).forEach(([k, v]) => v != null && form.append(k, v))
    files.forEach(f => form.append('attachments', f))
    return reqForm('POST', '/api/collections/kanban_cards/records', form)
  },
  updateCard: (id, data, files, removedFiles) => {
    if (!files?.length && !removedFiles?.length) return req('PATCH', `/api/collections/kanban_cards/records/${id}`, data)
    const form = new FormData()
    Object.entries(data).forEach(([k, v]) => v != null && form.append(k, v))
    files?.forEach(f => form.append('attachments', f))
    removedFiles?.forEach(name => form.append('attachments-', name))
    return reqForm('PATCH', `/api/collections/kanban_cards/records/${id}`, form)
  },
  deleteCard: (id) => req('DELETE', `/api/collections/kanban_cards/records/${id}`),
  fileUrl: (cardId, filename) => `${PB_URL}/api/files/kanban_cards/${cardId}/${filename}`,

  listComments:  (cardId) => req('GET', `/api/collections/kanban_comments/records?filter=card_id%3D'${cardId}'&perPage=200`),
  createComment: (data)   => req('POST', '/api/collections/kanban_comments/records', data),
  deleteComment: (id)     => req('DELETE', `/api/collections/kanban_comments/records/${id}`),
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
