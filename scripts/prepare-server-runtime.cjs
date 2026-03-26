const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const webRoot = path.resolve(__dirname, '..')
const serverRoot = path.resolve(webRoot, '..', 'server')
const runtimeRoot = path.join(webRoot, '.electron-server-runtime')

function copyDir(from, to) {
    fs.cpSync(from, to, { recursive: true, force: true })
}

function copyFile(from, to) {
    fs.copyFileSync(from, to)
}

function run(command, args, cwd) {
    const result = spawnSync(command, args, {
        cwd,
        stdio: 'inherit',
        shell: process.platform === 'win32',
    })

    if (result.status !== 0) {
        process.exit(result.status || 1)
    }
}

fs.rmSync(runtimeRoot, { recursive: true, force: true })
fs.mkdirSync(runtimeRoot, { recursive: true })

copyFile(path.join(serverRoot, 'package.json'), path.join(runtimeRoot, 'package.json'))
copyFile(path.join(serverRoot, 'package-lock.json'), path.join(runtimeRoot, 'package-lock.json'))
copyDir(path.join(serverRoot, 'dist'), path.join(runtimeRoot, 'dist'))
copyDir(path.join(serverRoot, 'config'), path.join(runtimeRoot, 'config'))

run('npm', ['ci', '--omit=dev', '--no-audit', '--no-fund'], runtimeRoot)
