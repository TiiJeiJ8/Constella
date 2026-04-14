import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { spawn, ChildProcess } from 'child_process'
import Bonjour, { Service } from 'bonjour-service'
import type {
    DevelopmentPluginRecord,
    InstalledPluginRecord,
    PluginDiagnosticRecord,
    PluginPackageManifest
} from '../src/plugins/package'
import {
    PLUGIN_ARCHIVE_EXTENSION,
    PLUGIN_DEVELOPMENT_FILE,
    PLUGIN_INSTALLATION_FILE,
    PLUGIN_MANIFEST_FILE
} from '../src/plugins/package'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DISCOVERY_SERVICE_TYPE = 'constella'
const DISCOVERY_SERVICE_PROTOCOL = 'tcp'
const DISCOVERY_SCAN_TIMEOUT_MS = 1800
const DISCOVERY_FALLBACK_PORTS = [3000]
const DISCOVERY_FALLBACK_MAX_HOSTS = 256
const DISCOVERY_FALLBACK_CONCURRENCY = 32
const DISCOVERY_FALLBACK_TIMEOUT_MS = 220
const PLUGIN_SCAN_DIR = 'plugins'
const PLUGIN_INSTALL_DIR = 'installed'
const PLUGIN_ARCHIVE_DIR = 'archives'

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

interface PluginInstallationPayload {
    installedAt: string
    enabled: boolean
    source: 'directory' | 'archive'
    installDir: string
    archivePath?: string
}

interface DevelopmentPluginPayload {
    id: string
    sourcePath: string
    addedAt: string
    enabled: boolean
}

interface DevelopmentPluginWatchEventPayload {
    pluginId: string
    sourcePath: string
    eventType: string
    changedPath?: string
    timestamp: string
}

let mainWindow: BrowserWindow | null = null
let serverProcess: ChildProcess | null = null
const developmentPluginDiagnostics = new Map<string, PluginDiagnosticRecord>()
const developmentPluginWatchers = new Map<string, fs.FSWatcher>()
const developmentPluginWatchDebounceTimers = new Map<string, NodeJS.Timeout>()

function resolveBundledNodePath(): string | null {
    if (process.platform !== 'win32') {
        return null
    }

    const nodePath = path.join(process.resourcesPath, 'node-runtime', 'win-x64', 'node.exe')
    return fs.existsSync(nodePath) ? nodePath : null
}

function showBundledRuntimeMissingError(nodePath: string, serverPath: string): void {
    const message = [
        'Constella could not start its bundled backend runtime.',
        '',
        `Missing Node runtime: ${nodePath}`,
        `Backend entry: ${serverPath}`,
        '',
        'Please reinstall Constella or download a complete installer package.'
    ].join('\n')

    dialog.showErrorBox('Constella Runtime Missing', message)
}

function ensureDir(targetPath: string): string {
    if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true })
    }
    return targetPath
}

function getPluginRootDir(): string {
    return ensureDir(path.join(app.getPath('userData'), PLUGIN_SCAN_DIR))
}

function getInstalledPluginRootDir(): string {
    return ensureDir(path.join(getPluginRootDir(), PLUGIN_INSTALL_DIR))
}

function getPluginArchiveRootDir(): string {
    return ensureDir(path.join(getPluginRootDir(), PLUGIN_ARCHIVE_DIR))
}

function getDevelopmentPluginStatePath(): string {
    return path.join(getPluginRootDir(), PLUGIN_DEVELOPMENT_FILE)
}

function sanitizeSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'plugin'
}

function buildInstalledPluginFolderName(manifest: PluginPackageManifest): string {
    return `${sanitizeSegment(manifest.id)}__${sanitizeSegment(manifest.version)}`
}

function makeDevelopmentPluginDiagnosticKey(pluginId: string, stage: PluginDiagnosticRecord['stage'], filePath?: string): string {
    return `${pluginId}:${stage}:${filePath || ''}`
}

function setDevelopmentPluginDiagnostic(diagnostic: PluginDiagnosticRecord): void {
    developmentPluginDiagnostics.set(diagnostic.id, diagnostic)
}

