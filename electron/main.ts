import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { spawn, ChildProcess } from 'child_process'
import Bonjour, { Service } from 'bonjour-service'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DISCOVERY_SERVICE_TYPE = 'constella'
const DISCOVERY_SERVICE_PROTOCOL = 'tcp'
const DISCOVERY_SCAN_TIMEOUT_MS = 1800
const DISCOVERY_FALLBACK_PORTS = [3000]
const DISCOVERY_FALLBACK_MAX_HOSTS = 256
const DISCOVERY_FALLBACK_CONCURRENCY = 32
const DISCOVERY_FALLBACK_TIMEOUT_MS = 220

interface LanServerDescriptor {
    id: string
    name: string
    url: string
    host: string
    port: number
    apiPrefix: string
    websocketPath: string
    instanceId: string
    version: string
    addresses: string[]
    discoveredAt: string
}

interface ExportDocumentPdfPayload {
    html: string
    fileName: string
    orientation?: 'portrait' | 'landscape'
}

let mainWindow: BrowserWindow | null = null
let serverProcess: ChildProcess | null = null

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        frame: false,
        transparent: false,
        backgroundColor: '#ffffff',
        roundedCorners: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            sandbox: false,
            webSecurity: false
        }
    })

    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
        mainWindow.webContents.openDevTools()
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    }

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

function isIPv4Address(value: string): boolean {
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(value)
}

function getAddressPreferenceScore(value: string): number {
    if (isIPv4Address(value)) return 2
    if (value.includes(':')) return 1
    return 0
}

function sortAddressesByPreference(addresses: string[]): string[] {
    return [...addresses].sort((left, right) => {
        const scoreDiff = getAddressPreferenceScore(right) - getAddressPreferenceScore(left)
        if (scoreDiff !== 0) return scoreDiff
        return left.localeCompare(right)
    })
}

function isUsableAddress(value: string): boolean {
    if (!value) {
        return false
    }

    if (isIPv4Address(value)) {
        return value !== '0.0.0.0' && !value.startsWith('127.') && !value.startsWith('169.254.')
    }

    return true
}

function normalizeTxtValue(value: unknown, fallback = ''): string {
    if (typeof value === 'string') {
        return value
    }

    if (Buffer.isBuffer(value)) {
        return value.toString('utf8')
    }

    if (value == null) {
        return fallback
    }

    return String(value)
}

function pickServiceAddresses(service: Service): string[] {
    const addresses = [...(service.addresses || [])]

    if (service.referer?.address) {
        addresses.push(service.referer.address)
    }

    return sortAddressesByPreference(Array.from(new Set(addresses.filter(isUsableAddress))))
}

function buildServiceUrl(address: string, port: number): string {
    const host = address.includes(':') && !address.startsWith('[') ? `[${address}]` : address
    return `http://${host}:${port}`
}

function isPrivateIpv4Address(value: string): boolean {
    if (!isIPv4Address(value)) {
        return false
    }

    const [a, b] = value.split('.').map(Number)

    if (a === 10) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true

    return false
}

function getLocalPrivateIpv4Addresses(): string[] {
    const interfaces = os.networkInterfaces()
    const addresses = new Set<string>()
    const skipPatterns = ['vmware', 'virtual', 'vbox', 'hyper-v', 'docker', 'loopback', 'tailscale', 'vethernet']

    for (const [name, entries] of Object.entries(interfaces)) {
        if (!entries) continue
        const normalizedName = name.toLowerCase()
        if (skipPatterns.some((pattern) => normalizedName.includes(pattern))) {
            continue
        }

        for (const item of entries) {
            if (!item || item.family !== 'IPv4' || item.internal) continue
            if (!isPrivateIpv4Address(item.address)) continue
            if (item.address.startsWith('169.254.')) continue
            addresses.add(item.address)
        }
    }

    return Array.from(addresses)
}

