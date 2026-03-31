// Gera ícones PNG a partir de SVG usando a API do browser via Vite preview
// Alternativa: cria PNGs mínimos válidos em puro Node.js

import { writeFileSync } from 'fs'
import { deflateSync } from 'zlib'

function makePNG(size, r, g, b) {
  // Cria PNG sólido size x size com a cor RGB especificada
  function u32(n) {
    const b = Buffer.alloc(4)
    b.writeUInt32BE(n)
    return b
  }

  function chunk(type, data) {
    const typeB = Buffer.from(type, 'ascii')
    const crcData = Buffer.concat([typeB, data])
    // CRC32
    let crc = 0xffffffff
    for (const byte of crcData) {
      crc ^= byte
      for (let i = 0; i < 8; i++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
      }
    }
    crc = (crc ^ 0xffffffff) >>> 0
    return Buffer.concat([u32(data.length), typeB, data, u32(crc)])
  }

  // IHDR
  const ihdr = Buffer.concat([u32(size), u32(size), Buffer.from([8, 2, 0, 0, 0])])

  // IDAT — linha de pixels (filter byte 0 + R G B por pixel)
  const row = Buffer.alloc(1 + size * 3)
  row[0] = 0 // filter none
  for (let x = 0; x < size; x++) {
    row[1 + x * 3] = r
    row[2 + x * 3] = g
    row[3 + x * 3] = b
  }
  const raw = Buffer.concat(Array(size).fill(row))
  const compressed = deflateSync(raw)

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Laranja BuyHelp: #FF6B35 = 255, 107, 53
writeFileSync('public/icon-192.png', makePNG(192, 255, 107, 53))
writeFileSync('public/icon-512.png', makePNG(512, 255, 107, 53))
writeFileSync('public/apple-touch-icon.png', makePNG(180, 255, 107, 53))
console.log('✅ Ícones gerados: icon-192.png, icon-512.png, apple-touch-icon.png')