function clearDevelopmentPluginDiagnostic(pluginId: string, stage?: PluginDiagnosticRecord['stage']): void {
    for (const [key, diagnostic] of developmentPluginDiagnostics.entries()) {
        if (diagnostic.pluginId !== pluginId) continue
        if (stage && diagnostic.stage !== stage) continue
        developmentPluginDiagnostics.delete(key)
    }
}

function clearAllDevelopmentPluginDiagnostics(): void {
    developmentPluginDiagnostics.clear()
}

function listDevelopmentPluginDiagnosticsInternal(): PluginDiagnosticRecord[] {
    return Array.from(developmentPluginDiagnostics.values()).sort((left, right) =>
        right.timestamp.localeCompare(left.timestamp)
    )
}

function broadcastDevelopmentPluginWatchEvent(payload: DevelopmentPluginWatchEventPayload): void {
    if (!mainWindow || mainWindow.isDestroyed()) return
    mainWindow.webContents.send('development-plugin-changed', payload)
}

function stopDevelopmentPluginWatcher(pluginId: string): void {
    const existingWatcher = developmentPluginWatchers.get(pluginId)
    if (existingWatcher) {
        existingWatcher.close()
        developmentPluginWatchers.delete(pluginId)
    }

    const existingTimer = developmentPluginWatchDebounceTimers.get(pluginId)
    if (existingTimer) {
        clearTimeout(existingTimer)
        developmentPluginWatchDebounceTimers.delete(pluginId)
    }
}

