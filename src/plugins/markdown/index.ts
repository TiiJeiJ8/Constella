/**
 * Markdown 节点插件
 */
import type { NodePlugin, PluginI18nMessages } from '../index'
import MarkdownRenderer from './MarkdownRenderer.vue'
import { manifest } from './manifest'

export const pluginI18n: PluginI18nMessages = {
    'zh-CN': {
        canvas: {
            nodeTypes: {
                markdown: 'Markdown'
            },
            nodeTypeDesc: {
                markdown: 'Markdown 富文本'
            }
        }
    },
    'en-US': {
        canvas: {
            nodeTypes: {
                markdown: 'Markdown'
            },
            nodeTypeDesc: {
                markdown: 'Markdown rich text'
            }
        }
    }
}

export const pluginPlugin: NodePlugin = {
    meta: manifest,
    renderer: MarkdownRenderer
    // 使用通用编辑器
}

// 上下文兼容性导出（带丢的）
export const markdownPlugin = pluginPlugin
