import { pluginRegistry } from './index'
import type { InstalledPluginRecord } from './package'

export async function refreshInstalledPluginsCatalog(): Promise<InstalledPluginRecord[]> {
    if (!window.electron?.listInstalledPlugins) {
        pluginRegistry.setInstalledPlugins([])
        return []
    }

    const installedPlugins = await window.electron.listInstalledPlugins()
    pluginRegistry.setInstalledPlugins(installedPlugins)
    return installedPlugins
}

export async function installPluginPackage(sourcePath?: string): Promise<InstalledPluginRecord> {
    if (!window.electron?.installPluginPackage) {
        throw new Error('Plugin installation is only available in Electron')
    }

    const installedPlugin = await window.electron.installPluginPackage(sourcePath)
    await refreshInstalledPluginsCatalog()
    return installedPlugin
}

export async function setInstalledPluginEnabled(pluginId: string, enabled: boolean): Promise<InstalledPluginRecord> {
    if (!window.electron?.setInstalledPluginEnabled) {
        throw new Error('Plugin installation is only available in Electron')
    }

    const updatedPlugin = await window.electron.setInstalledPluginEnabled(pluginId, enabled)
    await refreshInstalledPluginsCatalog()
    return updatedPlugin
}

export async function removeInstalledPlugin(pluginId: string): Promise<void> {
    if (!window.electron?.removeInstalledPlugin) {
        throw new Error('Plugin installation is only available in Electron')
    }

    await window.electron.removeInstalledPlugin(pluginId)
    await refreshInstalledPluginsCatalog()
}
