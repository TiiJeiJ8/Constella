/**
 * 插件注册入口
 * 在应用启动时自动发现和注册所有插件
 * 
 * 工作原理：
 * 1. 使用 import.meta.glob 动态导入所有插件的 index.ts
 * 2. 查找各个模块导出的 pluginPlugin 对象
 * 3. 自动注册到插件注册表
 * 4. 设置 'blank' 插件为回退选项
 */
import { i18n } from '@/locales'
import { pluginRegistry, type PluginI18nMessages } from './index'
import { refreshInstalledPluginsCatalog } from './installed'
import { registerInstalledPluginsRuntime } from './runtime'

let hasRegistered = false

function registerPluginI18n(messages?: PluginI18nMessages) {
    if (!messages) return

    for (const [locale, localeMessages] of Object.entries(messages)) {
        i18n.global.mergeLocaleMessage(locale, localeMessages)
    }
}

async function performPluginRegistration() {
    console.log('[Plugins] Starting auto-discovery...')

    // 动态导入所有插件，使用 eager: true 在同步函数中加载
    const pluginModules = import.meta.glob<any>('./**/index.ts', { eager: true })

    // 遍历所有导入的模块
    for (const [path, module] of Object.entries(pluginModules)) {
        // 查找 pluginPlugin 导出
        if (module.pluginPlugin) {
            registerPluginI18n(module.pluginI18n)
            pluginRegistry.register(module.pluginPlugin)
        } else if (path.includes('plugins/index.ts')) {
            // 跳过插件系统的主 index.ts
            continue
        }
    }

    // 如果已注册 blank 插件，设置为回退
    const blankPlugin = pluginRegistry.get('blank')
    if (blankPlugin) {
        pluginRegistry.setFallback(blankPlugin)
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
