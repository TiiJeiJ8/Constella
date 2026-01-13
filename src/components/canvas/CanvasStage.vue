<template>
    <div 
        class="canvas-stage-container" 
        ref="containerRef"
        @mouseleave="handleMouseLeave"
    >
        <v-stage
            ref="stageRef"
            :config="stageConfig"
            @wheel="handleWheel"
            @mousedown="handleMouseDown"
            @mousemove="handleMouseMove"
            @mouseup="handleMouseUp"
        >
            <!-- 背景网格层 -->
            <v-layer ref="gridLayerRef">
                <v-line
                    v-for="line in gridLines"
                    :key="line.key"
                    :config="line.config"
                />
            </v-layer>

            <!-- 主内容层 -->
            <v-layer ref="mainLayerRef">
                <!-- 节点（使用 Group 组合，数据来自 Yjs） -->
                <v-group
                    v-for="node in displayNodes"
                    :key="node.id"
                    :config="{
                        x: node.x,
                        y: node.y,
                        draggable: true
                    }"
                    @click="handleNodeClick(node, $event)"
                    @tap="handleNodeClick(node, $event)"
                    @dragstart="handleNodeDragStart(node)"
                    @dragmove="handleNodeDragMove(node, $event)"
                    @dragend="handleNodeDragEnd(node, $event)"
                    @transformend="handleNodeTransformEnd(node, $event)"
                >
                    <v-rect :config="node.rectConfig" />
                    <v-text :config="node.textConfig" />
                </v-group>
                
                <!-- 框选矩形 -->
                <v-rect
                    v-if="selectionRect.visible"
                    :config="selectionRect.config"
                />
                
                <!-- Transformer 选中效果 -->
                <v-transformer ref="transformerRef" />
            </v-layer>
            
            <!-- 远程光标层 -->
            <v-layer ref="cursorLayerRef">
                <v-group
                    v-for="cursor in remoteCursorsInView"
                    :key="cursor.clientId"
                    :config="{ x: cursor.cursor.x, y: cursor.cursor.y }"
                >
                    <!-- 光标箭头 -->
                    <v-line
                        :config="{
                            points: [0, 0, 0, 16, 4, 12, 8, 20, 10, 19, 6, 11, 12, 11],
                            fill: cursor.user.color,
                            closed: true,
                            shadowColor: 'rgba(0,0,0,0.3)',
                            shadowBlur: 2,
                            shadowOffset: { x: 1, y: 1 }
                        }"
                    />
                    <!-- 用户名标签 -->
                    <v-label :config="{ x: 14, y: 14 }">
                        <v-tag
                            :config="{
                                fill: cursor.user.color,
                                cornerRadius: 3
                            }"
                        />
                        <v-text
                            :config="{
                                text: cursor.user.name,
                                fontSize: 11,
                                fontFamily: 'Arial',
                                fill: '#ffffff',
                                padding: 4
                            }"
                        />
                    </v-label>
                </v-group>
            </v-layer>
        </v-stage>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import Konva from 'konva'

const props = defineProps({
    activeTool: {
        type: String,
        default: 'select'
    },
    gridSize: {
        type: Number,
        default: 20
    },
    gridColor: {
        type: String,
        default: '#e0e0e0'
    },
    backgroundColor: {
        type: String,
        default: '#ffffff'
    },
    // Yjs 节点数据
    yjsNodes: {
        type: Array,
        default: () => []
    },
    // 远程用户光标
    remoteCursors: {
        type: Array,
        default: () => []
    }
})

const emit = defineEmits(['zoom-change', 'position-change', 'node-select', 'node-update', 'node-delete', 'node-create', 'cursor-move', 'cursor-leave', 'undo', 'redo'])

// Refs
const containerRef = ref(null)
const stageRef = ref(null)
const gridLayerRef = ref(null)
const mainLayerRef = ref(null)
const transformerRef = ref(null)

