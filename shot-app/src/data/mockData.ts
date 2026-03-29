export interface PageData {
  id: string
  path: string
  title: string
  category: string
  color: string
  gradient: string
  accent: string
  captured: boolean
  depth: number
  children?: string[]
  webPath?: string
}

export const PAGES: PageData[] = [
  {
    id: 'home', path: '/', title: 'Home', category: 'Landing',
    color: '#0d1117', gradient: 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)',
    accent: '#6366f1', captured: true, depth: 0, children: ['features','pricing','blog','docs']
  },
  {
    id: 'features', path: '/features', title: 'Features', category: 'Product',
    color: '#0f0f1a', gradient: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)',
    accent: '#8b5cf6', captured: true, depth: 1, children: ['features-api','features-analytics']
  },
  {
    id: 'pricing', path: '/pricing', title: 'Pricing', category: 'Landing',
    color: '#0a1628', gradient: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 100%)',
    accent: '#3b82f6', captured: true, depth: 1, children: ['pricing-enterprise']
  },
  {
    id: 'blog', path: '/blog', title: 'Blog', category: 'Blog',
    color: '#0f1a0f', gradient: 'linear-gradient(135deg, #0f1a0f 0%, #162816 100%)',
    accent: '#34d399', captured: true, depth: 1, children: ['blog-1','blog-2']
  },
  {
    id: 'docs', path: '/docs', title: 'Docs', category: 'Docs',
    color: '#1a140a', gradient: 'linear-gradient(135deg, #1a140a 0%, #2a1f0a 100%)',
    accent: '#fbbf24', captured: true, depth: 1, children: ['docs-api','docs-guides']
  },
  {
    id: 'features-api', path: '/features/api', title: 'API Access', category: 'Product',
    color: '#100a1a', gradient: 'linear-gradient(135deg, #100a1a 0%, #1e1228 100%)',
    accent: '#a78bfa', captured: true, depth: 2, children: []
  },
  {
    id: 'features-analytics', path: '/features/analytics', title: 'Analytics', category: 'Product',
    color: '#0a1020', gradient: 'linear-gradient(135deg, #0a1020 0%, #121c30 100%)',
    accent: '#60a5fa', captured: false, depth: 2, children: []
  },
  {
    id: 'pricing-enterprise', path: '/pricing/enterprise', title: 'Enterprise', category: 'Landing',
    color: '#0a1628', gradient: 'linear-gradient(135deg, #0a1628 0%, #0d2040 100%)',
    accent: '#38bdf8', captured: false, depth: 2, children: []
  },
  {
    id: 'blog-1', path: '/blog/launch', title: 'Product Launch', category: 'Blog',
    color: '#0e180e', gradient: 'linear-gradient(135deg, #0e180e 0%, #192819 100%)',
    accent: '#4ade80', captured: true, depth: 2, children: []
  },
  {
    id: 'blog-2', path: '/blog/roadmap', title: '2025 Roadmap', category: 'Blog',
    color: '#160e0e', gradient: 'linear-gradient(135deg, #160e0e 0%, #241414 100%)',
    accent: '#f87171', captured: false, depth: 2, children: []
  },
  {
    id: 'docs-api', path: '/docs/api', title: 'API Reference', category: 'Docs',
    color: '#1a140a', gradient: 'linear-gradient(135deg, #1a140a 0%, #2a200c 100%)',
    accent: '#fb923c', captured: true, depth: 2, children: []
  },
  {
    id: 'docs-guides', path: '/docs/guides', title: 'Guides', category: 'Docs',
    color: '#14180a', gradient: 'linear-gradient(135deg, #14180a 0%, #202a0e 100%)',
    accent: '#a3e635', captured: false, depth: 2, children: []
  },
]

export const CATEGORIES = ['All', 'Landing', 'Product', 'Blog', 'Docs']
