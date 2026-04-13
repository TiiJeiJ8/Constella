import { computed, defineAsyncComponent, h, ref, type Component } from 'vue'
import { i18n } from '@/locales'
import { pluginRegistry, type NodePlugin, type PluginI18nMessages } from './index'
import type {
    DevelopmentPluginRecord,
    InstalledPluginRecord,
    PluginPackageManifest,
    PluginPackageNodeManifest
} from './package'

declare global {
    interface Window {
        __CONSTELLA_PLUGIN_API__?: {
            vue: {
                h: typeof h
                ref: typeof ref
                computed: typeof computed
            }
        }
    }
}

function ensureRuntimePluginGlobals() {
    if (!window.__CONSTELLA_PLUGIN_API__) {
        window.__CONSTELLA_PLUGIN_API__ = {
            vue: {
                h,
                ref,
                computed
            }
        }
    }
}

function normalizePluginRelativePath(relativePath: string): string {
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
    if (!normalized || normalized.split('/').some(segment => segment === '..')) {
        throw new Error(`Invalid plugin-relative path: ${relativePath}`)
    }
    return normalized
}

function joinPluginFilePath(baseDir: string, relativePath: string): string {
    const normalizedBase = baseDir.replace(/\\/g, '/').replace(/\/+$/, '')
    const normalizedRelative = normalizePluginRelativePath(relativePath)
    return `${normalizedBase}/${normalizedRelative}`
}

function pathToFileUrl(filePath: string): string {
    const normalized = filePath.replace(/\\/g, '/')
    if (/^[a-zA-Z]:\//.test(normalized)) {
        return encodeURI(`file:///${normalized}`)
    }
    if (normalized.startsWith('/')) {
        return encodeURI(`file://${normalized}`)
    }
    throw new Error(`Unsupported plugin file path: ${filePath}`)
}

function createPluginDiagnosticId(
    pluginId: string,
    stage: 'i18n' | 'module-load' | 'registration',
    filePath?: string,
    nodeKind?: string
): string {
    return `${pluginId}:${stage}:${filePath || ''}:${nodeKind || ''}`
}

function reportPluginDiagnostic(args: {
    source: 'installed' | 'development'
    severity?: 'error' | 'warning' | 'info'
    stage: 'i18n' | 'module-load' | 'registration'
    pluginId: string
    pluginName?: string
    sourcePath?: string
    filePath?: string
    nodeKind?: string
    message: string
    detail?: string
}) {
    pluginRegistry.reportPluginDiagnostic({
        id: createPluginDiagnosticId(args.pluginId, args.stage, args.filePath, args.nodeKind),
        source: args.source,
        severity: args.severity || 'error',
        scope: 'runtime',
        stage: args.stage,
        pluginId: args.pluginId,
        pluginName: args.pluginName,
        sourcePath: args.sourcePath,
        filePath: args.filePath,
        nodeKind: args.nodeKind,
        message: args.message,
        detail: args.detail,
        timestamp: new Date().toISOString()
    })
}

function createAsyncPluginComponent(
    moduleFilePath: string,
    exportHints: string[],
    diagnosticMeta: {
        source: 'installed' | 'development'
        pluginId: string
        pluginName?: string
        sourcePath?: string
        nodeKind?: string
    },
    cacheBustKey?: string
): Component {
    const rawModuleUrl = pathToFileUrl(moduleFilePath)
    const moduleUrl = cacheBustKey ? `${rawModuleUrl}${rawModuleUrl.includes('?') ? '&' : '?'}t=${encodeURIComponent(cacheBustKey)}` : rawModuleUrl

    return defineAsyncComponent({
        loader: async () => {
            try {
                const importedModule = await import(/* @vite-ignore */ moduleUrl)
                for (const exportName of exportHints) {
                    const candidate = importedModule?.[exportName]
                    if (candidate) {
                        return candidate
                    }
                }

                if (importedModule?.default) {
                    return importedModule.default
                }

                throw new Error(`No compatible Vue component export found in ${rawModuleUrl}`)
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error)
                reportPluginDiagnostic({
                    source: diagnosticMeta.source,
                    stage: 'module-load',
                    pluginId: diagnosticMeta.pluginId,
                    pluginName: diagnosticMeta.pluginName,
                    sourcePath: diagnosticMeta.sourcePath,
                    filePath: moduleFilePath,
                    nodeKind: diagnosticMeta.nodeKind,
                    message,
                    detail: error instanceof Error ? error.stack : undefined
                })
                throw error
            }
        },
        onError(error, _retry, fail) {
            const message = error instanceof Error ? error.message : String(error)
            reportPluginDiagnostic({
                source: diagnosticMeta.source,
                stage: 'module-load',
                pluginId: diagnosticMeta.pluginId,
                pluginName: diagnosticMeta.pluginName,
                sourcePath: diagnosticMeta.sourcePath,
                filePath: moduleFilePath,
                nodeKind: diagnosticMeta.nodeKind,
                message,
                detail: error instanceof Error ? error.stack : undefined
            })
            fail()
        }
    })
}