// 状态
const stageConfig = ref({
    width: 800,
    height: 600,
    draggable: false,
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1
})

const isPanning = ref(false)
const isSpacePressed = ref(false)
const lastPointerPosition = ref({ x: 0, y: 0 })

// 选中状态
const selectedNodeIds = ref(new Set())
const isSelecting = ref(false)
const selectionRect = ref({
    visible: false,
    config: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        fill: 'rgba(0, 120, 255, 0.1)',
        stroke: '#0078ff',
        strokeWidth: 1,
        dash: [4, 4],
        listening: false
    }
})
const selectionStart = ref({ x: 0, y: 0 })

// 使用传入的 Yjs 节点数据
const displayNodes = computed(() => props.yjsNodes || [])

// 过滤有光标位置的远程用户
const remoteCursorsInView = computed(() => {
    return (props.remoteCursors || []).filter(user => user.cursor)
})

// 计算网格线
const gridLines = computed(() => {
    const lines = []
    const stage = stageConfig.value
    const gridSize = props.gridSize
    
    // 计算可见区域
    const startX = Math.floor(-stage.x / stage.scaleX / gridSize) * gridSize
    const endX = Math.floor((-stage.x + stage.width) / stage.scaleX / gridSize) * gridSize
    const startY = Math.floor(-stage.y / stage.scaleY / gridSize) * gridSize
    const endY = Math.floor((-stage.y + stage.height) / stage.scaleY / gridSize) * gridSize

    // 垂直线
    for (let x = startX; x <= endX; x += gridSize) {
        lines.push({
            key: `v-${x}`,
            config: {
                points: [x, startY, x, endY],
                stroke: props.gridColor,
                strokeWidth: 1
            }
        })
    }

    // 水平线
    for (let y = startY; y <= endY; y += gridSize) {
        lines.push({
            key: `h-${y}`,
            config: {
                points: [startX, y, endX, y],
                stroke: props.gridColor,
                strokeWidth: 1
            }
        })
    }

    return lines
})

// 滚轮缩放
function handleWheel(e) {
    e.evt.preventDefault()
    
    const stage = stageRef.value.getNode()
    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    
    const scaleBy = 1.1
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy
    
    // 限制缩放范围
    const clampedScale = Math.max(0.1, Math.min(5, newScale))
    
    const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale
    }
    
    const newPos = {
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale
    }
    
    stageConfig.value.scaleX = clampedScale
    stageConfig.value.scaleY = clampedScale
    stageConfig.value.x = newPos.x
    stageConfig.value.y = newPos.y
    
    emitZoomChange()
    emitPositionChange()
}

// 鼠标按下
function handleMouseDown(e) {
    const stage = stageRef.value.getNode()
    
    // 空格键 + 左键 或 手抓工具 = 平移模式
    if (e.evt.button === 0 && (isSpacePressed.value || props.activeTool === 'pan')) {
        isPanning.value = true
        lastPointerPosition.value = stage.getPointerPosition()
        stage.container().style.cursor = 'grabbing'
        return
    }
    
    // 节点工具：点击空白处创建新节点
    if (props.activeTool === 'node' && e.target === stage) {
        const pos = stage.getPointerPosition()
        // 转换为画布坐标
        const canvasPos = {
            x: (pos.x - stage.x()) / stage.scaleX(),
            y: (pos.y - stage.y()) / stage.scaleY()
        }
        
        // 发送创建节点事件
        emit('node-create', {
            x: canvasPos.x,
            y: canvasPos.y
        })
        
        console.log('[CanvasStage] Create node at:', canvasPos)
        return
    }
    
    // 选择工具：点击空白处开始框选
    if (props.activeTool === 'select' && e.target === stage) {
        // 点击空白处取消选中（除非 Ctrl/Shift）
        if (!e.evt.ctrlKey && !e.evt.metaKey && !e.evt.shiftKey) {
            clearSelection()
        }
        
        // 开始框选
        isSelecting.value = true
        const pos = stage.getPointerPosition()
        selectionStart.value = {
            x: (pos.x - stage.x()) / stage.scaleX(),
            y: (pos.y - stage.y()) / stage.scaleY()
        }
        selectionRect.value.config.x = selectionStart.value.x
        selectionRect.value.config.y = selectionStart.value.y
        selectionRect.value.config.width = 0
        selectionRect.value.config.height = 0
        selectionRect.value.visible = true
    }
}