function watchDevelopmentPlugin(entry: DevelopmentPluginPayload): void {
    stopDevelopmentPluginWatcher(entry.id)

    try {
        const watcher = fs.watch(entry.sourcePath, { recursive: true }, (eventType, filename) => {
            const existingTimer = developmentPluginWatchDebounceTimers.get(entry.id)
            if (existingTimer) {
                clearTimeout(existingTimer)
            }

            const nextTimer = setTimeout(() => {
                clearDevelopmentPluginDiagnostic(entry.id, 'watch')
                broadcastDevelopmentPluginWatchEvent({
                    pluginId: entry.id,
                    sourcePath: entry.sourcePath,
                    eventType,
                    changedPath: typeof filename === 'string' && filename ? path.join(entry.sourcePath, filename) : undefined,
                    timestamp: new Date().toISOString()
                })
                developmentPluginWatchDebounceTimers.delete(entry.id)
            }, 180)

            developmentPluginWatchDebounceTimers.set(entry.id, nextTimer)
        })

        watcher.on('error', (error) => {
            const message = error instanceof Error ? error.message : String(error)
            setDevelopmentPluginDiagnostic({
                id: makeDevelopmentPluginDiagnosticKey(entry.id, 'watch', entry.sourcePath),
                source: 'development',
                severity: 'error',
                scope: 'electron',
                stage: 'watch',
                pluginId: entry.id,
                sourcePath: entry.sourcePath,
                filePath: entry.sourcePath,
                message: `Failed to watch development plugin directory: ${message}`,
                detail: error instanceof Error ? error.stack : undefined,
                timestamp: new Date().toISOString()
            })
            console.error(`[Electron] Failed to watch development plugin ${entry.sourcePath}:`, error)
        })

        developmentPluginWatchers.set(entry.id, watcher)
        clearDevelopmentPluginDiagnostic(entry.id, 'watch')
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        setDevelopmentPluginDiagnostic({
            id: makeDevelopmentPluginDiagnosticKey(entry.id, 'watch', entry.sourcePath),
            source: 'development',
            severity: 'error',
            scope: 'electron',
            stage: 'watch',
            pluginId: entry.id,
            sourcePath: entry.sourcePath,
            filePath: entry.sourcePath,
            message: `Failed to watch development plugin directory: ${message}`,
            detail: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
        })
        console.error(`[Electron] Failed to watch development plugin ${entry.sourcePath}:`, error)
    }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parsePluginManifest(raw: unknown): PluginPackageManifest {
    if (!isPlainObject(raw)) {
        throw new Error('Plugin manifest must be an object')
    }

    const nodes = raw.nodes
    if (!Array.isArray(nodes) || nodes.length === 0) {
        throw new Error('Plugin manifest must include at least one node definition')
    }

    const manifest: PluginPackageManifest = {
        id: String(raw.id || '').trim(),
        name: String(raw.name || '').trim(),
        version: String(raw.version || '').trim(),
        description: typeof raw.description === 'string' ? raw.description : undefined,
        author: typeof raw.author === 'string' ? raw.author : undefined,
        homepage: typeof raw.homepage === 'string' ? raw.homepage : undefined,
        engine: isPlainObject(raw.engine) && typeof raw.engine.constella === 'string'
            ? { constella: raw.engine.constella }
            : undefined,
        nodes: nodes.map((node, index) => {
            if (!isPlainObject(node)) {
                throw new Error(`Plugin node #${index + 1} must be an object`)
            }

            const kind = String(node.kind || '').trim()
            const label = String(node.label || '').trim()
            const description = String(node.description || '').trim()
            const renderer = String(node.renderer || '').trim()

            if (!kind || !label || !description || !renderer) {
                throw new Error(`Plugin node #${index + 1} is missing required fields`)
            }

            return {
                kind,
                label,
                description,
                icon: typeof node.icon === 'string' ? node.icon : undefined,
                renderer,
                editor: typeof node.editor === 'string' ? node.editor : undefined,
                editable: typeof node.editable === 'boolean' ? node.editable : undefined,
                supportsCardMode: typeof node.supportsCardMode === 'boolean' ? node.supportsCardMode : undefined,
                supportsFontSizeControl: typeof node.supportsFontSizeControl === 'boolean'
                    ? node.supportsFontSizeControl
                    : undefined
            }
        }),
        i18n: isPlainObject(raw.i18n)
            ? Object.fromEntries(
                Object.entries(raw.i18n)
                    .filter(([, value]) => typeof value === 'string')
                    .map(([locale, filePath]) => [locale, filePath as string])
            )
            : undefined,
        permissions: Array.isArray(raw.permissions)
            ? raw.permissions.map(permission => String(permission))
            : undefined
    }

    if (!manifest.id || !manifest.name || !manifest.version) {
        throw new Error('Plugin manifest must include id, name, and version')
    }

    return manifest
}

async function readPluginManifest(manifestPath: string): Promise<PluginPackageManifest> {
    const raw = JSON.parse(await fs.promises.readFile(manifestPath, 'utf8'))
    return parsePluginManifest(raw)
}

async function readInstalledPluginRecord(installDir: string): Promise<InstalledPluginRecord | null> {
    const manifestPath = path.join(installDir, PLUGIN_MANIFEST_FILE)
    const installationPath = path.join(installDir, PLUGIN_INSTALLATION_FILE)

    if (!fs.existsSync(manifestPath) || !fs.existsSync(installationPath)) {
        return null
    }

    const manifest = await readPluginManifest(manifestPath)
    const installationRaw = JSON.parse(await fs.promises.readFile(installationPath, 'utf8')) as PluginInstallationPayload

    return {
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        author: manifest.author,
        homepage: manifest.homepage,
        installedAt: installationRaw.installedAt,
        enabled: installationRaw.enabled,
        source: installationRaw.source,
        installDir,
        archivePath: installationRaw.archivePath,
        manifest
    }
}

async function writeInstalledPluginRecord(
    installDir: string,
    manifest: PluginPackageManifest,
    installation: PluginInstallationPayload
): Promise<InstalledPluginRecord> {
    await fs.promises.writeFile(
        path.join(installDir, PLUGIN_INSTALLATION_FILE),
        JSON.stringify(installation, null, 2),
        'utf8'
    )

    return {
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        author: manifest.author,
        homepage: manifest.homepage,
        installedAt: installation.installedAt,
        enabled: installation.enabled,
        source: installation.source,
        installDir,
        archivePath: installation.archivePath,
        manifest
    }
}

async function readDevelopmentPluginState(): Promise<DevelopmentPluginPayload[]> {
    const statePath = getDevelopmentPluginStatePath()
    if (!fs.existsSync(statePath)) {
        return []
    }

    try {
        const raw = JSON.parse(await fs.promises.readFile(statePath, 'utf8'))
        if (!Array.isArray(raw)) {
            return []
        }

        return raw
            .filter((entry): entry is DevelopmentPluginPayload => isPlainObject(entry))
            .map((entry) => ({
                id: String(entry.id || '').trim(),
                sourcePath: String(entry.sourcePath || '').trim(),
                addedAt: String(entry.addedAt || '').trim(),
                enabled: entry.enabled !== false
            }))
            .filter(entry => Boolean(entry.id && entry.sourcePath))
    } catch (error) {
        console.warn('[Electron] Failed to read development plugin state:', error)
        return []
    }
}

async function writeDevelopmentPluginState(entries: DevelopmentPluginPayload[]): Promise<void> {
    const statePath = getDevelopmentPluginStatePath()
    await fs.promises.writeFile(statePath, JSON.stringify(entries, null, 2), 'utf8')
    await syncDevelopmentPluginWatchers()
}

async function createDevelopmentPluginRecord(payload: DevelopmentPluginPayload): Promise<DevelopmentPluginRecord> {
    const manifestPath = path.join(payload.sourcePath, PLUGIN_MANIFEST_FILE)
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`Missing ${PLUGIN_MANIFEST_FILE} in development plugin directory`)
    }

    const manifest = await readPluginManifest(manifestPath)

    if (manifest.id !== payload.id) {
        throw new Error(`Development plugin id mismatch for ${payload.sourcePath}`)
    }

    return {
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        author: manifest.author,
        homepage: manifest.homepage,
        enabled: payload.enabled,
        addedAt: payload.addedAt,
        sourcePath: payload.sourcePath,
        manifest
    }
}

