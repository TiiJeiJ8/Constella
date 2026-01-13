/**
 * Markdown 节点插件
 */
import type { NodePlugin } from '../index'
import MarkdownRenderer from './MarkdownRenderer.vue'

export const markdownPlugin: NodePlugin = {
    meta: {
        kind: 'markdown',
        label: 'Markdown',
        icon: '📄',
        description: 'Markdown 富文本',
        editable: true,
        supportsCardMode: true
    },
    renderer: MarkdownRenderer
    // 使用通用编辑器
}
