/**
 * Hyperlink 节点插件
 */
import type { NodePlugin } from '../index'
import HyperlinkRenderer from './HyperlinkRenderer.vue'
import HyperlinkEditor from './HyperlinkEditor.vue'
import { manifest } from './manifest'

export const pluginPlugin: NodePlugin = {
    meta: manifest,
    renderer: HyperlinkRenderer,
    editor: HyperlinkEditor
    // 双击直接进编辑器（编辑器内有「在浏览器中打开」按钮）
}

export const hyperlinkPlugin = pluginPlugin
