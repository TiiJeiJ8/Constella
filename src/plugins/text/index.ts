/**
 * 文本节点插件
 */
import type { NodePlugin, PluginI18nMessages } from '../index'
import TextRenderer from './TextRenderer.vue'
import { manifest } from './manifest'

export const pluginI18n: PluginI18nMessages = {
    'zh-CN': {
        canvas: {
            nodeTypes: {
                text: '文本'
            },
            nodeTypeDesc: {
                text: '纯文本内容'
            }
        }
    },
    'en-US': {
        canvas: {
            nodeTypes: {
                text: 'Text'
            },
            nodeTypeDesc: {
                text: 'Plain text content'
            }
        }
    }
}

export const pluginPlugin: NodePlugin = {
    meta: manifest,
    renderer: TextRenderer
    // 使用通用编辑器，无需自定义
}

// 上下文兼容性导出（带丢的）
export const textPlugin = pluginPlugin
