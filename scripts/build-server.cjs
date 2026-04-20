const path = require('path')
const { spawnSync } = require('child_process')

const webRoot = path.resolve(__dirname, '..')
const configured = process.env.CONSTELLA_SERVER_ROOT
const serverRoot = configured
    ? path.resolve(webRoot, configured)
    : path.resolve(webRoot, '..', 'server')

const result = spawnSync('npm', ['run', 'build'], {
    cwd: serverRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
})

if (result.status !== 0) {
    process.exit(result.status || 1)
}
