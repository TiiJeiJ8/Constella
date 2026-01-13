<template>
    <div 
        v-if="content && rendererComponent"
        class="node-content-overlay"
        :style="overlayStyle"
    >
        <component
            :is="rendererComponent"
            :content="content"
            :width="scaledWidth"
            :height="scaledHeight"
            :display-mode="content.displayMode || 'full'"
            :scale="props.stageScale"
        />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
// @ts-ignore
import { pluginRegistry, type NodeContent, type ContentKind } from '@/plugins'

const props = defineProps<{
    nodeId: string
    content: NodeContent
    x: number
    y: number
    width: number
    height: number
    zIndex: number
    stageScale: number
    stagePosition: { x: number; y: number }
}>()

// 内边距
const PADDING = 2

// 计算缩放后的尺寸
const scaledWidth = computed(() => props.width * props.stageScale - PADDING * 2)
const scaledHeight = computed(() => props.height * props.stageScale - PADDING * 2)

// 计算叠加层位置样式
const overlayStyle = computed(() => {
    const screenX = props.x * props.stageScale + props.stagePosition.x + PADDING
    const screenY = props.y * props.stageScale + props.stagePosition.y + PADDING

    return {
        left: `${screenX}px`,
        top: `${screenY}px`,
        width: `${scaledWidth.value}px`,
        height: `${scaledHeight.value}px`,
        fontSize: `${Math.max(10, 13 * props.stageScale)}px`,
        pointerEvents: 'none' as const,
        // 使用节点的 zIndex，确保文字层级与节点矩形一致
        // 基础值 1 保证在画布之上，乘以系数确保层级差异明显
        zIndex: 1 + props.zIndex
    }
})

// 获取渲染器组件
const rendererComponent = computed(() => {
    const kind = props.content?.kind || 'blank'
    return pluginRegistry.getRenderer(kind as ContentKind)
})
</script>

<style scoped>
.node-content-overlay {
    position: absolute;
    border-radius: 6px;
    overflow: hidden;
    color: white;
    user-select: none;
}
</style>
