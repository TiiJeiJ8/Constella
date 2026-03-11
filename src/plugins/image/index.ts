/**
 * 图片插件
 * 用于在节点中显示图片内容
 */
import type { NodePlugin, PluginI18nMessages } from '../index'
import ImageRenderer from './ImageRenderer.vue'
import { manifest } from './manifest'

export const pluginI18n: PluginI18nMessages = {
    'zh-CN': {
        canvas: {
            nodeTypes: {
                image: '图片'
            },
            nodeTypeDesc: {
                image: '图片内容'
            }
        }
    },
    'en-US': {
        canvas: {
            nodeTypes: {
                image: 'Image'
            },
            nodeTypeDesc: {
                image: 'Image content'
            }
        }
    }
}

export const pluginPlugin: NodePlugin = {
    meta: manifest,
    renderer: ImageRenderer
}

// 上下文兼容性导出（带丢的）
export const imagePlugin = pluginPlugin
