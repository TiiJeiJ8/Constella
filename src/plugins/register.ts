/**
 * 插件注册入口
 * 在应用启动时调用此函数注册所有插件
 */
import { pluginRegistry } from './index'
import { blankPlugin } from './blank'
import { textPlugin } from './text'
import { markdownPlugin } from './markdown'
import { imagePlugin } from './image'

export function registerPlugins() {
    // 注册空白插件（默认/回退）
    pluginRegistry.register(blankPlugin)
    pluginRegistry.setFallback(blankPlugin)

    // 注册文本插件
    pluginRegistry.register(textPlugin)

    // 注册 Markdown 插件
    pluginRegistry.register(markdownPlugin)

    // 注册图片插件
    pluginRegistry.register(imagePlugin)

    console.log('[Plugins] Registered:', pluginRegistry.getRegisteredKinds())
}
