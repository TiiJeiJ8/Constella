/**
 * 文本节点插件
 */
import type { NodePlugin } from '../index'
import TextRenderer from './TextRenderer.vue'
import { manifest } from './manifest'

export const pluginPlugin: NodePlugin = {
    meta: manifest,
    renderer: TextRenderer
    // 使用通用编辑器，无需自定义
}

// 上下文兼容性导出（带丢的）
export const textPlugin = pluginPlugin
