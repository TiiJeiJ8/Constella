/**
 * 图片插件
 * 用于在节点中显示图片内容
 */
import type { NodePlugin } from '../index'
import ImageRenderer from './ImageRenderer.vue'

export const imagePlugin: NodePlugin = {
    meta: {
        kind: 'image',
        label: '图片',
        icon: '🖼️',
        description: '图片内容',
        editable: false,
        supportsCardMode: false
    },
    renderer: ImageRenderer
}
