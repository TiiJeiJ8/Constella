const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const webRoot = path.resolve(__dirname, '..')
const serverRoot = process.env.CONSTELLA_SERVER_ROOT
    ? path.resolve(webRoot, process.env.CONSTELLA_SERVER_ROOT)
    : path.resolve(webRoot, '..', 'server')
const runtimeRoot = path.join(webRoot, '.electron-server-runtime')
const runtimeNextRoot = path.join(webRoot, '.electron-server-runtime-next')
const runtimePrevRoot = path.join(webRoot, '.electron-server-runtime-prev')

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
        throw new Error(`${command} ${args.join(' ')} failed with code ${result.status || 1}`)
    }
}

function sleep(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function removeDirWithRetry(target, retries = 6, delayMs = 300) {
    for (let i = 0; i < retries; i += 1) {
        try {
            fs.rmSync(target, { recursive: true, force: true })
            return
        } catch (error) {
            if (i === retries - 1) throw error
            sleep(delayMs * (i + 1))
        }
    }
}

removeDirWithRetry(runtimeNextRoot)
removeDirWithRetry(runtimePrevRoot)
fs.mkdirSync(runtimeNextRoot, { recursive: true })

if (!fs.existsSync(serverRoot) || !fs.statSync(serverRoot).isDirectory()) {
    throw new Error(`[prepare-server-runtime] Backend root does not exist: ${serverRoot}`)
}

copyFile(path.join(serverRoot, 'package.json'), path.join(runtimeNextRoot, 'package.json'))
copyFile(path.join(serverRoot, 'package-lock.json'), path.join(runtimeNextRoot, 'package-lock.json'))
copyDir(path.join(serverRoot, 'dist'), path.join(runtimeNextRoot, 'dist'))
copyDir(path.join(serverRoot, 'config'), path.join(runtimeNextRoot, 'config'))

try {
    run('npm', ['ci', '--omit=dev', '--no-audit', '--no-fund'], runtimeNextRoot)
} catch (error) {
    console.warn('[prepare-server-runtime] npm ci failed, fallback to copying server/node_modules.')
    console.warn(`[prepare-server-runtime] reason: ${error.message}`)
    copyDir(path.join(serverRoot, 'node_modules'), path.join(runtimeNextRoot, 'node_modules'))
}

if (fs.existsSync(runtimeRoot)) {
    fs.renameSync(runtimeRoot, runtimePrevRoot)
}
fs.renameSync(runtimeNextRoot, runtimeRoot)
removeDirWithRetry(runtimePrevRoot)
