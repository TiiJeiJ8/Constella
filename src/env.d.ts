/// <reference types="vite/web" />
import type { DevelopmentPluginRecord, InstalledPluginRecord, PluginDiagnosticRecord } from './plugins/package'

declare global {
    const __APP_VERSION__: string
}

interface ElectronLanServer {
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

interface ElectronBridgeApi {
    minimize: () => void
    toggleMaximize: () => void
    close: () => void
    openExternal: (url: string) => void
    discoverLanServers: (timeoutMs?: number) => Promise<ElectronLanServer[]>
    exportDocumentPdf: (payload: {
        html: string
        fileName: string
        orientation?: 'portrait' | 'landscape'
    }) => Promise<{
        canceled?: boolean
        filePath?: string
    }>
    installPluginPackage: (sourcePath?: string) => Promise<InstalledPluginRecord>
    addDevelopmentPlugin: (sourcePath?: string) => Promise<DevelopmentPluginRecord>
    listInstalledPlugins: () => Promise<InstalledPluginRecord[]>
    listDevelopmentPlugins: () => Promise<DevelopmentPluginRecord[]>
    listDevelopmentPluginDiagnostics: () => Promise<PluginDiagnosticRecord[]>
    setInstalledPluginEnabled: (pluginId: string, enabled: boolean) => Promise<InstalledPluginRecord>
    setDevelopmentPluginEnabled: (pluginId: string, enabled: boolean) => Promise<DevelopmentPluginRecord>
    removeInstalledPlugin: (pluginId: string) => Promise<void>
    removeDevelopmentPlugin: (pluginId: string) => Promise<void>
    onDevelopmentPluginChanged: (listener: (payload: {
        pluginId: string
        sourcePath: string
        eventType: string
        changedPath?: string
        timestamp: string
    }) => void) => () => void
}

declare global {
    interface Window {
        electron?: ElectronBridgeApi
    }
}

export {}
