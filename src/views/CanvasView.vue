<template>
    <div class="canvas-view" :data-room-id="roomId">
        <!-- 窗口控制按钮 -->
        <WindowControls />
        
        <!-- 顶部栏 -->
        <CanvasTopBar
            :room-id="roomId"
            :room-name="roomName"
            :is-syncing="isSyncing"
            @exit="handleExit"
            style="margin-top: 10px"
        />

        <!-- 左侧工具栏 -->
        <Toolbox
            :active-tool="activeTool"
            :can-undo="canUndo"
            :can-redo="canRedo"
            @tool-change="handleToolChange"
            @undo="handleUndo"
            @redo="handleRedo"
            style="user-select: none;"
        />

        <!-- 中央画布区 -->
        <div class="canvas-area">
            <CanvasStage
                :active-tool="activeTool"
                :grid-size="20"
                :grid-color="isDark ? '#333333' : '#e0e0e0'"
                :background-color="isDark ? '#1a1a1a' : '#ffffff'"
                :yjs-nodes="canvasNodes"
                :remote-cursors="remoteCursors"
                @zoom-change="handleZoomChange"
                @position-change="handlePositionChange"
                @node-select="handleNodeSelect"
                @node-update="handleNodeUpdate"
                @node-delete="handleNodeDelete"
                @node-create="handleNodeCreate"
                @cursor-move="handleCursorMove"
                @cursor-leave="handleCursorLeave"
                @undo="handleUndo"
                @redo="handleRedo"
            />
        </div>

        <!-- 右侧面板 -->
        <RightPanel
            :active-panel="activePanel"
            :is-collapsed="isPanelCollapsed"
            @panel-change="handlePanelChange"
            @toggle-collapse="togglePanel"
        />

        <!-- 底部状态栏 -->
        <StatusBar
            :zoom="zoom"
            :position="position"
            :selected-count="selectedCount"
            :is-syncing="isSyncing"
            :is-offline="isOffline"
        />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useYjs } from '@/composables/useYjs'
import { useYjsNodes } from '@/composables/useYjsNodes'
import { useAwareness } from '@/composables/useAwareness'
import WindowControls from '@/components/base/WindowControls.vue'
import CanvasTopBar from '@/components/canvas/CanvasTopBar.vue'
import Toolbox from '@/components/canvas/Toolbox.vue'
import RightPanel from '@/components/canvas/RightPanel.vue'
import StatusBar from '@/components/canvas/StatusBar.vue'
import CanvasStage from '@/components/canvas/CanvasStage.vue'

const { t } = useI18n()

const props = defineProps({
    roomId: {
        type: String,
        required: true
    }
})

const emit = defineEmits(['navigate'])

// 状态管理
const roomName = ref('Loading Room...')
const activeTool = ref('select')
const activePanel = ref('properties')
const zoom = ref(100)
const position = ref({ x: 0, y: 0 })
const selectedCount = ref(0)
const isSyncing = ref(false)
const isOffline = ref(false)
const isDark = ref(false)
const isPanelCollapsed = ref(false)

// 获取存储的 token
const getStoredToken = () => {
    return localStorage.getItem('accessToken') || ''
}

// Yjs 实时协作
const yjs = useYjs({
    roomId: props.roomId,
    token: getStoredToken(),
    onConnect: () => {
        console.log('[Canvas] Yjs connected')
        isSyncing.value = false
        isOffline.value = false
        
        // 初始化 Awareness
        awareness.initialize()
    },
    onDisconnect: () => {
        console.log('[Canvas] Yjs disconnected')
        isOffline.value = true
    },
    onSync: (synced) => {
        console.log('[Canvas] Yjs synced:', synced)
        isSyncing.value = !synced
        
        // 同步完成后初始化节点管理
        if (synced && yjs.doc) {
            yjsNodes.initialize()
        }
    },
    onError: (error) => {
        console.error('[Canvas] Yjs error:', error)
        isOffline.value = true
    }
})

// Awareness 用户感知
const awareness = useAwareness({
    provider: yjs.provider
})

// 其他用户光标
const remoteCursors = computed(() => awareness.otherUsers.value)

// Yjs 节点数据管理
const yjsNodes = useYjsNodes({
    getDoc: () => yjs.doc
})

// 渲染用的节点数据（从 Yjs 同步）
const canvasNodes = computed(() => yjsNodes.nodes.value)

