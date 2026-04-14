const fs = require('fs')
const path = require('path')
const https = require('https')
const { spawnSync } = require('child_process')

const webRoot = path.resolve(__dirname, '..')
const runtimeRoot = path.join(webRoot, '.electron-node-runtime')
const cacheRoot = path.join(webRoot, '.cache', 'node-runtime')

const NODE_VERSION = '22.12.0'
const TARGET_PLATFORM = 'win'
const TARGET_ARCH = 'x64'
const ARCHIVE_BASENAME = `node-v${NODE_VERSION}-${TARGET_PLATFORM}-${TARGET_ARCH}`
const ARCHIVE_FILE = `${ARCHIVE_BASENAME}.zip`
const DOWNLOAD_URL = `https://nodejs.org/dist/v${NODE_VERSION}/${ARCHIVE_FILE}`
const RUNTIME_TARGET_DIR = path.join(runtimeRoot, `${TARGET_PLATFORM}-${TARGET_ARCH}`)
const CACHE_ARCHIVE_PATH = path.join(cacheRoot, ARCHIVE_FILE)
const EXTRACT_ROOT = path.join(cacheRoot, ARCHIVE_BASENAME)
const TEMP_EXTRACT_DIR = path.join(cacheRoot, `${ARCHIVE_BASENAME}-extract`)

function ensureDir(targetPath) {
    fs.mkdirSync(targetPath, { recursive: true })
    return targetPath
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

function downloadFile(url, destination) {
    return new Promise((resolve, reject) => {
        ensureDir(path.dirname(destination))
        const file = fs.createWriteStream(destination)

        const request = https.get(url, (response) => {
            if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                file.close(() => fs.rmSync(destination, { force: true }))
                downloadFile(response.headers.location, destination).then(resolve).catch(reject)
                return
            }

            if (response.statusCode !== 200) {
                file.close(() => fs.rmSync(destination, { force: true }))
                reject(new Error(`Failed to download Node runtime: HTTP ${response.statusCode || 'unknown'}`))
                return
            }

            response.pipe(file)
            file.on('finish', () => {
                file.close(resolve)
            })
        })

        request.on('error', (error) => {
            file.close(() => fs.rmSync(destination, { force: true }))
            reject(error)
        })

        file.on('error', (error) => {
            request.destroy(error)
            file.close(() => fs.rmSync(destination, { force: true }))
            reject(error)
        })
    })
}

function run(command, args) {
    const result = spawnSync(command, args, {
        stdio: 'inherit',
        shell: process.platform === 'win32'
    })

    if (result.status !== 0) {
        throw new Error(`${command} ${args.join(' ')} failed with code ${result.status || 1}`)
    }
}

function expandArchive(zipPath, destination) {
    removeDirWithRetry(destination)
    ensureDir(destination)

    const command = [
        'Expand-Archive',
        '-LiteralPath',
        `'${zipPath.replace(/'/g, "''")}'`,
        '-DestinationPath',
        `'${destination.replace(/'/g, "''")}'`,
        '-Force'
    ].join(' ')

    run('powershell', ['-NoProfile', '-Command', command])
}

function resolveExtractedNodeDir(extractDir) {
    const directMatch = path.join(extractDir, ARCHIVE_BASENAME)
    if (fs.existsSync(directMatch)) return directMatch

    const entries = fs.readdirSync(extractDir, { withFileTypes: true })
    const firstDirectory = entries.find((entry) => entry.isDirectory())
    if (!firstDirectory) {
        throw new Error(`Unable to locate extracted Node runtime under ${extractDir}`)
    }
    return path.join(extractDir, firstDirectory.name)
}

function copyRuntime(nodeDir, destination) {
    removeDirWithRetry(destination)
    ensureDir(destination)

    const nodeExe = path.join(nodeDir, 'node.exe')
    const licenseFile = path.join(nodeDir, 'LICENSE')

    if (!fs.existsSync(nodeExe)) {
        throw new Error(`node.exe not found in extracted runtime: ${nodeExe}`)
    }

    fs.copyFileSync(nodeExe, path.join(destination, 'node.exe'))
    if (fs.existsSync(licenseFile)) {
        fs.copyFileSync(licenseFile, path.join(destination, 'LICENSE'))
    }

    const manifest = {
        nodeVersion: NODE_VERSION,
        platform: TARGET_PLATFORM,
        arch: TARGET_ARCH,
        source: DOWNLOAD_URL,
        preparedAt: new Date().toISOString()
    }
    fs.writeFileSync(path.join(destination, 'runtime.json'), JSON.stringify(manifest, null, 2), 'utf8')
}

async function main() {
    ensureDir(cacheRoot)
    ensureDir(runtimeRoot)

    if (!fs.existsSync(CACHE_ARCHIVE_PATH)) {
        console.log(`[prepare-node-runtime] Downloading ${DOWNLOAD_URL}`)
        await downloadFile(DOWNLOAD_URL, CACHE_ARCHIVE_PATH)
    } else {
        console.log(`[prepare-node-runtime] Reusing cached archive ${CACHE_ARCHIVE_PATH}`)
    }

    expandArchive(CACHE_ARCHIVE_PATH, TEMP_EXTRACT_DIR)
    const nodeDir = resolveExtractedNodeDir(TEMP_EXTRACT_DIR)
    copyRuntime(nodeDir, RUNTIME_TARGET_DIR)
    removeDirWithRetry(TEMP_EXTRACT_DIR)

    console.log(`[prepare-node-runtime] Bundled Node runtime ready at ${RUNTIME_TARGET_DIR}`)
}

main().catch((error) => {
    console.error('[prepare-node-runtime] Failed to prepare bundled Node runtime.')
    console.error(error instanceof Error ? error.stack || error.message : error)
    process.exit(1)
})
