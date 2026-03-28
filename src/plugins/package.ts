export const PLUGIN_ARCHIVE_EXTENSION = '.constella-plugin'
export const PLUGIN_MANIFEST_FILE = 'manifest.json'
export const PLUGIN_INSTALLATION_FILE = 'installation.json'

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
