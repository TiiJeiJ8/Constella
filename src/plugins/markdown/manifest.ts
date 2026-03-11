/**
 * Markdown 插件元数据
 */
import type { PluginMeta } from '../index'

export const manifest: PluginMeta = {
    kind: 'markdown',
    label: 'Markdown',
    icon: '📄',
    description: 'Markdown 富文本',
    editable: true,
    supportsCardMode: true,
    supportsFontSizeControl: true
}
