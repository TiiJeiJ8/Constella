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
let hasBoundDevelopmentPluginDiagnosticWatcher = false
let developmentPluginReloadTimer: number | null = null
let lastDevelopmentDiagnosticFingerprints = new Set<string>()
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
    updateDevelopmentDiagnosticFingerprints()
}

export async function registerPlugins() {
    bindDevelopmentPluginWatcher()
    bindDevelopmentPluginDiagnosticWatcher()
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
                notifyNewDevelopmentPluginErrors()
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error)
                toast.error(`Development plugin reload failed: ${message}`)
            }
        }, 220)
    })
}

function bindDevelopmentPluginDiagnosticWatcher() {
    if (hasBoundDevelopmentPluginDiagnosticWatcher) return
    hasBoundDevelopmentPluginDiagnosticWatcher = true

    pluginRegistry.subscribePluginDiagnostics(diagnostics => {
        if (!isDeveloperModeEnabled()) {
            updateDevelopmentDiagnosticFingerprints()
            return
        }

        notifyNewDevelopmentPluginErrorsFromDiagnostics(diagnostics)
    })
}

function createDiagnosticFingerprint(diagnostic: {
    id: string
    timestamp: string
}) {
    return `${diagnostic.id}:${diagnostic.timestamp}`
}

function updateDevelopmentDiagnosticFingerprints() {
    lastDevelopmentDiagnosticFingerprints = new Set(
        pluginRegistry
            .getPluginDiagnostics('development')
            .map(createDiagnosticFingerprint)
    )
}

function notifyNewDevelopmentPluginErrors() {
    const diagnostics = pluginRegistry.getPluginDiagnostics('development')
    notifyNewDevelopmentPluginErrorsFromDiagnostics(diagnostics)
}

function notifyNewDevelopmentPluginErrorsFromDiagnostics(diagnostics: ReturnType<typeof pluginRegistry.getPluginDiagnostics>) {
    const nextFingerprints = new Set(diagnostics.map(createDiagnosticFingerprint))
    const newErrors = diagnostics.filter(diagnostic =>
        diagnostic.source === 'development' &&
        diagnostic.severity === 'error' &&
        !lastDevelopmentDiagnosticFingerprints.has(createDiagnosticFingerprint(diagnostic))
    )

    lastDevelopmentDiagnosticFingerprints = nextFingerprints

    if (newErrors.length === 0) return

    const firstError = newErrors[0]
    if (!firstError) return
    const pluginLabel = firstError.pluginName || firstError.pluginId || 'development plugin'
    const suffix = newErrors.length > 1 ? ` (+${newErrors.length - 1} more)` : ''
    toast.error(`Plugin error detected in ${pluginLabel}. Open Settings > Plugins > Plugin Diagnostics.${suffix}`, 7000)
}
