import { createServer } from 'http'
import { readFileSync, existsSync } from 'fs'
import { join, extname } from 'path'

const DIST = 'C:\\Users\\AlexT\\AppData\\Roaming\\Claude\\local-agent-mode-sessions\\skills-plugin\\732ee9c1-9c11-4989-a96c-7088c526cd19\\d5f5cfd9-a792-4d84-bd06-d3404d5b4f58\\skills\\web-artifacts-builder\\shot-app\\dist'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
}

createServer((req, res) => {
  let url = req.url === '/' ? '/index.html' : req.url.split('?')[0]
  const filePath = join(DIST, url)

  if (existsSync(filePath)) {
    const ext = extname(filePath)
    const mime = MIME[ext] || 'text/plain'
    res.writeHead(200, { 'Content-Type': mime })
    res.end(readFileSync(filePath))
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(readFileSync(join(DIST, 'index.html')))
  }
}).listen(4173, () => console.log('Serving dist at http://localhost:4173'))