function buildSubnetCandidates(): string[] {
    const localAddresses = getLocalPrivateIpv4Addresses()
    const hosts = new Set<string>()
    const subnets = Array.from(
        new Set(
            localAddresses
                .map((address) => {
                    const parts = address.split('.')
                    return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}` : ''
                })
                .filter(Boolean)
        )
    ).sort((left, right) => {
        const leftIs192 = left.startsWith('192.168.')
        const rightIs192 = right.startsWith('192.168.')
        if (leftIs192 !== rightIs192) return leftIs192 ? -1 : 1

        const leftIs10 = left.startsWith('10.')
        const rightIs10 = right.startsWith('10.')
        if (leftIs10 !== rightIs10) return leftIs10 ? -1 : 1

        return left.localeCompare(right)
    })

    for (const prefix of subnets) {
        const selfHosts = new Set<number>()
        for (const address of localAddresses) {
            if (!address.startsWith(`${prefix}.`)) continue
            const host = Number(address.split('.')[3])
            if (Number.isInteger(host) && host >= 1 && host <= 254) {
                selfHosts.add(host)
            }
        }

        for (let i = 1; i <= 254; i += 1) {
            if (selfHosts.has(i)) continue
            hosts.add(`${prefix}.${i}`)
            if (hosts.size >= DISCOVERY_FALLBACK_MAX_HOSTS) {
                return Array.from(hosts)
            }
        }
    }

    return Array.from(hosts)
}

function withTimeoutSignal(timeoutMs: number): AbortSignal {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), timeoutMs)
    return controller.signal
}

function mapHealthPayloadToDiscoveredServer(baseUrl: string, payload: unknown): LanServerDescriptor | null {
    if (!payload || typeof payload !== 'object') {
        return null
    }

    const root = payload as Record<string, unknown>
    const data = (root.data || {}) as Record<string, unknown>
    const appName = normalizeTxtValue(data.app, '')

    if (appName !== 'constella') {
        return null
    }

    let parsed: URL
    try {
        parsed = new URL(baseUrl)
    } catch {
        return null
    }

    const host = parsed.hostname
    const port = Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 80))
    const instanceId = normalizeTxtValue(data.instanceId, `${host}:${port}`)
    const serverName = normalizeTxtValue(data.serverName, host)
    const apiPrefix = normalizeTxtValue(data.apiPrefix, '/api/v1')
    const websocketPath = normalizeTxtValue(data.websocketPath, '/ws')
    const version = normalizeTxtValue(data.version, '')

    return {
        id: instanceId,
        name: serverName,
        url: parsed.origin,
        host,
        port,
        apiPrefix,
        websocketPath,
        instanceId,
        version,
        addresses: [host],
        discoveredAt: new Date().toISOString()
    }
}

async function probeLanServer(host: string, port: number): Promise<LanServerDescriptor | null> {
    const baseUrl = `http://${host}:${port}`
    const healthUrl = `${baseUrl}/api/v1/health`

    try {
        const response = await fetch(healthUrl, {
            method: 'GET',
            signal: withTimeoutSignal(DISCOVERY_FALLBACK_TIMEOUT_MS)
        })

        if (!response.ok) {
            return null
        }

        const payload = await response.json()
        return mapHealthPayloadToDiscoveredServer(baseUrl, payload)
    } catch {
        return null
    }
}

async function runWithConcurrency<T>(
    tasks: Array<() => Promise<T>>,
    concurrency: number
): Promise<T[]> {
    const results: T[] = []
    let index = 0

    async function worker() {
        while (index < tasks.length) {
            const current = index
            index += 1

            const result = await tasks[current]()
            results.push(result)
        }
    }

    const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker())
    await Promise.all(workers)

    return results
}

async function discoverLanServersBySubnetFallback(): Promise<LanServerDescriptor[]> {
    const candidates = buildSubnetCandidates()
    if (candidates.length === 0) {
        return []
    }

    const tasks: Array<() => Promise<LanServerDescriptor | null>> = []

    for (const host of candidates) {
        for (const port of DISCOVERY_FALLBACK_PORTS) {
            tasks.push(() => probeLanServer(host, port))
        }
    }

    const probeResults = await runWithConcurrency(tasks, DISCOVERY_FALLBACK_CONCURRENCY)
    const discovered = new Map<string, LanServerDescriptor>()

    for (const item of probeResults) {
        if (!item) continue
        discovered.set(item.id, item)
    }

    return Array.from(discovered.values())
}

function mapDiscoveredService(service: Service): LanServerDescriptor | null {
    const addresses = pickServiceAddresses(service)
    const primaryAddress = addresses[0]

    if (!primaryAddress || !service.port) {
        return null
    }

    const txt = (service.txt || {}) as Record<string, unknown>
    const instanceId = normalizeTxtValue(txt.instanceId, `${service.name}-${primaryAddress}-${service.port}`)
    const apiPrefix = normalizeTxtValue(txt.apiPrefix, '/api/v1')
    const websocketPath = normalizeTxtValue(txt.websocketPath, '/ws')
    const version = normalizeTxtValue(txt.version, '')

    return {
        id: instanceId,
        name: normalizeTxtValue(txt.serverName, service.name),
        url: buildServiceUrl(primaryAddress, service.port),
        host: primaryAddress,
        port: service.port,
        apiPrefix,
        websocketPath,
        instanceId,
        version,
        addresses,
        discoveredAt: new Date().toISOString()
    }
}

function mergeDiscoveredServer(
    current: LanServerDescriptor,
    next: LanServerDescriptor
): LanServerDescriptor {
    const currentScore = getAddressPreferenceScore(current.host)
    const nextScore = getAddressPreferenceScore(next.host)
    const preferred = nextScore > currentScore ? next : current
    const mergedAddresses = sortAddressesByPreference(
        Array.from(new Set([...(current.addresses || []), ...(next.addresses || [])]))
    )

    return {
        ...preferred,
        addresses: mergedAddresses,
        discoveredAt: next.discoveredAt
    }
}

async function discoverLanServers(timeoutMs = DISCOVERY_SCAN_TIMEOUT_MS): Promise<LanServerDescriptor[]> {
    const bonjour = new Bonjour()
    const discovered = new Map<string, LanServerDescriptor>()

    const browser = bonjour.find(
        {
            type: DISCOVERY_SERVICE_TYPE,
            protocol: DISCOVERY_SERVICE_PROTOCOL
        },
        (service) => {
            const mapped = mapDiscoveredService(service)

            if (mapped) {
                const existing = discovered.get(mapped.id)
                if (!existing) {
                    discovered.set(mapped.id, mapped)
                } else {
                    discovered.set(mapped.id, mergeDiscoveredServer(existing, mapped))
                }
            }
        }
    )

    await new Promise((resolve) => {
        setTimeout(resolve, timeoutMs)
    })

    browser.stop()
    bonjour.destroy()

    if (discovered.size <= 1) {
        try {
            const fallbackResults = await discoverLanServersBySubnetFallback()
            for (const item of fallbackResults) {
                discovered.set(item.id, item)
            }
        } catch (error) {
            console.warn('[Electron] LAN fallback discovery failed:', error)
        }
    }

    return Array.from(discovered.values()).sort((left, right) => left.name.localeCompare(right.name))
}

ipcMain.on('window-minimize', () => {
    if (mainWindow) {
        mainWindow.minimize()
    }
})

ipcMain.on('window-maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize()
        } else {
            mainWindow.maximize()
        }
    }
})

