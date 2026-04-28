import { contextBridge, ipcRenderer } from 'electron'
import type { DevelopmentPluginRecord, InstalledPluginRecord, PluginDiagnosticRecord } from '../src/plugins/package'

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

interface DevelopmentPluginWatchEventPayload {
    pluginId: string
    sourcePath: string
    eventType: string
    changedPath?: string
    timestamp: string
}

contextBridge.exposeInMainWorld('electron', {
    minimize: () => ipcRenderer.send('window-minimize'),
    toggleMaximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    openExternal: (url: string) => ipcRenderer.send('open-external', url),
    getWindowState: (): Promise<{
        width: number
        height: number
        zoomFactor: number
        isMaximized: boolean
        display: {
            width: number
            height: number
            workAreaWidth: number
            workAreaHeight: number
            nativeWidth: number
            nativeHeight: number
            scaleFactor: number
        }
    }> => ipcRenderer.invoke('window-get-state'),
    setWindowZoomFactor: (factor: number): Promise<{ zoomFactor: number }> =>
        ipcRenderer.invoke('window-set-zoom-factor', factor),
    setWindowSize: (width: number, height: number): Promise<{
        width: number
        height: number
        isMaximized: boolean
    }> => ipcRenderer.invoke('window-set-size', { width, height }),
    discoverLanServers: (timeoutMs?: number): Promise<LanServerDescriptor[]> =>
        ipcRenderer.invoke('discover-lan-servers', timeoutMs),
    exportDocumentPdf: (payload: ExportPdfPayload): Promise<ExportPdfResult> =>
        ipcRenderer.invoke('export-document-pdf', payload),
    installPluginPackage: (sourcePath?: string): Promise<InstalledPluginRecord> =>
        ipcRenderer.invoke('install-plugin-package', sourcePath),
    addDevelopmentPlugin: (sourcePath?: string): Promise<DevelopmentPluginRecord> =>
        ipcRenderer.invoke('add-development-plugin', sourcePath),
    listInstalledPlugins: (): Promise<InstalledPluginRecord[]> =>
        ipcRenderer.invoke('list-installed-plugins'),
    listDevelopmentPlugins: (): Promise<DevelopmentPluginRecord[]> =>
        ipcRenderer.invoke('list-development-plugins'),
    listDevelopmentPluginDiagnostics: (): Promise<PluginDiagnosticRecord[]> =>
        ipcRenderer.invoke('list-development-plugin-diagnostics'),
    setInstalledPluginEnabled: (pluginId: string, enabled: boolean): Promise<InstalledPluginRecord> =>
        ipcRenderer.invoke('set-installed-plugin-enabled', pluginId, enabled),
    setDevelopmentPluginEnabled: (pluginId: string, enabled: boolean): Promise<DevelopmentPluginRecord> =>
        ipcRenderer.invoke('set-development-plugin-enabled', pluginId, enabled),
    removeInstalledPlugin: (pluginId: string): Promise<void> =>
        ipcRenderer.invoke('remove-installed-plugin', pluginId),
    removeDevelopmentPlugin: (pluginId: string): Promise<void> =>
        ipcRenderer.invoke('remove-development-plugin', pluginId),
    onDevelopmentPluginChanged: (listener: (payload: DevelopmentPluginWatchEventPayload) => void) => {
        const channel = 'development-plugin-changed'
        const wrapped = (_event: Electron.IpcRendererEvent, payload: DevelopmentPluginWatchEventPayload) => listener(payload)
        ipcRenderer.on(channel, wrapped)
        return () => ipcRenderer.removeListener(channel, wrapped)
    }
})

declare global {
    interface Window {
        electron: {
            minimize: () => void
            toggleMaximize: () => void
            close: () => void
            openExternal: (url: string) => void
            getWindowState: () => Promise<{
                width: number
                height: number
                zoomFactor: number
                isMaximized: boolean
                display: {
                    width: number
                    height: number
                    workAreaWidth: number
                    workAreaHeight: number
                    nativeWidth: number
                    nativeHeight: number
                    scaleFactor: number
                }
            }>
            setWindowZoomFactor: (factor: number) => Promise<{ zoomFactor: number }>
            setWindowSize: (width: number, height: number) => Promise<{
                width: number
                height: number
                isMaximized: boolean
            }>
            discoverLanServers: (timeoutMs?: number) => Promise<LanServerDescriptor[]>
            exportDocumentPdf: (payload: ExportPdfPayload) => Promise<ExportPdfResult>
            installPluginPackage: (sourcePath?: string) => Promise<InstalledPluginRecord>
            addDevelopmentPlugin: (sourcePath?: string) => Promise<DevelopmentPluginRecord>
            listInstalledPlugins: () => Promise<InstalledPluginRecord[]>
            listDevelopmentPlugins: () => Promise<DevelopmentPluginRecord[]>
            listDevelopmentPluginDiagnostics: () => Promise<PluginDiagnosticRecord[]>
            setInstalledPluginEnabled: (pluginId: string, enabled: boolean) => Promise<InstalledPluginRecord>
            setDevelopmentPluginEnabled: (pluginId: string, enabled: boolean) => Promise<DevelopmentPluginRecord>
            removeInstalledPlugin: (pluginId: string) => Promise<void>
            removeDevelopmentPlugin: (pluginId: string) => Promise<void>
            onDevelopmentPluginChanged: (listener: (payload: DevelopmentPluginWatchEventPayload) => void) => () => void
        }
    }
}