async function listDevelopmentPluginsInternal(): Promise<DevelopmentPluginRecord[]> {
    const state = await readDevelopmentPluginState()
    const developmentPlugins = await Promise.all(
        state.map(async (entry) => {
            try {
                clearDevelopmentPluginDiagnostic(entry.id, 'manifest')
                return await createDevelopmentPluginRecord(entry)
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error)
                setDevelopmentPluginDiagnostic({
                    id: makeDevelopmentPluginDiagnosticKey(entry.id, 'manifest', entry.sourcePath),
                    source: 'development',
                    severity: 'error',
                    scope: 'electron',
                    stage: 'manifest',
                    pluginId: entry.id,
                    sourcePath: entry.sourcePath,
                    filePath: path.join(entry.sourcePath, PLUGIN_MANIFEST_FILE),
                    message,
                    detail: error instanceof Error ? error.stack : undefined,
                    timestamp: new Date().toISOString()
                })
                console.warn(`[Electron] Failed to load development plugin ${entry.sourcePath}:`, error)
                return null
            }
        })
    )

    return developmentPlugins
        .filter((plugin): plugin is DevelopmentPluginRecord => Boolean(plugin))
        .sort((left, right) => left.name.localeCompare(right.name))
}

async function syncDevelopmentPluginWatchers(): Promise<void> {
    const state = await readDevelopmentPluginState()
    const activeIds = new Set(state.map(entry => entry.id))

    for (const entry of state) {
        watchDevelopmentPlugin(entry)
    }

    for (const pluginId of Array.from(developmentPluginWatchers.keys())) {
        if (!activeIds.has(pluginId)) {
            stopDevelopmentPluginWatcher(pluginId)
            clearDevelopmentPluginDiagnostic(pluginId, 'watch')
        }
    }
}

async function listInstalledPluginsInternal(): Promise<InstalledPluginRecord[]> {
    const rootDir = getInstalledPluginRootDir()
    const entries = await fs.promises.readdir(rootDir, { withFileTypes: true })
    const installedPlugins = await Promise.all(
        entries
            .filter(entry => entry.isDirectory())
            .map(entry => readInstalledPluginRecord(path.join(rootDir, entry.name)))
    )

    return installedPlugins
        .filter((plugin): plugin is InstalledPluginRecord => Boolean(plugin))
        .sort((left, right) => left.name.localeCompare(right.name))
}

