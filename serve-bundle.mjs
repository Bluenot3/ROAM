import { createServer } from 'http'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BUNDLE = join(__dirname, 'bundle.html')
const PORT = 4173

const html = readFileSync(BUNDLE, 'utf8')

createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(html)
}).listen(PORT, () => console.log(`Shot preview at http://localhost:${PORT}`))
