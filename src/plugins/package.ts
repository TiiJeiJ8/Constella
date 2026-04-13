export const PLUGIN_ARCHIVE_EXTENSION = '.constella-plugin'
export const PLUGIN_MANIFEST_FILE = 'manifest.json'
export const PLUGIN_INSTALLATION_FILE = 'installation.json'
export const PLUGIN_DEVELOPMENT_FILE = 'development.json'

export interface PluginPackageNodeManifest {
    kind: string
    label: string
    description: string
    icon?: string
    renderer: string
    editor?: string
    editable?: boolean
    supportsCardMode?: boolean
    supportsFontSizeControl?: boolean
}

export interface PluginPackageManifest {
    id: string
    name: string
    version: string
    description?: string
    author?: string
    homepage?: string
    engine?: {
        constella?: string
    }
    nodes: PluginPackageNodeManifest[]
    i18n?: Record<string, string>
    permissions?: string[]
}

export interface InstalledPluginRecord {
    id: string
    name: string
    version: string
    description?: string
    author?: string
    homepage?: string
    installedAt: string
    enabled: boolean
    source: 'directory' | 'archive'
    installDir: string
    archivePath?: string
    manifest: PluginPackageManifest
}

export interface DevelopmentPluginRecord {
    id: string
    name: string
    version: string
    description?: string
    author?: string
    homepage?: string
    enabled: boolean
    addedAt: string
    sourcePath: string
    manifest: PluginPackageManifest
}

export type PluginDiagnosticSeverity = 'error' | 'warning' | 'info'

export type PluginDiagnosticSource = 'builtin' | 'installed' | 'development'

export interface PluginDiagnosticRecord {
    id: string
    source: PluginDiagnosticSource
    severity: PluginDiagnosticSeverity
    scope: 'electron' | 'runtime'
    stage: 'watch' | 'manifest' | 'i18n' | 'module-load' | 'registration' | 'unknown'
    pluginId?: string
    pluginName?: string
    sourcePath?: string
    filePath?: string
    nodeKind?: string
    message: string
    detail?: string
    timestamp: string
}
