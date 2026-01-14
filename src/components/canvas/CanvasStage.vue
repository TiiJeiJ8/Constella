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
                <!-- 连线 -->
                <EdgeRenderer
                    v-for="edge in displayEdges"
                    :key="edge.id"
                    :edge="edge"
                    :source-node="getNodeRect(edge.sourceId)"
                    :target-node="getNodeRect(edge.targetId)"
                    :is-selected="selectedEdgeIds.has(edge.id)"
                    @click="handleEdgeClick"
                    @dblclick="handleEdgeDblClick"
                />
                
                <!-- 正在创建的连线预览 -->
                <v-line
                    v-if="edgeCreation.active"
                    :config="{
                        points: [edgeCreation.startX, edgeCreation.startY, edgeCreation.currentX, edgeCreation.currentY],
                        stroke: '#667eea',
                        strokeWidth: 2,
                        dash: [8, 4],
                        opacity: 0.7
                    }"
                />
                
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
                    @dblclick="handleNodeDblClick(node, $event)"
                    @dbltap="handleNodeDblClick(node, $event)"
                    @dragstart="handleNodeDragStart(node)"
                    @dragmove="handleNodeDragMove(node, $event)"
                    @dragend="handleNodeDragEnd(node, $event)"
                    @transformend="handleNodeTransformEnd(node, $event)"
                >
                    <!-- 节点背景矩形 -->
                    <v-rect :config="node.rectConfig" />
                    <!-- 内容由 NodeContentOverlay 在 HTML 层渲染 -->
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
import EdgeRenderer from './EdgeRenderer.vue'
import { CursorInterpolationManager } from '@/utils/cursorInterpolation'

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
    // Yjs 连线数据
    yjsEdges: {
        type: Array,
        default: () => []
    },
    // 远程用户光标
    remoteCursors: {
        type: Array,
        default: () => []
    },
    // 编辑器是否打开（打开时禁用 Delete 快捷键）
    isEditorOpen: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['zoom-change', 'position-change', 'node-select', 'node-update', 'node-delete', 'node-create', 'node-dblclick', 'cursor-move', 'cursor-leave', 'undo', 'redo', 'stage-transform', 'edge-select', 'edge-create', 'edge-delete', 'edge-dblclick'])

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
const selectedEdgeIds = ref(new Set())
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

// 使用传入的 Yjs 节点数据，按 zIndex 排序（低的先渲染，在下面）
const displayNodes = computed(() => {
    const nodes = props.yjsNodes || []
    return [...nodes].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
})

// 连线数据（按 zIndex 排序）
const displayEdges = computed(() => {
    const edges = props.yjsEdges || []
    return [...edges].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
})

// 连线创建状态
const edgeCreation = ref({
    active: false,
    sourceNodeId: '',
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0
})

// 获取节点矩形信息（用于连线计算）
function getNodeRect(nodeId) {
    const node = props.yjsNodes?.find(n => n.id === nodeId)
    if (!node) return null
    return {
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height
    }
}

// 光标插帧管理器
const cursorManager = new CursorInterpolationManager()
const interpolatedCursors = ref(new Map())

// 更新插帧后的光标
cursorManager.onUpdate((positions) => {
    interpolatedCursors.value = positions
})

// 过滤有光标位置的远程用户，并应用插帧
const remoteCursorsInView = computed(() => {
    const cursors = (props.remoteCursors || []).filter(user => user.cursor)
    
    // 返回插帧后的光标位置
    return cursors.map(user => {
        const interpolated = interpolatedCursors.value.get(user.clientId)
        if (interpolated) {
            return {
                ...user,
                cursor: interpolated
            }
        }
        return user
    })
})

