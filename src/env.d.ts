/// <reference types="vite/web" />

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
}

declare global {
    interface Window {
        electron?: ElectronBridgeApi
    }
}

export {}
