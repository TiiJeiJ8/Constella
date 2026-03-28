import { i18n } from '@/locales'
import { pluginRegistry, type PluginI18nMessages } from './index'
import { refreshDevelopmentPluginsCatalog, refreshInstalledPluginsCatalog } from './installed'
import { registerDevelopmentPluginsRuntime, registerInstalledPluginsRuntime } from './runtime'

let hasRegistered = false

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
    if (isDeveloperModeEnabled()) {
        await registerDevelopmentPluginsRuntime(developmentPlugins)
    }

    const installedPlugins = await refreshInstalledPluginsCatalog()
    await registerInstalledPluginsRuntime(installedPlugins)

    console.log('[Plugins] Auto-registered:', pluginRegistry.getRegisteredKinds())
}

export async function registerPlugins() {
    if (hasRegistered) return
    hasRegistered = true
    await performPluginRegistration()
}

export async function reloadPlugins() {
    pluginRegistry.clear()
    hasRegistered = false
    await registerPlugins()
}
