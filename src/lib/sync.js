import { getPendingLeads, markAsSynced } from './db'
import { pb } from './pocketbase'

// PocketBase valida formato de email — envia vazio se inválido
function safeEmail(email) {
  if (!email) return ''
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : ''
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

    // Tenta renovar o token se o usuário estiver autenticado
    if (pb.authStore.isValid) {
      try { await pb.collection('users').authRefresh() } catch (_) {}
    }

    for (const lead of pending) {
      try {
        await pb.collection('leads').create({
          name:        lead.name,
          email:       safeEmail(lead.email),
          phone:       lead.phone       || '',
          company:     lead.company     || '',
          role:        lead.role        || '',
          temperature: lead.temperature || 'warm',
          notes:       lead.notes       || '',
          device_id:   lead.device_id   || '',
          event_name:  lead.event_name  || '',
          badge_front: lead.badge_front || '',
          badge_back:  lead.badge_back  || '',
          captured_by: lead.captured_by || '',
          website:     lead.website     || '',
          created:     lead.created     || new Date().toISOString(),
        })
        await markAsSynced(lead.id)
        synced++
      } catch (err) {
        console.error('[Sync] Falha ao enviar lead', lead.id, err?.message || err)
        failed++
      }
    }
  } finally {
    isSyncing = false
  }

  return { synced, failed }
}
