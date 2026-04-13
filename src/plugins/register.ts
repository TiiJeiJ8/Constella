import { i18n } from '@/locales'
import { useToast } from '@/utils/useToast'
import { pluginRegistry, type PluginI18nMessages } from './index'
import {
    refreshDevelopmentPluginDiagnostics,
    refreshDevelopmentPluginsCatalog,
    refreshInstalledPluginsCatalog,
    subscribeDevelopmentPluginChanges
} from './installed'
import { registerDevelopmentPluginsRuntime, registerInstalledPluginsRuntime } from './runtime'

let hasRegistered = false
let developmentPluginReloadToken = `${Date.now()}`
let hasBoundDevelopmentPluginWatcher = false
let developmentPluginReloadTimer: number | null = null
const toast = useToast()

function isDeveloperModeEnabled(): boolean {
    try {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}')
        return settings.developerMode === true
    } catch {
        return false
    }
}

function registerPluginI18n(messages?: PluginI18nMessages) {
    if (!messages) return

    for (const [locale, localeMessages] of Object.entries(messages)) {
        i18n.global.mergeLocaleMessage(locale, localeMessages)
    }
}

async function performPluginRegistration() {
    console.log('[Plugins] Starting auto-discovery...')
    pluginRegistry.clearPluginDiagnostics()

    const pluginModules = import.meta.glob<any>('./**/index.ts', { eager: true })
    const builtinKinds: string[] = []

    for (const [modulePath, module] of Object.entries(pluginModules)) {
        if (!module.pluginPlugin) {
            if (modulePath.includes('plugins/index.ts')) {
                continue
            }
            continue
        }

        registerPluginI18n(module.pluginI18n)
        pluginRegistry.register(module.pluginPlugin)
        builtinKinds.push(module.pluginPlugin.meta.kind)
    }

    pluginRegistry.setBuiltinKinds(builtinKinds)

    const blankPlugin = pluginRegistry.get('blank')
    if (blankPlugin) {
        pluginRegistry.setFallback(blankPlugin)
    }

    const developmentPlugins = await refreshDevelopmentPluginsCatalog()
    await refreshDevelopmentPluginDiagnostics()
    if (isDeveloperModeEnabled()) {
        await registerDevelopmentPluginsRuntime(developmentPlugins, developmentPluginReloadToken)
    }

    const installedPlugins = await refreshInstalledPluginsCatalog()
    await registerInstalledPluginsRuntime(installedPlugins)

    console.log('[Plugins] Auto-registered:', pluginRegistry.getRegisteredKinds())
}

export async function registerPlugins() {
    bindDevelopmentPluginWatcher()
    if (hasRegistered) return
    hasRegistered = true
    await performPluginRegistration()
}

export async function reloadPlugins() {
    developmentPluginReloadToken = `${Date.now()}`
    pluginRegistry.clear()
    hasRegistered = false
    await registerPlugins()
}

function bindDevelopmentPluginWatcher() {
    if (hasBoundDevelopmentPluginWatcher) return
    hasBoundDevelopmentPluginWatcher = true

    subscribeDevelopmentPluginChanges(async payload => {
        if (!isDeveloperModeEnabled()) {
            return
        }

        if (developmentPluginReloadTimer !== null) {
            window.clearTimeout(developmentPluginReloadTimer)
        }

        developmentPluginReloadTimer = window.setTimeout(async () => {
            developmentPluginReloadTimer = null
            try {
                await reloadPlugins()
                const changedTarget = payload.changedPath || payload.sourcePath
                toast.info(`Development plugin reloaded: ${changedTarget}`)
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error)
                toast.error(`Development plugin reload failed: ${message}`)
            }
        }, 220)
    })
}
