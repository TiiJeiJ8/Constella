<template>
    <v-group>
        <!-- 连线本体 -->
        <v-line
            v-if="edge.type === 'straight'"
            :config="straightLineConfig"
            @click="handleClick"
            @dblclick="handleDblClick"
        />
        <v-path
            v-else-if="edge.type === 'bezier'"
            :config="bezierPathConfig"
            @click="handleClick"
            @dblclick="handleDblClick"
        />
        <v-line
            v-else-if="edge.type === 'step'"
            :config="stepLineConfig"
            @click="handleClick"
            @dblclick="handleDblClick"
        />
        
        <!-- 起始箭头 -->
        <v-path
            v-if="edge.startArrow !== 'none' && startArrowPath"
            :config="startArrowConfig"
        />
        
        <!-- 结束箭头 -->
        <v-path
            v-if="edge.endArrow !== 'none' && endArrowPath"
            :config="endArrowConfig"
        />
        
        <!-- 标签 -->
        <v-group v-if="edge.label" :config="labelGroupConfig">
            <v-rect :config="labelBgConfig" />
            <v-text :config="labelTextConfig" />
        </v-group>
        
        <!-- 选中高亮 -->
        <v-line
            v-if="isSelected && edge.type === 'straight'"
            :config="{ ...straightLineConfig, stroke: '#60a5fa', strokeWidth: edge.strokeWidth + 4, opacity: 0.5 }"
        />
    </v-group>
</template>

<script setup lang="ts">
import { computed } from 'vue'
// @ts-ignore
import type { RenderEdge, ArrowType } from '@/composables/useYjsEdges'

interface NodeRect {
    x: number
    y: number
    width: number
    height: number
}

const props = defineProps<{
    edge: RenderEdge
    sourceNode: NodeRect | null
    targetNode: NodeRect | null
    isSelected?: boolean
}>()

const emit = defineEmits<{
    (e: 'click', edgeId: string): void
    (e: 'dblclick', edgeId: string): void
}>()

// 计算锚点位置（自动从边界计算）
function getAnchorPoint(node: NodeRect, anchor: string, otherNode: NodeRect | null): { x: number; y: number } {
    const cx = node.x + node.width / 2
    const cy = node.y + node.height / 2
    
    // 如果指定了具体锚点则使用
    switch (anchor) {
        case 'top':
            return { x: cx, y: node.y }
        case 'right':
            return { x: node.x + node.width, y: cy }
        case 'bottom':
            return { x: cx, y: node.y + node.height }
        case 'left':
            return { x: node.x, y: cy }
    }
    
    // 自动计算：基于另一个节点的位置，找到最佳边界点
    if (otherNode) {
        const otherCx = otherNode.x + otherNode.width / 2
        const otherCy = otherNode.y + otherNode.height / 2
        
        // 计算方向向量
        const dx = otherCx - cx
        const dy = otherCy - cy
        
        // 计算与节点边界的交点
        const halfWidth = node.width / 2
        const halfHeight = node.height / 2
        
        // 使用射线-矩形交点算法
        if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) {
            // 两个节点重叠，返回中心
            return { x: cx, y: cy }
        }
        
        // 计算 t 值，找到边界交点
        let tX = Infinity
        let tY = Infinity
        
        if (dx !== 0) {
            tX = halfWidth / Math.abs(dx)
        }
        if (dy !== 0) {
            tY = halfHeight / Math.abs(dy)
        }
        
        const t = Math.min(tX, tY)
        
        return {
            x: cx + dx * t,
            y: cy + dy * t
        }
    }
    
    // 默认返回中心
    return { x: cx, y: cy }
}

// 计算连线端点
const sourcePoint = computed(() => {
    if (!props.sourceNode) return { x: 0, y: 0 }
    return getAnchorPoint(props.sourceNode, props.edge.sourceAnchor || 'auto', props.targetNode)
})

const targetPoint = computed(() => {
    if (!props.targetNode) return { x: 0, y: 0 }
    return getAnchorPoint(props.targetNode, props.edge.targetAnchor || 'auto', props.sourceNode)
})

// 直线配置
const straightLineConfig = computed(() => ({
    points: [sourcePoint.value.x, sourcePoint.value.y, targetPoint.value.x, targetPoint.value.y],
    stroke: props.edge.color,
    strokeWidth: props.edge.strokeWidth,
    dash: props.edge.dashArray,
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
    hitStrokeWidth: 20
}))

