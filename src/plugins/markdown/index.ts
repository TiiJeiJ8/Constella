/**
 * Markdown 节点插件
 */
import type { NodePlugin } from '../index'
import MarkdownRenderer from './MarkdownRenderer.vue'
import { manifest } from './manifest'

export const pluginPlugin: NodePlugin = {
    meta: manifest,
    renderer: MarkdownRenderer
    // 使用通用编辑器
}

// 上下文兼容性导出（带丢的）
export const markdownPlugin = pluginPlugin