// 鼠标移动
function handleMouseMove(e) {
    const stage = stageRef.value.getNode()
    
    // 平移模式
    if (isPanning.value) {
        const pointer = stage.getPointerPosition()
        const dx = pointer.x - lastPointerPosition.value.x
        const dy = pointer.y - lastPointerPosition.value.y
        
        stageConfig.value.x += dx
        stageConfig.value.y += dy
        
        lastPointerPosition.value = pointer
        emitPositionChange()
        return
    }
    
    // 框选模式
    if (isSelecting.value) {
        const pos = stage.getPointerPosition()
        const currentPos = {
            x: (pos.x - stage.x()) / stage.scaleX(),
            y: (pos.y - stage.y()) / stage.scaleY()
        }
        
        const width = currentPos.x - selectionStart.value.x
        const height = currentPos.y - selectionStart.value.y
        
        selectionRect.value.config.x = width < 0 ? currentPos.x : selectionStart.value.x
        selectionRect.value.config.y = height < 0 ? currentPos.y : selectionStart.value.y
        selectionRect.value.config.width = Math.abs(width)
        selectionRect.value.config.height = Math.abs(height)
    }
    
    // 发送光标位置（节流）
    throttle('cursor-move', () => {
        const pos = stage.getPointerPosition()
        if (pos) {
            const canvasPos = {
                x: (pos.x - stage.x()) / stage.scaleX(),
                y: (pos.y - stage.y()) / stage.scaleY()
            }
            emit('cursor-move', canvasPos)
        }
    }, 50)  // 50ms 节流，约 20fps
}

// 鼠标释放
function handleMouseUp(e) {
    const stage = stageRef.value.getNode()
    
    // 结束平移
    if (isPanning.value) {
        isPanning.value = false
        stage.container().style.cursor = getCursor()
        return
    }
    
    // 结束框选
    if (isSelecting.value) {
        isSelecting.value = false
        
        // 计算框选范围内的节点
        const box = selectionRect.value.config
        const selected = displayNodes.value.filter(node => {
            const nodeBox = {
                x: node.x,
                y: node.y,
                width: node.rectConfig.width,
                height: node.rectConfig.height
            }
            
            // 检查节点是否与框选矩形相交
            return (
                nodeBox.x < box.x + box.width &&
                nodeBox.x + nodeBox.width > box.x &&
                nodeBox.y < box.y + box.height &&
                nodeBox.y + nodeBox.height > box.y
            )
        })
        
        // 更新选中状态
        if (!e.evt.ctrlKey && !e.evt.metaKey && !e.evt.shiftKey) {
            selectedNodeIds.value.clear()
        }
        selected.forEach(node => selectedNodeIds.value.add(node.id))
        
        // 隐藏框选矩形
        selectionRect.value.visible = false
        
        // 更新 Transformer
        updateTransformer()
        
        // 发送选中事件
        emitSelection()
    }
}

// 鼠标离开画布
function handleMouseLeave() {
    emit('cursor-leave')
}

