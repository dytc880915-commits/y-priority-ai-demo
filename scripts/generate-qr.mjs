import fs from 'node:fs/promises'
import path from 'node:path'
import QRCode from 'qrcode'

const url = process.env.Y_PRIORITY_PUBLIC_URL || 'https://dytc880915-commits.github.io/y-priority-ai-demo/'
const outputDir = process.env.Y_PRIORITY_QR_DIR || path.resolve('..', 'artifacts', 'public-demo')
const pngPath = path.join(outputDir, 'y-priority-ai-public-demo-qr.png')
const svgPath = path.join(outputDir, 'y-priority-ai-public-demo-qr.svg')
const common = {
  errorCorrectionLevel: 'H',
  margin: 4,
  color: { dark: '#124C54', light: '#FFFFFF' },
}

await fs.mkdir(outputDir, { recursive: true })
await QRCode.toFile(pngPath, url, { ...common, type: 'png', width: 1200 })
await QRCode.toFile(svgPath, url, { ...common, type: 'svg', width: 1200 })

console.log(JSON.stringify({ url, pngPath, svgPath }, null, 2))