async function extractArchiveToDirectory(archivePath: string, destinationDir: string): Promise<void> {
    if (process.platform !== 'win32') {
        throw new Error('Archive installation is currently supported on Windows only')
    }

    await fs.promises.rm(destinationDir, { recursive: true, force: true })
    await fs.promises.mkdir(destinationDir, { recursive: true })

    const needsZipAlias = path.extname(archivePath).toLowerCase() !== '.zip'
    const extractionArchivePath = needsZipAlias
        ? path.join(path.dirname(destinationDir), `${path.basename(destinationDir)}.zip`)
        : archivePath

    if (needsZipAlias) {
        await fs.promises.copyFile(archivePath, extractionArchivePath)
    }

    try {
        await new Promise<void>((resolve, reject) => {
            const command = [
                'Expand-Archive',
                '-LiteralPath',
                `'${extractionArchivePath.replace(/'/g, "''")}'`,
                '-DestinationPath',
                `'${destinationDir.replace(/'/g, "''")}'`,
                '-Force'
            ].join(' ')

            const child = spawn('powershell', ['-NoProfile', '-Command', command], {
                windowsHide: true
            })

            let stderr = ''
            child.stderr.on('data', chunk => {
                stderr += chunk.toString()
            })

            child.on('error', reject)
            child.on('exit', code => {
                if (code === 0) {
                    resolve()
                    return
                }
                reject(new Error(stderr || `Expand-Archive failed with exit code ${code}`))
            })
        })
    } finally {
        if (needsZipAlias) {
            await fs.promises.rm(extractionArchivePath, { force: true })
        }
    }
}