// 贝塞尔曲线路径
const bezierPath = computed(() => {
    const sx = sourcePoint.value.x
    const sy = sourcePoint.value.y
    const tx = targetPoint.value.x
    const ty = targetPoint.value.y
    
    const dx = tx - sx
    const dy = ty - sy
    const dist = Math.sqrt(dx * dx + dy * dy)
    const offset = Math.min(dist * 0.3, 100)
    
    // 根据锚点方向调整控制点
    let c1x = sx, c1y = sy, c2x = tx, c2y = ty
    
    const sourceAnchor = props.edge.sourceAnchor || 'center'
    const targetAnchor = props.edge.targetAnchor || 'center'
    
    switch (sourceAnchor) {
        case 'top': c1y = sy - offset; break
        case 'bottom': c1y = sy + offset; break
        case 'left': c1x = sx - offset; break
        case 'right': c1x = sx + offset; break
        default: c1x = sx + offset
    }
    
    switch (targetAnchor) {
        case 'top': c2y = ty - offset; break
        case 'bottom': c2y = ty + offset; break
        case 'left': c2x = tx - offset; break
        case 'right': c2x = tx + offset; break
        default: c2x = tx - offset
    }
    
    return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`
})

const bezierPathConfig = computed(() => ({
    data: bezierPath.value,
    stroke: props.edge.color,
    strokeWidth: props.edge.strokeWidth,
    dash: props.edge.dashArray,
    fill: 'transparent',
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
    hitStrokeWidth: 20
}))

// 阶梯线配置
const stepLineConfig = computed(() => {
    const sx = sourcePoint.value.x
    const sy = sourcePoint.value.y
    const tx = targetPoint.value.x
    const ty = targetPoint.value.y
    
    const midX = (sx + tx) / 2
    
    return {
        points: [sx, sy, midX, sy, midX, ty, tx, ty],
        stroke: props.edge.color,
        strokeWidth: props.edge.strokeWidth,
        dash: props.edge.dashArray,
        lineCap: 'round' as const,
        lineJoin: 'round' as const,
        hitStrokeWidth: 20
    }
})

// 计算箭头路径
function createArrowPath(type: ArrowType, x: number, y: number, angle: number, size: number): string {
    const rad = angle * Math.PI / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    
    switch (type) {
        case 'arrow': {
            const p1x = x - size * cos + size * 0.5 * sin
            const p1y = y - size * sin - size * 0.5 * cos
            const p2x = x - size * cos - size * 0.5 * sin
            const p2y = y - size * sin + size * 0.5 * cos
            return `M ${x} ${y} L ${p1x} ${p1y} L ${p2x} ${p2y} Z`
        }
        case 'diamond': {
            const half = size * 0.5
            const p1x = x + half * cos
            const p1y = y + half * sin
            const p2x = x + half * sin
            const p2y = y - half * cos
            const p3x = x - half * cos
            const p3y = y - half * sin
            const p4x = x - half * sin
            const p4y = y + half * cos
            return `M ${p1x} ${p1y} L ${p2x} ${p2y} L ${p3x} ${p3y} L ${p4x} ${p4y} Z`
        }
        case 'circle': {
            const r = size * 0.4
            return `M ${x + r} ${y} A ${r} ${r} 0 1 0 ${x - r} ${y} A ${r} ${r} 0 1 0 ${x + r} ${y}`
        }
        default:
            return ''
    }
}

// 计算角度
function getAngle(x1: number, y1: number, x2: number, y2: number): number {
    return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI
}

// 箭头配置
const arrowSize = computed(() => props.edge.strokeWidth * 5)

const startArrowPath = computed(() => {
    if (props.edge.startArrow === 'none') return ''
    const angle = getAngle(targetPoint.value.x, targetPoint.value.y, sourcePoint.value.x, sourcePoint.value.y)
    return createArrowPath(props.edge.startArrow, sourcePoint.value.x, sourcePoint.value.y, angle, arrowSize.value)
})

const endArrowPath = computed(() => {
    if (props.edge.endArrow === 'none') return ''
    const angle = getAngle(sourcePoint.value.x, sourcePoint.value.y, targetPoint.value.x, targetPoint.value.y)
    return createArrowPath(props.edge.endArrow, targetPoint.value.x, targetPoint.value.y, angle, arrowSize.value)
})

const startArrowConfig = computed(() => ({
    data: startArrowPath.value,
    fill: props.edge.color,
    stroke: props.edge.color,
    strokeWidth: 1
}))

const endArrowConfig = computed(() => ({
    data: endArrowPath.value,
    fill: props.edge.color,
    stroke: props.edge.color,
    strokeWidth: 1
}))

// 标签配置
const labelPoint = computed(() => {
    const t = props.edge.labelPosition ?? 0.5
    const sx = sourcePoint.value.x
    const sy = sourcePoint.value.y
    const tx = targetPoint.value.x
    const ty = targetPoint.value.y
    
    return {
        x: sx + (tx - sx) * t,
        y: sy + (ty - sy) * t
    }
})

const labelGroupConfig = computed(() => ({
    x: labelPoint.value.x,
    y: labelPoint.value.y
}))

const labelTextConfig = computed(() => ({
    text: props.edge.label || '',
    fontSize: 12,
    fill: '#ffffff',
    align: 'center' as const,
    verticalAlign: 'middle' as const,
    offsetX: (props.edge.label?.length || 0) * 3,
    offsetY: 8
}))

const labelBgConfig = computed(() => {
    const textWidth = (props.edge.label?.length || 0) * 7 + 12
    return {
        x: -textWidth / 2,
        y: -10,
        width: textWidth,
        height: 20,
        fill: props.edge.color,
        cornerRadius: 4,
        opacity: 0.9
    }
})

// 事件处理
function handleClick() {
    emit('click', props.edge.id)
}

function handleDblClick() {
    emit('dblclick', props.edge.id)
}
</script>
