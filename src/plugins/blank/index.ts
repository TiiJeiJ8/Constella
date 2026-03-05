/**
 * 空白节点插件
 */
import type { NodePlugin } from '../index'
import BlankRenderer from './BlankRenderer.vue'
import { manifest } from './manifest'

export const pluginPlugin: NodePlugin = {
    meta: manifest,
    renderer: BlankRenderer
}

// 上下文兼容性导出（带丢的）
export const blankPlugin = pluginPlugin
