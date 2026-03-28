import { computed, defineAsyncComponent, h, ref, type Component } from 'vue'
import { i18n } from '@/locales'
import { pluginRegistry, type NodePlugin, type PluginI18nMessages } from './index'
import type { InstalledPluginRecord, PluginPackageNodeManifest } from './package'

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

function createAsyncPluginComponent(moduleFilePath: string, exportHints: string[]): Component {
    const moduleUrl = pathToFileUrl(moduleFilePath)

    return defineAsyncComponent(async () => {
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

        throw new Error(`No compatible Vue component export found in ${moduleUrl}`)
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
                console.warn(`[Plugins] Failed to load plugin i18n ${installedPlugin.id}:${locale}`, error)
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
            ['renderer', 'RendererComponent', 'default']
        ),
        editor: nodeManifest.editor
            ? createAsyncPluginComponent(
                joinPluginFilePath(installedPlugin.installDir, nodeManifest.editor),
                ['editor', 'EditorComponent', 'default']
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
                console.warn(
                    `[Plugins] Skipping installed plugin kind "${nodeManifest.kind}" from ${installedPlugin.id} because it is already registered`
                )
                continue
            }

            pluginRegistry.register(buildRuntimePlugin(installedPlugin, nodeManifest))
        }
    }
}
