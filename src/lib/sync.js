import { getPendingLeads, markAsSynced } from './db'

const PB_URL = import.meta.env.VITE_PB_URL || 'https://buyhelp-pb.fly.dev'

function getToken() {
  try {
    const raw = localStorage.getItem('pocketbase_auth')
    if (raw) return JSON.parse(raw).token
  } catch {}
  return null
}

let isSyncing = false

export async function syncPendingLeads() {
  if (isSyncing) return { synced: 0, failed: 0 }
  isSyncing = true

  let synced = 0
  let failed = 0

  try {
    const pending = await getPendingLeads()
    if (pending.length === 0) return { synced: 0, failed: 0 }

    const token = getToken()

    for (const lead of pending) {
      try {
        const res = await fetch(`${PB_URL}/api/collections/leads/records`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: token } : {}),
          },
          body: JSON.stringify({
            name:        lead.name,
            email:       lead.email,
            phone:       lead.phone,
            company:     lead.company,
            role:        lead.role,
            temperature: lead.temperature,
            notes:       lead.notes,
            device_id:   lead.device_id,
            event_name:  lead.event_name,
            badge_front:  lead.badge_front  || '',
            badge_back:   lead.badge_back   || '',
            captured_by:  lead.captured_by  || '',
            created:      lead.created      || new Date().toISOString(),
          }),
        })
        if (res.ok) {
          await markAsSynced(lead.id)
          synced++
        } else {
          const body = await res.json().catch(() => ({}))
          console.error('[Sync] Servidor recusou lead', lead.id, res.status, body?.message)
          failed++
        }
      } catch (err) {
        console.error('[Sync] Falha de rede ao enviar lead', lead.id, err.message)
        failed++
      }
    }
  } finally {
    isSyncing = false
  }

  return { synced, failed }
}