// 节点点击
function handleNodeClick(node, e) {
    if (props.activeTool !== 'select') return
    
    // 阻止事件冒泡（避免触发 stage 点击）
    e.cancelBubble = true
    
    // Ctrl/Cmd + 点击 = 切换选中状态
    if (e.evt.ctrlKey || e.evt.metaKey) {
        if (selectedNodeIds.value.has(node.id)) {
            selectedNodeIds.value.delete(node.id)
        } else {
            selectedNodeIds.value.add(node.id)
        }
    }
    // Shift + 点击 = 添加到选中
    else if (e.evt.shiftKey) {
        selectedNodeIds.value.add(node.id)
    }
    // 普通点击 = 单选
    else {
        selectedNodeIds.value.clear()
        selectedNodeIds.value.add(node.id)
    }
    
    updateTransformer()
    emitSelection()
    
    console.log('[CanvasStage] Node clicked:', node.id, 'Selected:', Array.from(selectedNodeIds.value))
}

// 节流函数：限制函数执行频率
const throttleTimers = new Map()
function throttle(key, fn, delay = 16) {
    if (throttleTimers.has(key)) return
    fn()
    throttleTimers.set(key, setTimeout(() => {
        throttleTimers.delete(key)
    }, delay))
}

// 节点拖拽开始
function handleNodeDragStart(node) {
    // 如果拖拽的节点不在选中列表中，则单选它
    if (!selectedNodeIds.value.has(node.id)) {
        selectedNodeIds.value.clear()
        selectedNodeIds.value.add(node.id)
        updateTransformer()
        emitSelection()
    }
}

// 节点拖拽中（实时同步）
function handleNodeDragMove(node, e) {
    const group = e.target
    const newX = group.x()
    const newY = group.y()
    
    // 节流：约60fps，避免发送过多更新
    throttle(`drag-${node.id}`, () => {
        emit('node-update', {
            id: node.id,
            x: newX,
            y: newY,
            _realtime: true  // 标记为实时更新
        })
    }, 16)
    
    // 拖动节点时也更新光标位置
    const stage = stageRef.value.getNode()
    throttle('cursor-move', () => {
        const pos = stage.getPointerPosition()
        if (pos) {
            const canvasPos = {
                x: (pos.x - stage.x()) / stage.scaleX(),
                y: (pos.y - stage.y()) / stage.scaleY()
            }
            emit('cursor-move', canvasPos)
        }
    }, 50)
}

// 节点拖拽结束
function handleNodeDragEnd(node, e) {
    const group = e.target
    const newX = group.x()
    const newY = group.y()
    
    // 发送节点更新事件（同步到 Yjs）
    emit('node-update', {
        id: node.id,
        x: newX,
        y: newY
    })
    
    // 更新 Transformer 位置
    updateTransformer()
    
    console.log('[CanvasStage] Node moved:', node.id, { x: newX, y: newY })
}

// 节点变换结束（缩放、旋转）
function handleNodeTransformEnd(node, e) {
    const group = e.target
    
    // 发送节点更新事件（包含变换数据）
    emit('node-update', {
        id: node.id,
        x: group.x(),
        y: group.y(),
        scaleX: group.scaleX(),
        scaleY: group.scaleY(),
        rotation: group.rotation()
    })
    
    console.log('[CanvasStage] Node transformed:', node.id, {
        x: group.x(),
        y: group.y(),
        scaleX: group.scaleX(),
        scaleY: group.scaleY(),
        rotation: group.rotation()
    })
}

// 获取光标样式
function getCursor() {
    switch (props.activeTool) {
        case 'pan':
            return 'grab'
        case 'node':
            return 'crosshair'
        case 'edge':
            return 'crosshair'
        default:
            return 'default'
    }
}

// 发送缩放变化事件
function emitZoomChange() {
    const zoom = Math.round(stageConfig.value.scaleX * 100)
    emit('zoom-change', zoom)
}

// 发送位置变化事件
function emitPositionChange() {
    const position = {
        x: Math.round(-stageConfig.value.x / stageConfig.value.scaleX),
        y: Math.round(-stageConfig.value.y / stageConfig.value.scaleY)
    }
    emit('position-change', position)
}

// 发送选中事件
function emitSelection() {
    const selectedIds = Array.from(selectedNodeIds.value)
    emit('node-select', selectedIds)
}