async function resolvePluginSourceSelection(ownerWindow: BrowserWindow | null): Promise<{
    sourcePath: string
    sourceType: 'directory' | 'archive' | 'manifest'
}> {
    const result = await dialog.showOpenDialog(ownerWindow ?? undefined, {
        title: 'Install Constella Plugin',
        buttonLabel: 'Install',
        filters: [
            { name: 'Constella Plugin Archive', extensions: [PLUGIN_ARCHIVE_EXTENSION.slice(1), 'zip'] }
        ],
        properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
        throw new Error('Plugin installation cancelled')
    }

    const selectedPath = result.filePaths[0]
    const stats = await fs.promises.stat(selectedPath)

    return {
        sourcePath: selectedPath,
        sourceType: stats.isDirectory()
            ? 'directory'
            : path.basename(selectedPath).toLowerCase() === PLUGIN_MANIFEST_FILE
                ? 'manifest'
                : 'archive'
    }
}

async function resolveDevelopmentPluginSelection(ownerWindow: BrowserWindow | null): Promise<string> {
    const result = await dialog.showOpenDialog(ownerWindow ?? undefined, {
        title: 'Load Development Plugin',
        buttonLabel: 'Load',
        properties: ['openDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
        throw new Error('Development plugin loading cancelled')
    }

    return result.filePaths[0]
}

async function resolvePluginSourceByPath(sourcePath: string): Promise<{
    sourcePath: string
    sourceType: 'directory' | 'archive' | 'manifest'
}> {
    const stats = await fs.promises.stat(sourcePath)

    return {
        sourcePath,
        sourceType: stats.isDirectory()
            ? 'directory'
            : path.basename(sourcePath).toLowerCase() === PLUGIN_MANIFEST_FILE
                ? 'manifest'
                : 'archive'
    }
}

async function installPluginPackageInternal(ownerWindow: BrowserWindow | null, explicitSourcePath?: string): Promise<InstalledPluginRecord> {
    const { sourcePath, sourceType } = explicitSourcePath
        ? await resolvePluginSourceByPath(explicitSourcePath)
        : await resolvePluginSourceSelection(ownerWindow)
    const tempRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'constella-plugin-'))

    let workingDir = sourceType === 'directory' ? sourcePath : sourceType === 'manifest' ? path.dirname(sourcePath) : tempRoot
    let archiveTargetPath: string | undefined

    try {
        if (sourceType === 'archive') {
            archiveTargetPath = path.join(
                getPluginArchiveRootDir(),
                `${Date.now()}-${sanitizeSegment(path.basename(sourcePath))}`
            )
            await fs.promises.copyFile(sourcePath, archiveTargetPath)
            await extractArchiveToDirectory(sourcePath, tempRoot)
        }

        const manifestPath = fs.existsSync(path.join(workingDir, PLUGIN_MANIFEST_FILE))
            ? path.join(workingDir, PLUGIN_MANIFEST_FILE)
            : sourceType === 'manifest'
                ? sourcePath
                : ''

        const pluginDir = manifestPath
            ? path.dirname(manifestPath)
            : workingDir

        const finalManifestPath = path.join(pluginDir, PLUGIN_MANIFEST_FILE)
        if (!fs.existsSync(finalManifestPath)) {
            throw new Error(`Missing ${PLUGIN_MANIFEST_FILE} in plugin package`)
        }

        const manifest = await readPluginManifest(finalManifestPath)
        const installDir = path.join(getInstalledPluginRootDir(), buildInstalledPluginFolderName(manifest))

        await fs.promises.rm(installDir, { recursive: true, force: true })
        await fs.promises.mkdir(path.dirname(installDir), { recursive: true })
        await fs.promises.cp(pluginDir, installDir, { recursive: true, force: true })

        const installation: PluginInstallationPayload = {
            installedAt: new Date().toISOString(),
            enabled: true,
            source: sourceType === 'archive' ? 'archive' : 'directory',
            installDir,
            archivePath: archiveTargetPath
        }

        return await writeInstalledPluginRecord(installDir, manifest, installation)
    } finally {
        await fs.promises.rm(tempRoot, { recursive: true, force: true })
    }
}

async function updateInstalledPluginEnabledState(pluginId: string, enabled: boolean): Promise<InstalledPluginRecord> {
    const installedPlugins = await listInstalledPluginsInternal()
    const targetPlugin = installedPlugins.find(plugin => plugin.id === pluginId)

    if (!targetPlugin) {
        throw new Error(`Plugin not found: ${pluginId}`)
    }

    return await writeInstalledPluginRecord(targetPlugin.installDir, targetPlugin.manifest, {
        installedAt: targetPlugin.installedAt,
        enabled,
        source: targetPlugin.source,
        installDir: targetPlugin.installDir,
        archivePath: targetPlugin.archivePath
    })
}

async function removeInstalledPluginInternal(pluginId: string): Promise<void> {
    const installedPlugins = await listInstalledPluginsInternal()
    const targetPlugin = installedPlugins.find(plugin => plugin.id === pluginId)

    if (!targetPlugin) {
        throw new Error(`Plugin not found: ${pluginId}`)
    }

    await fs.promises.rm(targetPlugin.installDir, { recursive: true, force: true })
}

async function addDevelopmentPluginInternal(ownerWindow: BrowserWindow | null, explicitSourcePath?: string): Promise<DevelopmentPluginRecord> {
    const sourcePath = explicitSourcePath || await resolveDevelopmentPluginSelection(ownerWindow)
    const stats = await fs.promises.stat(sourcePath)

    if (!stats.isDirectory()) {
        throw new Error('Development plugin source must be a directory')
    }

    const manifestPath = path.join(sourcePath, PLUGIN_MANIFEST_FILE)
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`Missing ${PLUGIN_MANIFEST_FILE} in development plugin directory`)
    }

    const manifest = await readPluginManifest(manifestPath)
    const state = await readDevelopmentPluginState()
    const nextEntry: DevelopmentPluginPayload = {
        id: manifest.id,
        sourcePath,
        addedAt: new Date().toISOString(),
        enabled: true
    }

    const filteredState = state.filter(entry => entry.id !== manifest.id)
    filteredState.push(nextEntry)
    await writeDevelopmentPluginState(filteredState)
    clearDevelopmentPluginDiagnostic(nextEntry.id)

    return await createDevelopmentPluginRecord(nextEntry)
}

async function updateDevelopmentPluginEnabledState(pluginId: string, enabled: boolean): Promise<DevelopmentPluginRecord> {
    const state = await readDevelopmentPluginState()
    const targetIndex = state.findIndex(entry => entry.id === pluginId)

    if (targetIndex < 0) {
        throw new Error(`Development plugin not found: ${pluginId}`)
    }

    const nextEntry: DevelopmentPluginPayload = {
        ...state[targetIndex],
        enabled
    }

    state[targetIndex] = nextEntry
    await writeDevelopmentPluginState(state)
    return await createDevelopmentPluginRecord(nextEntry)
}

