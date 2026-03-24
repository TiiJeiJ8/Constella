import { contextBridge, ipcRenderer } from 'electron'

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

contextBridge.exposeInMainWorld('electron', {
    minimize: () => ipcRenderer.send('window-minimize'),
    toggleMaximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    openExternal: (url: string) => ipcRenderer.send('open-external', url),
    discoverLanServers: (timeoutMs?: number): Promise<LanServerDescriptor[]> =>
        ipcRenderer.invoke('discover-lan-servers', timeoutMs)
})

declare global {
    interface Window {
        electron: {
            minimize: () => void
            toggleMaximize: () => void
            close: () => void
            openExternal: (url: string) => void
            discoverLanServers: (timeoutMs?: number) => Promise<LanServerDescriptor[]>
        }
    }
}
