/**
 * 图片插件
 * 用于在节点中显示图片内容
 */
import type { NodePlugin } from '../index'
import ImageRenderer from './ImageRenderer.vue'
import { manifest } from './manifest'

export const pluginPlugin: NodePlugin = {
    meta: manifest,
    renderer: ImageRenderer
}

// 上下文兼容性导出（带丢的）
export const imagePlugin = pluginPlugin
