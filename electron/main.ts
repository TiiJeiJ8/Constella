import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { spawn, ChildProcess } from 'child_process'
import Bonjour, { Service } from 'bonjour-service'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DISCOVERY_SERVICE_TYPE = 'constella'
const DISCOVERY_SERVICE_PROTOCOL = 'tcp'
const DISCOVERY_SCAN_TIMEOUT_MS = 1800

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

    return Array.from(new Set(addresses.filter(isUsableAddress)))
}

function buildServiceUrl(address: string, port: number): string {
    const host = address.includes(':') && !address.startsWith('[') ? `[${address}]` : address
    return `http://${host}:${port}`
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
                discovered.set(mapped.id, mapped)
            }
        }
    )

    await new Promise((resolve) => {
        setTimeout(resolve, timeoutMs)
    })

    browser.stop()
    bonjour.destroy()

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