async function loadPluginI18nBundle(installedPlugin: InstalledPluginRecord): Promise<PluginI18nMessages | undefined> {
    const manifestI18n = installedPlugin.manifest.i18n
    if (!manifestI18n) return undefined

    const localeEntries = await Promise.all(
        Object.entries(manifestI18n).map(async ([locale, relativePath]) => {
            try {
                const response = await fetch(pathToFileUrl(joinPluginFilePath(installedPlugin.installDir, relativePath)))
                if (!response.ok) {
                    throw new Error(`Failed to load i18n file: ${relativePath}`)
                }
                return [locale, await response.json()] as const
            } catch (error) {
                const filePath = joinPluginFilePath(installedPlugin.installDir, relativePath)
                reportPluginDiagnostic({
                    source: 'installed',
                    stage: 'i18n',
                    pluginId: installedPlugin.id,
                    pluginName: installedPlugin.name,
                    sourcePath: installedPlugin.installDir,
                    filePath,
                    message: `Failed to load i18n bundle for ${locale}: ${error instanceof Error ? error.message : String(error)}`,
                    detail: error instanceof Error ? error.stack : undefined
                })
                console.warn(`[Plugins] Failed to load plugin i18n ${installedPlugin.id}:${locale}`, error)
                return null
            }
        })
    )

    const messages = Object.fromEntries(localeEntries.filter((entry): entry is readonly [string, Record<string, any>] => Boolean(entry)))
    return Object.keys(messages).length > 0 ? messages : undefined
}

async function loadExternalPluginI18nBundle(
    pluginId: string,
    baseDir: string,
    manifest: PluginPackageManifest
): Promise<PluginI18nMessages | undefined> {
    const manifestI18n = manifest.i18n
    if (!manifestI18n) return undefined

    const localeEntries = await Promise.all(
        Object.entries(manifestI18n).map(async ([locale, relativePath]) => {
            try {
                const response = await fetch(pathToFileUrl(joinPluginFilePath(baseDir, relativePath)))
                if (!response.ok) {
                    throw new Error(`Failed to load i18n file: ${relativePath}`)
                }
                return [locale, await response.json()] as const
            } catch (error) {
                const filePath = joinPluginFilePath(baseDir, relativePath)
                reportPluginDiagnostic({
                    source: 'development',
                    stage: 'i18n',
                    pluginId,
                    sourcePath: baseDir,
                    filePath,
                    message: `Failed to load i18n bundle for ${locale}: ${error instanceof Error ? error.message : String(error)}`,
                    detail: error instanceof Error ? error.stack : undefined
                })
                console.warn(`[Plugins] Failed to load plugin i18n ${pluginId}:${locale}`, error)
                return null
            }
        })
    )

    const messages = Object.fromEntries(localeEntries.filter((entry): entry is readonly [string, Record<string, any>] => Boolean(entry)))
    return Object.keys(messages).length > 0 ? messages : undefined
}

function mergePluginI18n(messages?: PluginI18nMessages) {
    if (!messages) return

    for (const [locale, localeMessages] of Object.entries(messages)) {
        i18n.global.mergeLocaleMessage(locale, localeMessages)
    }
}

function buildRuntimePlugin(installedPlugin: InstalledPluginRecord, nodeManifest: PluginPackageNodeManifest): NodePlugin {
    return {
        meta: {
            kind: nodeManifest.kind,
            label: nodeManifest.label,
            icon: nodeManifest.icon || 'P',
            description: nodeManifest.description,
            editable: nodeManifest.editable ?? Boolean(nodeManifest.editor),
            supportsCardMode: nodeManifest.supportsCardMode ?? false,
            supportsFontSizeControl: nodeManifest.supportsFontSizeControl
        },
        renderer: createAsyncPluginComponent(
            joinPluginFilePath(installedPlugin.installDir, nodeManifest.renderer),
            ['renderer', 'RendererComponent', 'default'],
            {
                source: 'installed',
                pluginId: installedPlugin.id,
                pluginName: installedPlugin.name,
                sourcePath: installedPlugin.installDir,
                nodeKind: nodeManifest.kind
            }
        ),
        editor: nodeManifest.editor
            ? createAsyncPluginComponent(
                joinPluginFilePath(installedPlugin.installDir, nodeManifest.editor),
                ['editor', 'EditorComponent', 'default'],
                {
                    source: 'installed',
                    pluginId: installedPlugin.id,
                    pluginName: installedPlugin.name,
                    sourcePath: installedPlugin.installDir,
                    nodeKind: nodeManifest.kind
                }
            )
            : undefined
    }
}

