/**
 * 空白节点插件
 */
import type { NodePlugin } from '../index'
import BlankRenderer from './BlankRenderer.vue'

export const blankPlugin: NodePlugin = {
    meta: {
        kind: 'blank',
        label: '空白',
        icon: '⬜',
        description: '空白占位节点',
        editable: false,
        supportsCardMode: false
    },
    renderer: BlankRenderer
}