async function removeDevelopmentPluginInternal(pluginId: string): Promise<void> {
    const state = await readDevelopmentPluginState()
    const nextState = state.filter(entry => entry.id !== pluginId)

    if (nextState.length === state.length) {
        throw new Error(`Development plugin not found: ${pluginId}`)
    }

    await writeDevelopmentPluginState(nextState)
    clearDevelopmentPluginDiagnostic(pluginId)
    stopDevelopmentPluginWatcher(pluginId)
}

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

ipcMain.handle('install-plugin-package', async (event, sourcePath?: string) => {
    try {
        const ownerWindow = BrowserWindow.fromWebContents(event.sender) ?? mainWindow
        return await installPluginPackageInternal(ownerWindow, sourcePath)
    } catch (error) {
        console.error('[Electron] Failed to install plugin package:', error)
        throw error
    }
})

ipcMain.handle('add-development-plugin', async (event, sourcePath?: string) => {
    try {
        const ownerWindow = BrowserWindow.fromWebContents(event.sender) ?? mainWindow
        return await addDevelopmentPluginInternal(ownerWindow, sourcePath)
    } catch (error) {
        console.error('[Electron] Failed to add development plugin:', error)
        throw error
    }
})

ipcMain.handle('list-installed-plugins', async () => {
    try {
        return await listInstalledPluginsInternal()
    } catch (error) {
        console.error('[Electron] Failed to list installed plugins:', error)
        return []
    }
})

ipcMain.handle('list-development-plugins', async () => {
    try {
        return await listDevelopmentPluginsInternal()
    } catch (error) {
        console.error('[Electron] Failed to list development plugins:', error)
        return []
    }
})

ipcMain.handle('list-development-plugin-diagnostics', async () => {
    try {
        await listDevelopmentPluginsInternal()
        return listDevelopmentPluginDiagnosticsInternal()
    } catch (error) {
        console.error('[Electron] Failed to list development plugin diagnostics:', error)
        return listDevelopmentPluginDiagnosticsInternal()
    }
})

ipcMain.handle('set-installed-plugin-enabled', async (_event, pluginId: string, enabled: boolean) => {
    try {
        return await updateInstalledPluginEnabledState(pluginId, enabled)
    } catch (error) {
        console.error('[Electron] Failed to update plugin enabled state:', error)
        throw error
    }
})

ipcMain.handle('set-development-plugin-enabled', async (_event, pluginId: string, enabled: boolean) => {
    try {
        return await updateDevelopmentPluginEnabledState(pluginId, enabled)
    } catch (error) {
        console.error('[Electron] Failed to update development plugin enabled state:', error)
        throw error
    }
})

ipcMain.handle('remove-installed-plugin', async (_event, pluginId: string) => {
    try {
        await removeInstalledPluginInternal(pluginId)
    } catch (error) {
        console.error('[Electron] Failed to remove plugin:', error)
        throw error
    }
})

ipcMain.handle('remove-development-plugin', async (_event, pluginId: string) => {
    try {
        await removeDevelopmentPluginInternal(pluginId)
    } catch (error) {
        console.error('[Electron] Failed to remove development plugin:', error)
        throw error
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
        const bundledNodePath = resolveBundledNodePath()
        const expectedNodePath = path.join(process.resourcesPath, 'node-runtime', 'win-x64', 'node.exe')

        if (fs.existsSync(serverJsPath)) {
            serverPath = serverJsPath
            if (!bundledNodePath) {
                console.error('[Electron] Bundled Node runtime not found at:', expectedNodePath)
                showBundledRuntimeMissingError(expectedNodePath, serverJsPath)
                return
            }
            command = bundledNodePath
            args = [serverJsPath]
            serverEnv = {
                ...process.env,
                NODE_ENV: 'production',
                CONSTELLA_BUNDLED_NODE: bundledNodePath,
                PATH: `${path.dirname(bundledNodePath)}${path.delimiter}${process.env.PATH || ''}`
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

    void syncDevelopmentPluginWatchers()

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
    for (const pluginId of Array.from(developmentPluginWatchers.keys())) {
        stopDevelopmentPluginWatcher(pluginId)
    }
    if (serverProcess && !serverProcess.killed) {
        serverProcess.kill()
    }
})
