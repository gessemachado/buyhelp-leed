import { Capacitor } from '@capacitor/core'

const isNative = () => Capacitor.isNativePlatform()

let sqliteDB = null

async function initNative() {
  const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite')
  const sqlite = new SQLiteConnection(CapacitorSQLite)
  sqliteDB = await sqlite.createConnection('buyhelp', false, 'no-encryption', 1, false)
  await sqliteDB.open()
  await sqliteDB.execute(`
    CREATE TABLE IF NOT EXISTS leads (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      email       TEXT,
      phone       TEXT,
      company     TEXT,
      role        TEXT,
      temperature TEXT DEFAULT 'warm',
      notes       TEXT,
      device_id   TEXT,
      event_name  TEXT,
      badge_front TEXT,
      badge_back  TEXT,
      captured_by TEXT,
      created     TEXT DEFAULT (datetime('now')),
      synced      INTEGER DEFAULT 0
    );
  `)
  // Migrações para instalações antigas
  try { await sqliteDB.execute(`ALTER TABLE leads ADD COLUMN badge_front  TEXT DEFAULT ''`) } catch {}
  try { await sqliteDB.execute(`ALTER TABLE leads ADD COLUMN badge_back   TEXT DEFAULT ''`) } catch {}
  try { await sqliteDB.execute(`ALTER TABLE leads ADD COLUMN captured_by TEXT DEFAULT ''`) } catch {}
}

const WEB_KEY = 'buyhelp_leads'

function webGetAll() {
  try { return JSON.parse(localStorage.getItem(WEB_KEY) || '[]') } catch { return [] }
}

function webSave(leads) {
  localStorage.setItem(WEB_KEY, JSON.stringify(leads))
}

export async function initDB() {
  if (isNative()) await initNative()
}

export async function saveLead(data) {
  if (isNative()) {
    const result = await sqliteDB.run(
      `INSERT INTO leads (name, email, phone, company, role, temperature, notes, device_id, event_name, badge_front, badge_back, captured_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.email       || '',
        data.phone       || '',
        data.company     || '',
        data.role        || '',
        data.temperature || 'warm',
        data.notes       || '',
        data.deviceId    || '',
        data.eventName   || '',
        data.badgeFront  || '',
        data.badgeBack   || '',
        data.capturedBy  || '',
      ]
    )
    return result.changes?.lastId
  }

  const leads = webGetAll()
  const id = Date.now()
  leads.unshift({
    id,
    name:         data.name,
    email:        data.email       || '',
    phone:        data.phone       || '',
    company:      data.company     || '',
    role:         data.role        || '',
    temperature:  data.temperature || 'warm',
    notes:        data.notes       || '',
    device_id:    data.deviceId    || 'web',
    event_name:   data.eventName   || '',
    badge_front:  data.badgeFront  || '',
    badge_back:   data.badgeBack   || '',
    captured_by:  data.capturedBy  || '',
    created:      new Date().toISOString(),
    synced:       0,
  })
  webSave(leads)
  return id
}

export async function getPendingLeads() {
  if (isNative()) {
    const result = await sqliteDB.query(`SELECT * FROM leads WHERE synced = 0 ORDER BY created DESC`)
    return result.values ?? []
  }
  return webGetAll().filter(l => l.synced === 0)
}

export async function getAllLeads() {
  if (isNative()) {
    const result = await sqliteDB.query(`SELECT * FROM leads ORDER BY created DESC`)
    return result.values ?? []
  }
  return webGetAll()
}

export async function markAsSynced(id) {
  if (isNative()) {
    await sqliteDB.run(`UPDATE leads SET synced = 1 WHERE id = ?`, [id])
    return
  }
  const leads = webGetAll().map(l => l.id === id ? { ...l, synced: 1 } : l)
  webSave(leads)
}

export async function getPendingCount() {
  if (isNative()) {
    const result = await sqliteDB.query(`SELECT COUNT(*) as count FROM leads WHERE synced = 0`)
    return result.values?.[0]?.count ?? 0
  }
  return webGetAll().filter(l => l.synced === 0).length
}

export async function getLeadsCount() {
  if (isNative()) {
    const result = await sqliteDB.query(`SELECT COUNT(*) as count FROM leads`)
    return result.values?.[0]?.count ?? 0
  }
  return webGetAll().length
}
