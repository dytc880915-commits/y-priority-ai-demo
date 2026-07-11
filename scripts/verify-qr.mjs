import fs from 'node:fs'
import path from 'node:path'
import jsQR from 'jsqr'
import { PNG } from 'pngjs'

const expected = process.env.Y_PRIORITY_PUBLIC_URL || 'https://dytc880915-commits.github.io/y-priority-ai-demo/'
const imagePath = process.argv[2] || path.resolve('..', 'artifacts', 'public-demo', 'y-priority-ai-public-demo-qr.png')
const png = PNG.sync.read(fs.readFileSync(imagePath))
const pixels = new Uint8ClampedArray(png.data.buffer, png.data.byteOffset, png.data.byteLength)
const result = jsQR(pixels, png.width, png.height)

if (!result) throw new Error(`QR code not detected in ${imagePath}`)
if (result.data !== expected) throw new Error(`QR URL mismatch: ${result.data}`)

console.log(`QR_VERIFIED=${result.data}`)
