import { spawn } from 'child_process'
import { join } from 'path'

const cwd = 'C:\\Users\\AlexT\\AppData\\Roaming\\Claude\\local-agent-mode-sessions\\skills-plugin\\732ee9c1-9c11-4989-a96c-7088c526cd19\\d5f5cfd9-a792-4d84-bd06-d3404d5b4f58\\skills\\web-artifacts-builder\\shot-app'

const child = spawn('npm', ['run', 'build'], {
  cwd,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PATH: 'C:\\Program Files\\nodejs;' + process.env.PATH }
})

child.on('close', code => {
  console.log('\nBuild exited with code', code)
  process.exit(code)
})