// Undo/Redo 状态
const canUndo = computed(() => yjsNodes.canUndo.value)
const canRedo = computed(() => yjsNodes.canRedo.value)

// 主题监听
function updateTheme() {
    isDark.value = document.documentElement.getAttribute('data-theme') === 'dark'
}

// 工具切换
function handleToolChange(tool) {
    activeTool.value = tool
    console.log('[Canvas] Tool changed:', tool)
}

// 面板切换
function handlePanelChange(panel) {
    activePanel.value = panel
    console.log('[Canvas] Panel changed:', panel)
}

// 退出房间
function handleExit() {
    console.log('[Canvas] Exiting room:', props.roomId)
    emit('navigate', 'rooms')
}


// 缩放变化
function handleZoomChange(newZoom) {
    zoom.value = newZoom
}

// 位置变化
function handlePositionChange(newPosition) {
    position.value = newPosition
}

// 节点选择
function handleNodeSelect(selectedNodeIds) {
    selectedCount.value = selectedNodeIds.length
    console.log('[Canvas] Nodes selected:', selectedNodeIds)
}

// 节点更新（同步到 Yjs）
function handleNodeUpdate(updateData) {
    console.log('[Canvas] Node update:', updateData)
    yjsNodes.updateNode(updateData.id, updateData)
}

// 节点删除（同步到 Yjs）
function handleNodeDelete(nodeIds) {
    console.log('[Canvas] Node delete:', nodeIds)
    yjsNodes.deleteNodes(nodeIds)
}

// 节点创建（同步到 Yjs）
function handleNodeCreate(createData) {
    // 生成唯一 ID
    const nodeId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    
    // 预设颜色列表
    const colors = [
        { fill: '#667eea', stroke: '#5568d3' },
        { fill: '#48bb78', stroke: '#38a169' },
        { fill: '#f56565', stroke: '#e53e3e' },
        { fill: '#ed8936', stroke: '#dd6b20' },
        { fill: '#9f7aea', stroke: '#805ad5' },
        { fill: '#38b2ac', stroke: '#319795' }
    ]
    const color = colors[Math.floor(Math.random() * colors.length)]
    
    // 创建节点
    yjsNodes.createNode({
        id: nodeId,
        x: createData.x - 75,  // 居中节点（宽度150的一半）
        y: createData.y - 50,  // 居中节点（高度100的一半）
        width: 150,
        height: 100,
        fill: color.fill,
        stroke: color.stroke,
        text: '新节点'
    })
    
    console.log('[Canvas] Node created:', nodeId, createData)
    
    // 创建后切换回选择工具
    activeTool.value = 'select'
}

// 光标移动（同步到 Awareness）
function handleCursorMove(cursorData) {
    awareness.updateCursor(cursorData.x, cursorData.y)
}

// 光标离开画布
function handleCursorLeave() {
    awareness.clearCursor()
}

// 撤销
function handleUndo() {
    yjsNodes.undo()
}

// 重做
function handleRedo() {
    yjsNodes.redo()
}

// 切换面板折叠
function togglePanel() {
    isPanelCollapsed.value = !isPanelCollapsed.value
}

// 加载房间数据
async function loadRoomData() {
    try {
        console.log('[Canvas] Loading room data for:', props.roomId)
        // TODO: 从 API 加载房间数据
        // const roomData = await apiService.getRoomById(props.roomId)
        // roomName.value = roomData.name
        
        // 临时模拟数据
        roomName.value = `Room ${props.roomId.slice(0, 8)}`
    } catch (error) {
        console.error('[Canvas] Failed to load room:', error)
        roomName.value = t('canvas.loadError')
    }
}

// 组件挂载
onMounted(() => {
    updateTheme()
    loadRoomData()
    
    // 连接 Yjs
    console.log('[Canvas] Connecting to Yjs room:', props.roomId)
    yjs.connect()
    
    // 监听主题变化
    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    })
    
    console.log('[Canvas] CanvasView mounted, roomId:', props.roomId)
})

// 组件卸载
onUnmounted(() => {
    console.log('[Canvas] CanvasView unmounted')
})
</script>

<style scoped>
.canvas-view {
    width: 100vw;
    height: 100vh;
    background: var(--canvas-bg);
    position: relative;
    overflow: hidden;
    transition: background-color 0.3s ease;
}

/* ==================== 画布区域 ==================== */
.canvas-area {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
    background: var(--canvas-bg);
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 768px) {
    /* 移动端适配 */
}
</style>
