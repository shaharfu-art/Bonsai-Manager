// Generate minimal PWA icons (solid green square with white circle)
// Uses a minimal PNG encoder without dependencies
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { deflateSync } from 'node:zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))

function createPNG(size) {
  // Create raw RGBA pixel data - green background
  const pixels = Buffer.alloc(size * size * 4)
  const centerX = size / 2
  const centerY = size / 2
  const radius = size * 0.4

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
      
      if (dist < radius) {
        // White circle (leaf area)
        pixels[idx] = 255     // R
        pixels[idx + 1] = 255 // G
        pixels[idx + 2] = 255 // B
        pixels[idx + 3] = 255 // A
      } else {
        // Green background (#2d6a4f)
        pixels[idx] = 45      // R
        pixels[idx + 1] = 106 // G
        pixels[idx + 2] = 79  // B
        pixels[idx + 3] = 255 // A
      }
    }
  }

  // Add a simple leaf shape (green on white circle)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
      if (dist >= radius) continue
      
      // Simple leaf: ellipse tilted
      const nx = (x - centerX) / radius
      const ny = (y - centerY) / radius
      const rotX = nx * 0.7 + ny * 0.7
      const rotY = -nx * 0.7 + ny * 0.7
      
      if ((rotX * rotX) / 0.15 + (rotY * rotY) / 0.6 < 1) {
        const idx = (y * size + x) * 4
        pixels[idx] = 45      // R
        pixels[idx + 1] = 160 // G
        pixels[idx + 2] = 79  // B
        pixels[idx + 3] = 255 // A
      }
    }
  }

  // Encode as PNG using zlib
  
  // PNG file structure
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  
  // IHDR chunk
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)  // width
  ihdr.writeUInt32BE(size, 4)  // height
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // color type (RGBA)
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace
  
  // Raw image data with filter bytes
  const rawData = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    rawData[y * (size * 4 + 1)] = 0 // no filter
    pixels.copy(rawData, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  
  const compressed = deflateSync(rawData)
  
  function createChunk(type, data) {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const typeBuffer = Buffer.from(type)
    const crcData = Buffer.concat([typeBuffer, data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(crcData) >>> 0)
    return Buffer.concat([len, typeBuffer, data, crc])
  }
  
  function crc32(buf) {
    let crc = -1
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i]
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
      }
    }
    return ~crc
  }
  
  const ihdrChunk = createChunk('IHDR', ihdr)
  const idatChunk = createChunk('IDAT', compressed)
  const iendChunk = createChunk('IEND', Buffer.alloc(0))
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

const png192 = createPNG(192)
const png512 = createPNG(512)

writeFileSync(join(__dirname, '..', 'public', 'pwa-192x192.png'), png192)
writeFileSync(join(__dirname, '..', 'public', 'pwa-512x512.png'), png512)

console.log('✅ Generated pwa-192x192.png and pwa-512x512.png')
