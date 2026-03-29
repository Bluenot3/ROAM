import { chromium } from 'playwright'

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Users\\AlexT\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1208\\chrome-headless-shell-win64\\chrome-headless-shell.exe',
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await page.goto('https://zenai.world', { waitUntil: 'load', timeout: 30000 })
await page.waitForTimeout(2000)

const title = await page.title()
console.log('Title:', title)

const links = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('a[href]')).map(a => ({
    text: a.innerText.trim().slice(0, 40),
    href: a.href
  })).filter(l => l.href && !l.href.startsWith('mailto:') && !l.href.startsWith('tel:') && !l.href.startsWith('javascript:'))
})

console.log('\nAll links found:', links.length)
const unique = [...new Map(links.map(l => [l.href, l])).values()]
unique.forEach(l => console.log(`  [${l.text}] → ${l.href}`))

// Check sitemap
try {
  await page.goto('https://zenai.world/sitemap.xml', { waitUntil: 'load', timeout: 10000 })
  const xml = await page.content()
  const urls = xml.match(/<loc>([^<]+)<\/loc>/g)?.map(m => m.replace(/<\/?loc>/g, '')) || []
  console.log('\nSitemap URLs:', urls.length)
  urls.forEach(u => console.log(' ', u))
} catch(e) {
  console.log('\nNo sitemap found:', e.message)
}

await browser.close()
