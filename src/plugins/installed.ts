import { pluginRegistry } from './index'
import type { DevelopmentPluginRecord, InstalledPluginRecord } from './package'

export async function refreshInstalledPluginsCatalog(): Promise<InstalledPluginRecord[]> {
    if (!window.electron?.listInstalledPlugins) {
        pluginRegistry.setInstalledPlugins([])
        return []
    }

    const installedPlugins = await window.electron.listInstalledPlugins()
    pluginRegistry.setInstalledPlugins(installedPlugins)
    return installedPlugins
}

export async function refreshDevelopmentPluginsCatalog(): Promise<DevelopmentPluginRecord[]> {
    if (!window.electron?.listDevelopmentPlugins) {
        pluginRegistry.setDevelopmentPlugins([])
        return []
    }

    const developmentPlugins = await window.electron.listDevelopmentPlugins()
    pluginRegistry.setDevelopmentPlugins(developmentPlugins)
    return developmentPlugins
}

export async function installPluginPackage(sourcePath?: string): Promise<InstalledPluginRecord> {
    if (!window.electron?.installPluginPackage) {
        throw new Error('Plugin installation is only available in Electron')
    }

    const installedPlugin = await window.electron.installPluginPackage(sourcePath)
    await refreshInstalledPluginsCatalog()
    return installedPlugin
}

export async function addDevelopmentPlugin(sourcePath?: string): Promise<DevelopmentPluginRecord> {
    if (!window.electron?.addDevelopmentPlugin) {
        throw new Error('Development plugin loading is only available in Electron')
    }

    const developmentPlugin = await window.electron.addDevelopmentPlugin(sourcePath)
    await refreshDevelopmentPluginsCatalog()
    return developmentPlugin
}

export async function setInstalledPluginEnabled(pluginId: string, enabled: boolean): Promise<InstalledPluginRecord> {
    if (!window.electron?.setInstalledPluginEnabled) {
        throw new Error('Plugin installation is only available in Electron')
    }

    const updatedPlugin = await window.electron.setInstalledPluginEnabled(pluginId, enabled)
    await refreshInstalledPluginsCatalog()
    return updatedPlugin
}

export async function setDevelopmentPluginEnabled(pluginId: string, enabled: boolean): Promise<DevelopmentPluginRecord> {
    if (!window.electron?.setDevelopmentPluginEnabled) {
        throw new Error('Development plugin loading is only available in Electron')
    }

    const updatedPlugin = await window.electron.setDevelopmentPluginEnabled(pluginId, enabled)
    await refreshDevelopmentPluginsCatalog()
    return updatedPlugin
}

export async function removeInstalledPlugin(pluginId: string): Promise<void> {
    if (!window.electron?.removeInstalledPlugin) {
        throw new Error('Plugin installation is only available in Electron')
    }

    await window.electron.removeInstalledPlugin(pluginId)
    await refreshInstalledPluginsCatalog()
}

export async function removeDevelopmentPlugin(pluginId: string): Promise<void> {
    if (!window.electron?.removeDevelopmentPlugin) {
        throw new Error('Development plugin loading is only available in Electron')
    }

    await window.electron.removeDevelopmentPlugin(pluginId)
    await refreshDevelopmentPluginsCatalog()
}
