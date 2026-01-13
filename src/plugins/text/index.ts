/**
 * 文本节点插件
 */
import type { NodePlugin } from '../index'
import TextRenderer from './TextRenderer.vue'

export const textPlugin: NodePlugin = {
    meta: {
        kind: 'text',
        label: '文本',
        icon: '📝',
        description: '纯文本内容',
        editable: true,
        supportsCardMode: true
    },
    renderer: TextRenderer
    // 使用通用编辑器，无需自定义
}
