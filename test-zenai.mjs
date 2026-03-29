import http from 'http'

const data = JSON.stringify({
  url: 'https://zenai.world',
  settings: { maxPages: 10, primaryOnly: false, recordVideo: false }
})

const req = http.request({
  host: 'localhost', port: 3001, path: '/api/scan', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
}, res => {
  let body = ''
  res.on('data', c => body += c)
  res.on('end', () => {
    let parsed
    try { parsed = JSON.parse(body) } catch(e) { console.error('Bad JSON:', body); process.exit(1) }
    console.log('Response:', JSON.stringify(parsed))
    const { sessionId, error } = parsed
    if (error) { console.error('Error:', error); process.exit(1) }
    if (!sessionId) { console.error('No sessionId!'); process.exit(1) }

    console.log('SessionId:', sessionId, '— streaming events...\n')
    http.get(`http://localhost:3001/api/events/${sessionId}`, res2 => {
      res2.on('data', chunk => {
        const text = chunk.toString()
        process.stdout.write(text)
      })
      res2.on('end', () => { console.log('\nStream ended'); process.exit(0) })
    })
  })
})
req.write(data)
req.end()