// 监听远程光标变化，更新插帧管理器
watch(() => props.remoteCursors, (newCursors) => {
    if (!newCursors) return
    
    const currentClientIds = new Set(newCursors.map(u => u.clientId))
    
    // 更新或添加光标
    newCursors.forEach(user => {
        if (user.cursor) {
            cursorManager.updateCursor(user.clientId, user.cursor)
        }
    })
    
    // 移除已离开的光标
    const existingIds = Array.from(interpolatedCursors.value.keys())
    existingIds.forEach(clientId => {
        if (!currentClientIds.has(clientId)) {
            cursorManager.removeCursor(clientId)
        }
    })
}, { deep: true })

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
    emitStageTransform()
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
        emitStageTransform()
        return
    }
    
    // 连线创建模式
    if (edgeCreation.value.active) {
        const pos = stage.getPointerPosition()
        const canvasPos = {
            x: (pos.x - stage.x()) / stage.scaleX(),
            y: (pos.y - stage.y()) / stage.scaleY()
        }
        updateEdgeCreationPreview(canvasPos.x, canvasPos.y)
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
    
    // 取消连线创建（点击空白处）
    if (edgeCreation.value.active) {
        // 如果是点击在空白处（没有点击到节点），取消连线
        const target = e.target
        if (target === stage || target.getParent() === stage) {
            cancelEdgeCreation()
        }
    }
    
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
    // 阻止事件冒泡（避免触发 stage 点击）
    e.cancelBubble = true
    
    // 连线工具模式
    if (props.activeTool === 'edge') {
        if (edgeCreation.value.active) {
            // 完成连线
            finishEdgeCreation(node.id)
        } else {
            // 开始创建连线
            startEdgeCreation(node.id)
        }
        return
    }
    
    if (props.activeTool !== 'select') return
    
    // 清除连线选中
    selectedEdgeIds.value.clear()
    
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

// 节点双击 - 进入编辑模式
function handleNodeDblClick(node, e) {
    e.cancelBubble = true
    emit('node-dblclick', node.id)
    console.log('[CanvasStage] Node double-clicked:', node.id)
}

// 连线点击
function handleEdgeClick(edgeId) {
    // 清除节点选中
    selectedNodeIds.value.clear()
    updateTransformer()
    
    // 选中连线
    selectedEdgeIds.value.clear()
    selectedEdgeIds.value.add(edgeId)
    
    emit('edge-select', [edgeId])
    console.log('[CanvasStage] Edge clicked:', edgeId)
}

// 连线双击 - 编辑标签
function handleEdgeDblClick(edgeId) {
    emit('edge-dblclick', edgeId)
    console.log('[CanvasStage] Edge double-clicked:', edgeId)
}

// 开始创建连线
function startEdgeCreation(nodeId) {
    const node = props.yjsNodes?.find(n => n.id === nodeId)
    if (!node) return
    
    const centerX = node.x + node.width / 2
    const centerY = node.y + node.height / 2
    
    edgeCreation.value = {
        active: true,
        sourceNodeId: nodeId,
        startX: centerX,
        startY: centerY,
        currentX: centerX,
        currentY: centerY
    }
    
    console.log('[CanvasStage] Edge creation started from:', nodeId)
}

// 更新连线预览位置
function updateEdgeCreationPreview(x, y) {
    if (!edgeCreation.value.active) return
    edgeCreation.value.currentX = x
    edgeCreation.value.currentY = y
}

// 完成连线创建
function finishEdgeCreation(targetNodeId) {
    if (!edgeCreation.value.active) return
    
    const sourceId = edgeCreation.value.sourceNodeId
    
    // 不能连接到自己
    if (sourceId === targetNodeId) {
        cancelEdgeCreation()
        return
    }
    
    emit('edge-create', {
        sourceId,
        targetId: targetNodeId,
        type: 'bezier',
        color: '#667eea',
        strokeWidth: 2,
        startArrow: 'none',
        endArrow: 'arrow'
    })
    
    console.log('[CanvasStage] Edge created:', sourceId, '->', targetNodeId)
    cancelEdgeCreation()
}

// 取消连线创建
function cancelEdgeCreation() {
    edgeCreation.value = {
        active: false,
        sourceNodeId: '',
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0
    }
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
    const rect = group.findOne('Rect')
    
    // 计算实际的新尺寸（原始尺寸 * 缩放比例）
    const newWidth = Math.max(50, rect.width() * group.scaleX())
    const newHeight = Math.max(50, rect.height() * group.scaleY())
    
    // 重置缩放比例（因为我们已经将缩放转换为实际尺寸）
    group.scaleX(1)
    group.scaleY(1)
    
    // 更新矩形尺寸
    rect.width(newWidth)
    rect.height(newHeight)
    
    // 发送节点更新事件（包含实际尺寸）
    emit('node-update', {
        id: node.id,
        x: group.x(),
        y: group.y(),
        width: newWidth,
        height: newHeight,
        rotation: group.rotation()
    })
    
    console.log('[CanvasStage] Node transformed:', node.id, {
        x: group.x(),
        y: group.y(),
        width: newWidth,
        height: newHeight,
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

// 发送 stage 变换事件（用于内容叠加层同步）
function emitStageTransform() {
    emit('stage-transform', {
        scale: stageConfig.value.scaleX,
        x: stageConfig.value.x,
        y: stageConfig.value.y
    })
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
    // 如果编辑器打开或焦点在输入框/文本区域中，跳过所有快捷键
    const activeEl = document.activeElement
    const isInEditor = activeEl?.tagName === 'TEXTAREA' || 
                       activeEl?.tagName === 'INPUT' || 
                       activeEl?.isContentEditable ||
                       props.isEditorOpen
    
    if (isInEditor) {
        return  // 不处理任何快捷键
    }
    
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
    emitStageTransform()
    
    console.log('[CanvasStage] Mounted with', displayNodes.value.length, 'nodes')
})

onUnmounted(() => {
    window.removeEventListener('resize', resizeStage)
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
    
    // 销毁光标插帧管理器
    cursorManager.destroy()
})

// 提供给外部调用的方法
function selectNode(nodeId) {
    selectedNodeIds.value.clear()
    selectedNodeIds.value.add(nodeId)
    emit('node-select', [nodeId])
    updateTransformer()
}

// 获取 Konva Stage 实例
function getStage() {
    return stageRef.value?.getNode() || null
}

// 暴露方法给父组件
defineExpose({
    selectNode,
    getStage
})
</script>

<style scoped>
.canvas-stage-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: v-bind(backgroundColor);
    position: relative;
    z-index: 0;  /* 确保画布在最底层 */
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
