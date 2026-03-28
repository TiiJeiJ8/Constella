/// <reference types="vite/web" />
import type { InstalledPluginRecord } from './plugins/package'

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
    listInstalledPlugins: () => Promise<InstalledPluginRecord[]>
    setInstalledPluginEnabled: (pluginId: string, enabled: boolean) => Promise<InstalledPluginRecord>
    removeInstalledPlugin: (pluginId: string) => Promise<void>
}

declare global {
    interface Window {
        electron?: ElectronBridgeApi
    }
}

export {}