// 清除选中
function clearSelection() {
    selectedNodeIds.value.clear()
    if (transformerRef.value) {
        const transformer = transformerRef.value.getNode()
        transformer.nodes([])
    }
    emitSelection()
}

// 更新 Transformer
function updateTransformer() {
    if (!transformerRef.value || !mainLayerRef.value) return
    
    const transformer = transformerRef.value.getNode()
    const layer = mainLayerRef.value.getNode()
    
    if (selectedNodeIds.value.size === 0) {
        transformer.nodes([])
        return
    }
    
    // 获取所有选中节点的 Konva Group 对象
    const selectedShapes = []
    layer.children.forEach(child => {
        // 检查是否是 Group（跳过框选矩形和 Transformer）
        if (child.getClassName() === 'Group') {
            const node = displayNodes.value.find(n => {
                return Math.abs(child.x() - n.x) < 1 && 
                       Math.abs(child.y() - n.y) < 1
            })
            if (node && selectedNodeIds.value.has(node.id)) {
                selectedShapes.push(child)
            }
        }
    })
    
    transformer.nodes(selectedShapes)
}

// 调整舞台大小
function resizeStage() {
    if (!containerRef.value) return
    
    const container = containerRef.value
    stageConfig.value.width = container.offsetWidth
    stageConfig.value.height = container.offsetHeight
}

// 监听工具变化
watch(() => props.activeTool, (newTool) => {
    if (stageRef.value) {
        const stage = stageRef.value.getNode()
        stage.container().style.cursor = getCursor()
    }
})

// 监听空格键
function handleKeyDown(e) {
    if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        isSpacePressed.value = true
        if (stageRef.value) {
            const stage = stageRef.value.getNode()
            stage.container().style.cursor = 'grab'
        }
    }
    
    // Delete/Backspace 删除选中节点
    if ((e.code === 'Delete' || e.code === 'Backspace') && selectedNodeIds.value.size > 0) {
        e.preventDefault()
        const idsToDelete = Array.from(selectedNodeIds.value)
        
        // 清除选中状态
        clearSelection()
        
        // 发送删除事件
        emit('node-delete', idsToDelete)
        
        console.log('[CanvasStage] Delete nodes:', idsToDelete)
    }
    
    // Ctrl+Z 撤销
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault()
        emit('undo')
        console.log('[CanvasStage] Undo triggered')
    }
    
    // Ctrl+Shift+Z 或 Ctrl+Y 重做
    if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey))) {
        e.preventDefault()
        emit('redo')
        console.log('[CanvasStage] Redo triggered')
    }
}

function handleKeyUp(e) {
    if (e.code === 'Space') {
        e.preventDefault()
        isSpacePressed.value = false
        if (stageRef.value) {
            const stage = stageRef.value.getNode()
            e.spaceKey = false
            stage.container().style.cursor = getCursor()
        }
    }
}

// 生命周期
onMounted(() => {
    resizeStage()
    window.addEventListener('resize', resizeStage)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    // 初始化光标（等待下一帧确保 DOM 已挂载）
    nextTick(() => {
        if (stageRef.value && typeof stageRef.value.getNode === 'function') {
            const stage = stageRef.value.getNode()
            if (stage && stage.container) {
                stage.container().style.cursor = getCursor()
            }
        }
    })
    
    // 发送初始状态
    emitZoomChange()
    emitPositionChange()
    
    console.log('[CanvasStage] Mounted with', displayNodes.value.length, 'nodes')
})

onUnmounted(() => {
    window.removeEventListener('resize', resizeStage)
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
})
</script>

<style scoped>
.canvas-stage-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: v-bind(backgroundColor);
    position: relative;
}

/* Konva 容器样式 */
:deep(.konvajs-content) {
    width: 100% !important;
    height: 100% !important;
}

:deep(canvas) {
    display: block;
}
</style>