ipcMain.on('window-close', () => {
    if (mainWindow) {
        mainWindow.close()
    }
})

ipcMain.on('open-external', (_event, url) => {
    shell.openExternal(url)
})

ipcMain.handle('discover-lan-servers', async (_event, timeoutMs?: number) => {
    try {
        const safeTimeout =
            typeof timeoutMs === 'number' && Number.isFinite(timeoutMs)
                ? Math.min(Math.max(timeoutMs, 500), 5000)
                : DISCOVERY_SCAN_TIMEOUT_MS

        return await discoverLanServers(safeTimeout)
    } catch (error) {
        console.error('[Electron] Failed to discover LAN servers:', error)
        return []
    }
})

ipcMain.handle('export-document-pdf', async (_event, payload: ExportDocumentPdfPayload) => {
    const ownerWindow = BrowserWindow.fromWebContents(_event.sender) ?? mainWindow

    if (!payload?.html || !payload?.fileName) {
        throw new Error('Invalid PDF export payload')
    }

    const saveResult = await dialog.showSaveDialog(ownerWindow ?? undefined, {
        title: 'Export PDF',
        defaultPath: payload.fileName,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })

    if (saveResult.canceled || !saveResult.filePath) {
        return { canceled: true }
    }

    let exportWindow: BrowserWindow | null = null

    try {
        exportWindow = new BrowserWindow({
            show: false,
            backgroundColor: '#ffffff',
            webPreferences: {
                sandbox: false
            }
        })

        await exportWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(payload.html)}`)

        await new Promise(resolve => setTimeout(resolve, 450))

        await exportWindow.webContents.executeJavaScript(`
            Promise.all([
                document.fonts?.ready ?? Promise.resolve(),
                ...Array.from(document.images || []).map(img => img.complete ? Promise.resolve() : new Promise(done => {
                    img.addEventListener('load', done, { once: true })
                    img.addEventListener('error', done, { once: true })
                }))
            ]).then(() => true)
        `)

        const pdfBuffer = await exportWindow.webContents.printToPDF({
            landscape: payload.orientation === 'landscape',
            printBackground: true,
            preferCSSPageSize: true
        })

        await fs.promises.writeFile(saveResult.filePath, pdfBuffer)

        return {
            canceled: false,
            filePath: saveResult.filePath
        }
    } finally {
        exportWindow?.close()
    }
})

function startBackendServer() {
    const isDev = process.env.VITE_DEV_SERVER_URL !== undefined

    const logDir = path.join(app.getPath('userData'), 'logs')
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
    const logFile = path.join(logDir, 'backend.log')
    const logStream = fs.createWriteStream(logFile, { flags: 'a' })

    let serverPath: string
    let command: string
    let args: string[]
    let serverCwd: string
    let serverEnv: NodeJS.ProcessEnv

    if (isDev) {
        const parentDir = path.resolve(__dirname, '../../server')
        serverPath = path.join(parentDir, 'dist', 'server.js')
        command = 'node'
        args = [serverPath]
        serverCwd = parentDir
        serverEnv = {
            ...process.env,
            NODE_ENV: 'development'
        }
    } else {
        const serverJsPath = path.join(process.resourcesPath, 'server', 'dist', 'server.js')
        serverCwd = path.join(process.resourcesPath, 'server')

        if (fs.existsSync(serverJsPath)) {
            serverPath = serverJsPath
            command = 'node'
            args = [serverJsPath]
            serverEnv = {
                ...process.env,
                NODE_ENV: 'production'
            }
        } else {
            console.error('[Electron] Backend script not found at:', serverJsPath)
            return
        }
    }

    console.log('[Electron] ========== Backend Server Starting ==========')
    console.log('[Electron] Environment:', isDev ? 'development' : 'production')
    console.log('[Electron] Server Path:', serverPath)
    console.log('[Electron] Server Command:', command)
    console.log('[Electron] App Resources Path:', process.resourcesPath)
    console.log('[Electron] Server Working Directory:', serverCwd)

    try {
        serverProcess = spawn(command, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: false,
            cwd: serverCwd,
            env: serverEnv
        })

        if (!serverProcess || !serverProcess.pid) {
            console.error('[Electron] Failed to spawn backend process')
            return
        }

        console.log(`[Electron] Backend process spawned with PID: ${serverProcess.pid}`)

        serverProcess.stdout?.on('data', (data) => {
            console.log(`[Backend] ${data}`)
            if (!isDev) logStream.write(`[Backend] ${data}\n`)
        })

        serverProcess.stderr?.on('data', (data) => {
            console.error(`[Backend Error] ${data}`)
            if (!isDev) logStream.write(`[Backend Error] ${data}\n`)
        })

        serverProcess.on('error', (error) => {
            console.error('[Electron] Failed to start backend server:', error)
        })

        serverProcess.on('exit', (code, signal) => {
            console.warn(`[Electron] Backend server exited with code ${code} and signal ${signal}`)
        })

        console.log('[Electron] Backend server started successfully')
    } catch (error) {
        console.error('[Electron] Error starting backend:', error)
    }
}

app.whenReady().then(() => {
    if (process.env.SKIP_BACKEND !== 'true') {
        startBackendServer()
    } else {
        console.log('[Electron] Backend startup skipped (SKIP_BACKEND=true)')
    }

    const delay = process.env.SKIP_BACKEND === 'true' ? 0 : 1000
    setTimeout(() => {
        createWindow()
    }, delay)

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (serverProcess && !serverProcess.killed) {
        serverProcess.kill()
    }
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('before-quit', () => {
    if (serverProcess && !serverProcess.killed) {
        serverProcess.kill()
    }
})
