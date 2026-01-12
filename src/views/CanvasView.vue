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
            @tool-change="handleToolChange"
            style="user-select: none;"
        />

        <!-- 中央画布区 - 占位符 -->
        <div class="canvas-area">
            <div class="canvas-placeholder"  style="user-select: none;">
                <div class="placeholder-icon">🎨</div>
                <div class="placeholder-text">{{ t('canvas.loading') }}</div>
                <div class="placeholder-hint">{{ roomName }}</div>
            </div>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import WindowControls from '@/components/base/WindowControls.vue'
import CanvasTopBar from '@/components/canvas/CanvasTopBar.vue'
import Toolbox from '@/components/canvas/Toolbox.vue'
import RightPanel from '@/components/canvas/RightPanel.vue'
import StatusBar from '@/components/canvas/StatusBar.vue'

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

/* ==================== 占位符样式 ==================== */
.canvas-placeholder {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    opacity: 0.6;
}

.placeholder-icon {
    font-size: 64px;
    margin-bottom: 16px;
    animation: pulse 2s ease-in-out infinite;
}

.placeholder-text {
    font-size: 18px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 8px;
}

.placeholder-hint {
    font-size: 14px;
    color: var(--text-secondary);
}

@keyframes pulse {
    0%, 100% {
        opacity: 0.6;
        transform: scale(1);
    }
    50% {
        opacity: 1;
        transform: scale(1.05);
    }
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 768px) {
    .placeholder-icon {
        font-size: 48px;
    }

    .placeholder-text {
        font-size: 16px;
    }
}
</style>
