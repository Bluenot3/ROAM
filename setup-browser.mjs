// Copies Playwright's headless shell to C:\pw-browsers so it's accessible
// from any process regardless of OneDrive virtualization
import { cpSync, mkdirSync, existsSync } from 'fs'
import path from 'path'
import os from 'os'

const src = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright', 'chromium_headless_shell-1208')
const dest = 'C:\\pw-browsers\\chromium_headless_shell-1208'

if (!existsSync(src)) {
  console.error('Source browser not found:', src)
  process.exit(1)
}

if (existsSync(dest)) {
  console.log('Browser already installed at', dest)
  process.exit(0)
}

console.log('Copying browser from', src)
console.log('To:', dest)
console.log('(This is ~224MB, please wait...)')

mkdirSync('C:\\pw-browsers', { recursive: true })
cpSync(src, dest, { recursive: true })

console.log('Done! Browser ready at C:\\pw-browsers')
