export interface ScanSettings {
  maxPages?: number
  primaryOnly?: boolean
  viewportWidth?: number
  viewportHeight?: number
  fullPage?: boolean
  recordVideo?: boolean
  waitTime?: number
  scrollForScreenshot?: boolean
}

export interface Screenshot {
  id: string
  filename: string
  url: string
  title: string
  webPath: string
  category: string
  depth: number
  index: number
  capturedAt: string
}

export interface ScanSession {
  id: string
  url: string
  settings: ScanSettings
  status: 'pending' | 'running' | 'preview_ready' | 'complete' | 'error'
  screenshots: Screenshot[]
  videoPath: string | null
  discoveredPages: Array<{ url: string; title: string; depth: number; category: string; index: number }>
  createdAt: string
  error?: string
}

const BASE = ''  // proxied through vite dev server → http://localhost:3001

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('roam_token')
  return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' }
}

export async function startScan(url: string, settings: ScanSettings = {}): Promise<{ sessionId: string }> {
  const res = await fetch(`${BASE}/api/scan`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ url, settings }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Failed to start scan')
  }
  return res.json()
}

export async function getScan(sessionId: string): Promise<ScanSession> {
  const res = await fetch(`${BASE}/api/scan/${sessionId}`)
  if (!res.ok) throw new Error('Session not found')
  return res.json()
}

export function createEventSource(sessionId: string): EventSource {
  return new EventSource(`${BASE}/api/events/${sessionId}`)
}

export async function sendAiPrompt(
  prompt: string,
  context?: unknown
): Promise<{ response: string }> {
  const res = await fetch(`${BASE}/api/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, context }),
  })
  if (!res.ok) throw new Error('AI request failed')
  return res.json()
}

export async function continueScan(sessionId: string, selectedUrls: string[] | null = null): Promise<void> {
  const res = await fetch(`${BASE}/api/sessions/${sessionId}/continue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectedUrls }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Failed to continue scan')
  }
}

export async function listSessions(): Promise<ScanSession[]> {
  const res = await fetch(`${BASE}/api/sessions`)
  if (!res.ok) return []
  return res.json()
}

export async function exportScan(
  sessionId: string,
  type: 'zip' | 'pdf' | 'video',
  selected: string[] = []
): Promise<string> {
  const res = await fetch(`${BASE}/api/export/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, selected }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Export failed')
  }
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}
