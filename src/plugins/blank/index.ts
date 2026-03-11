/**
 * 空白节点插件
 */
import type { NodePlugin, PluginI18nMessages } from '../index'
import BlankRenderer from './BlankRenderer.vue'
import { manifest } from './manifest'

export const pluginI18n: PluginI18nMessages = {
    'zh-CN': {
        canvas: {
            nodeTypes: {
                blank: '空白'
            },
            nodeTypeDesc: {
                blank: '空白占位节点'
            }
        }
    },
    'en-US': {
        canvas: {
            nodeTypes: {
                blank: 'Blank'
            },
            nodeTypeDesc: {
                blank: 'Blank placeholder node'
            }
        }
    }
}

export const pluginPlugin: NodePlugin = {
    meta: manifest,
    renderer: BlankRenderer
}

// 上下文兼容性导出（带丢的）
export const blankPlugin = pluginPlugin
