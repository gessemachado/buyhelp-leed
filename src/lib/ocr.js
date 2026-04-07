import Tesseract from 'tesseract.js'
import jsQR from 'jsqr'

// --- QR Code ---

function readQRFromImage(file) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      URL.revokeObjectURL(img.src)
      resolve(code ? code.data : null)
    }
    img.onerror = () => resolve(null)
    img.src = URL.createObjectURL(file)
  })
}

function parseVCard(text) {
  const result = {}
  const fn = text.match(/FN[^:]*:(.+)/i)
  if (fn) result.name = fn[1].trim()
  const tel = text.match(/TEL[^:]*:(.+)/i)
  if (tel) result.phone = tel[1].replace(/\D/g, '').slice(-11)
  const email = text.match(/EMAIL[^:]*:(.+)/i)
  if (email) result.email = email[1].trim()
  return result
}

function parseQRData(data) {
  if (!data) return {}
  // vCard
  if (data.includes('BEGIN:VCARD')) return parseVCard(data)
  // JSON
  try {
    const json = JSON.parse(data)
    return {
      name:  json.name  || json.nome  || '',
      email: json.email || json.mail  || '',
      phone: (json.phone || json.tel  || json.telefone || '').replace(/\D/g, '').slice(-11),
    }
  } catch { /* not JSON */ }
  // URL com params
  try {
    const url = new URL(data)
    return {
      name:  url.searchParams.get('name')  || url.searchParams.get('nome')  || '',
      email: url.searchParams.get('email') || '',
      phone: (url.searchParams.get('phone') || url.searchParams.get('tel') || '').replace(/\D/g, '').slice(-11),
    }
  } catch { /* not URL */ }
  return {}
}

// --- OCR de Texto ---

async function readTextFromImage(file) {
  const { data: { text } } = await Tesseract.recognize(file, 'por+eng', {
    logger: () => {},
  })
  return text
}

function extractEmail(text) {
  const match = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/i)
  return match ? match[0].toLowerCase() : ''
}

function extractPhone(text) {
  // Padrões brasileiros: (11) 99999-9999 / 11999999999 / +55 11 99999-9999
  const match = text.match(/(?:\+55\s?)?(?:\(?\d{2}\)?[\s\-]?)?\d{4,5}[\s\-]?\d{4}/)
  if (!match) return ''
  return match[0].replace(/\D/g, '').slice(-11)
}

// Palavras que nunca são nomes de pessoa
const NON_NAME_WORDS = [
  'CONGRESSISTA', 'PARTICIPANT', 'PARTICIPANTE', 'EXPOSITOR', 'PALESTRANTE',
  'VISITANTE', 'STAFF', 'SUMMIT', 'EVENTO', 'FAIR', 'EXPO', 'AUTOCOM',
  'ITAU', 'ITAÚ', 'BADGE', 'CRACHA', 'CRACHÁ',
]

function toTitleCase(str) {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

function isLikelyName(line) {
  const trimmed = line.trim()
  if (trimmed.length < 5 || trimmed.length > 50) return false
  if (/\d/.test(trimmed)) return false
  // Verifica se é palavra proibida
  const upper = trimmed.toUpperCase()
  if (NON_NAME_WORDS.some(w => upper.includes(w))) return false
  // Aceita "FLAVIO SILVA" (all caps, 2+ palavras) ou "Flavio Silva" (title case)
  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length < 2) return false
  const isAllCaps = words.every(w => w === w.toUpperCase() && /^[A-ZÀ-Ú]+$/.test(w))
  const isTitleCase = words.every(w => /^[A-ZÀ-Ú][a-zà-ú]+$/.test(w))
  return isAllCaps || isTitleCase
}

function extractName(text) {
  const clean = text
    .replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/gi, '')
    .replace(/(?:\+55\s?)?(?:\(?\d{2}\)?[\s\-]?)?\d{4,5}[\s\-]?\d{4}/g, '')

  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean)
  const nameLine = lines.find(isLikelyName)
  if (!nameLine) return ''
  // Normaliza para Title Case se estiver em CAIXA ALTA
  const words = nameLine.split(/\s+/).filter(Boolean)
  const isAllCaps = words.every(w => w === w.toUpperCase() && /^[A-ZÀ-Ú]+$/.test(w))
  return isAllCaps ? toTitleCase(nameLine) : nameLine
}

function extractCompany(text) {
  // Pega linha após o nome que pareça empresa (mixed case, sem números)
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2 && !/\d/.test(l))
  const nameIdx = lines.findIndex(isLikelyName)
  if (nameIdx === -1 || nameIdx + 1 >= lines.length) return ''
  const candidate = lines[nameIdx + 1]
  // Não deve ser cargo (evita "Sócio / Proprietário" como empresa)
  if (/\/|sócio|gerente|diretor|coordenador|analista/i.test(candidate)) return ''
  return candidate
}

function extractRole(text) {
  const rolePatterns = [
    /sócio\s*\/?\s*proprietário/i,
    /gerente\s+\w+/i,
    /diretor\s+\w*/i,
    /coordenador\s*\w*/i,
    /analista\s+\w*/i,
    /desenvolvedor/i,
    /supervisor/i,
  ]
  for (const pattern of rolePatterns) {
    const match = text.match(pattern)
    if (match) return match[0].trim()
  }
  return ''
}

// --- API pública ---

export async function scanBadge(file, onProgress) {
  onProgress?.('qr')
  const qrData = await readQRFromImage(file)
  const fromQR = parseQRData(qrData)

  // Se QR retornou nome + pelo menos um contato, usa direto
  if (fromQR.name && (fromQR.email || fromQR.phone)) {
    return fromQR
  }

  onProgress?.('ocr')
  const text = await readTextFromImage(file)

  return {
    name:    fromQR.name  || extractName(text),
    email:   fromQR.email || extractEmail(text),
    phone:   fromQR.phone || extractPhone(text),
    company: extractCompany(text),
    role:    extractRole(text),
  }
}
