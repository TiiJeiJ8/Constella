import { contextBridge, ipcRenderer } from 'electron'
import type { InstalledPluginRecord } from '../src/plugins/package'

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

interface ExportPdfPayload {
    html: string
    fileName: string
    orientation?: 'portrait' | 'landscape'
}

interface ExportPdfResult {
    canceled?: boolean
    filePath?: string
}

contextBridge.exposeInMainWorld('electron', {
    minimize: () => ipcRenderer.send('window-minimize'),
    toggleMaximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    openExternal: (url: string) => ipcRenderer.send('open-external', url),
    discoverLanServers: (timeoutMs?: number): Promise<LanServerDescriptor[]> =>
        ipcRenderer.invoke('discover-lan-servers', timeoutMs),
    exportDocumentPdf: (payload: ExportPdfPayload): Promise<ExportPdfResult> =>
        ipcRenderer.invoke('export-document-pdf', payload),
    installPluginPackage: (sourcePath?: string): Promise<InstalledPluginRecord> =>
        ipcRenderer.invoke('install-plugin-package', sourcePath),
    listInstalledPlugins: (): Promise<InstalledPluginRecord[]> =>
        ipcRenderer.invoke('list-installed-plugins'),
    setInstalledPluginEnabled: (pluginId: string, enabled: boolean): Promise<InstalledPluginRecord> =>
        ipcRenderer.invoke('set-installed-plugin-enabled', pluginId, enabled),
    removeInstalledPlugin: (pluginId: string): Promise<void> =>
        ipcRenderer.invoke('remove-installed-plugin', pluginId)
})

declare global {
    interface Window {
        electron: {
            minimize: () => void
            toggleMaximize: () => void
            close: () => void
            openExternal: (url: string) => void
            discoverLanServers: (timeoutMs?: number) => Promise<LanServerDescriptor[]>
            exportDocumentPdf: (payload: ExportPdfPayload) => Promise<ExportPdfResult>
            installPluginPackage: (sourcePath?: string) => Promise<InstalledPluginRecord>
            listInstalledPlugins: () => Promise<InstalledPluginRecord[]>
            setInstalledPluginEnabled: (pluginId: string, enabled: boolean) => Promise<InstalledPluginRecord>
            removeInstalledPlugin: (pluginId: string) => Promise<void>
        }
    }
}
