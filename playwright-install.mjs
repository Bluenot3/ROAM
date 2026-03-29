import { spawn } from 'child_process'
import os from 'os'
import path from 'path'
import { existsSync } from 'fs'

const cwd = 'C:\\Users\\AlexT\\OneDrive\\Desktop\\Shot'
const node = 'C:\\Program Files\\nodejs\\node.exe'
const cli = path.join(cwd, 'node_modules', 'playwright', 'cli.js')

console.log('os.homedir():', os.homedir())
console.log('LOCALAPPDATA:', process.env.LOCALAPPDATA)

const headlessShell = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright', 'chromium_headless_shell-1208', 'chrome-headless-shell-win64', 'chrome-headless-shell.exe')
const fullChrome = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright', 'chromium-1208', 'chrome-win64', 'chrome.exe')
console.log('Headless shell exists:', existsSync(headlessShell), headlessShell)
console.log('Full chrome exists:', existsSync(fullChrome), fullChrome)
console.log('CLI exists:', existsSync(cli))

// Run playwright install
const child = spawn(node, [cli, 'install', 'chromium'], { cwd, stdio: 'inherit', shell: true })
child.on('close', code => { console.log('playwright install exited:', code); process.exit(code) })