export async function registerInstalledPluginsRuntime(installedPlugins: InstalledPluginRecord[]): Promise<void> {
    ensureRuntimePluginGlobals()
    const enabledPlugins = installedPlugins.filter(plugin => plugin.enabled)

    for (const installedPlugin of enabledPlugins) {
        const pluginI18n = await loadPluginI18nBundle(installedPlugin)
        mergePluginI18n(pluginI18n)

        for (const nodeManifest of installedPlugin.manifest.nodes) {
            if (pluginRegistry.has(nodeManifest.kind)) {
                reportPluginDiagnostic({
                    source: 'installed',
                    severity: 'warning',
                    stage: 'registration',
                    pluginId: installedPlugin.id,
                    pluginName: installedPlugin.name,
                    sourcePath: installedPlugin.installDir,
                    nodeKind: nodeManifest.kind,
                    message: `Skipped node kind "${nodeManifest.kind}" because it is already registered`
                })
                console.warn(
                    `[Plugins] Skipping installed plugin kind "${nodeManifest.kind}" from ${installedPlugin.id} because it is already registered`
                )
                continue
            }

            pluginRegistry.register(buildRuntimePlugin(installedPlugin, nodeManifest))
        }
    }
}

function buildDevelopmentRuntimePlugin(
    developmentPlugin: DevelopmentPluginRecord,
    nodeManifest: PluginPackageNodeManifest,
    cacheBustKey?: string
): NodePlugin {
    return {
        meta: {
            kind: nodeManifest.kind,
            label: nodeManifest.label,
            icon: nodeManifest.icon || 'D',
            description: nodeManifest.description,
            editable: nodeManifest.editable ?? Boolean(nodeManifest.editor),
            supportsCardMode: nodeManifest.supportsCardMode ?? false,
            supportsFontSizeControl: nodeManifest.supportsFontSizeControl
        },
        renderer: createAsyncPluginComponent(
            joinPluginFilePath(developmentPlugin.sourcePath, nodeManifest.renderer),
            ['renderer', 'RendererComponent', 'default'],
            {
                source: 'development',
                pluginId: developmentPlugin.id,
                pluginName: developmentPlugin.name,
                sourcePath: developmentPlugin.sourcePath,
                nodeKind: nodeManifest.kind
            },
            cacheBustKey
        ),
        editor: nodeManifest.editor
            ? createAsyncPluginComponent(
                joinPluginFilePath(developmentPlugin.sourcePath, nodeManifest.editor),
                ['editor', 'EditorComponent', 'default'],
                {
                    source: 'development',
                    pluginId: developmentPlugin.id,
                    pluginName: developmentPlugin.name,
                    sourcePath: developmentPlugin.sourcePath,
                    nodeKind: nodeManifest.kind
                },
                cacheBustKey
            )
            : undefined
    }
}

export async function registerDevelopmentPluginsRuntime(
    developmentPlugins: DevelopmentPluginRecord[],
    cacheBustKey?: string
): Promise<void> {
    ensureRuntimePluginGlobals()
    const enabledPlugins = developmentPlugins.filter(plugin => plugin.enabled)

    for (const developmentPlugin of enabledPlugins) {
        const pluginI18n = await loadExternalPluginI18nBundle(
            developmentPlugin.id,
            developmentPlugin.sourcePath,
            developmentPlugin.manifest
        )
        mergePluginI18n(pluginI18n)

        for (const nodeManifest of developmentPlugin.manifest.nodes) {
            if (pluginRegistry.has(nodeManifest.kind)) {
                reportPluginDiagnostic({
                    source: 'development',
                    severity: 'warning',
                    stage: 'registration',
                    pluginId: developmentPlugin.id,
                    pluginName: developmentPlugin.name,
                    sourcePath: developmentPlugin.sourcePath,
                    nodeKind: nodeManifest.kind,
                    message: `Skipped node kind "${nodeManifest.kind}" because it is already registered`
                })
                console.warn(
                    `[Plugins] Skipping development plugin kind "${nodeManifest.kind}" from ${developmentPlugin.id} because it is already registered`
                )
                continue
            }

            pluginRegistry.register(buildDevelopmentRuntimePlugin(developmentPlugin, nodeManifest, cacheBustKey))
        }
    }
}
