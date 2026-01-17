<template>
    <div class="canvas-view" :data-room-id="roomId">
        <!-- 窗口控制按钮 -->
        <WindowControls />
        
        <!-- 顶部栏 -->
        <CanvasTopBar
            :room-id="roomId"
            :room-name="roomName"
            :is-syncing="isSyncing"
            :online-count="currentUsers.length"
            @exit="handleExit"
            @export="handleExport"
            @import="handleImport"
            @create-snapshot="handleTopBarSnapshot"
            @members-click="isMembersPanelOpen = true"
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
                ref="canvasStageRef"
                :active-tool="activeTool"
                :grid-size="20"
                :grid-color="isDark ? '#333333' : '#e0e0e0'"
                :background-color="isDark ? '#1a1a1a' : '#ffffff'"
                :yjs-nodes="canvasNodes"
                :yjs-edges="canvasEdges"
                :remote-cursors="remoteCursors"
                :is-editor-open="!!editingNode"
                @zoom-change="handleZoomChange"
                @position-change="handlePositionChange"
                @node-select="handleNodeSelect"
                @node-update="handleNodeUpdate"
                @node-delete="handleNodeDelete"
                @node-create="handleNodeCreate"
                @node-dblclick="handleNodeDblClick"
                @edge-select="handleEdgeSelect"
                @edge-create="handleEdgeCreate"
                @edge-delete="handleEdgeDelete"
                @edge-dblclick="handleEdgeDblClick"
                @cursor-move="handleCursorMove"
                @cursor-leave="handleCursorLeave"
                @undo="handleUndo"
                @redo="handleRedo"
                @stage-transform="handleStageTransform"
            />
            
            <!-- 节点内容叠加层 -->
            <NodeContentOverlay
                v-for="node in canvasNodes"
                :key="`content-${node.id}`"
                :node-id="node.id"
                :content="node.content"
                :x="node.x"
                :y="node.y"
                :width="node.width"
                :height="node.height"
                :z-index="node.zIndex || 0"
                :stage-scale="stageScale"
                :stage-position="stagePosition"
            />
        </div>

        <!-- 编辑器弹窗 -->
        <NodeEditorModal
            v-if="editingNode"
            :node-id="editingNode.id"
            :content="editingNode.content"
            @update="handleContentUpdate"
            @close="handleCloseEditor"
        />

        <!-- 成员面板 -->
        <MembersPanel
            v-model="isMembersPanelOpen"
            :room-id="roomId"
            :current-users="currentUsers"
        />

        <!-- 边标签编辑对话框 -->
        <InputDialog
            v-model="isEdgeLabelDialogOpen"
            :title="t('canvas.edge.labelTitle')"
            :placeholder="t('canvas.edge.labelPlaceholder')"
            :default-value="editingEdgeLabel"
            @confirm="handleEdgeLabelConfirm"
        />

        <!-- 右侧面板 -->
        <RightPanel
            :active-panel="activePanel"
            :is-collapsed="isPanelCollapsed"
            :room-id="roomId"
            :selected-nodes="selectedNodes"
            :selected-edges="selectedEdges"
            :all-nodes="canvasNodes"
            :all-edges="canvasEdges"
            :assets="roomAssets"
            :snapshots="roomSnapshots"
            @panel-change="handlePanelChange"
            @toggle-collapse="togglePanel"
            @node-kind-change="handleNodeKindChange"
            @node-property-change="handleNodePropertyChange"
            @node-display-mode-change="handleNodeDisplayModeChange"
            @node-select="handleNodeSelectFromPanel"
            @node-zindex-change="handleNodeZIndexChange"
            @edge-property-change="handleEdgePropertyChange"
            @edge-select="handleEdgeSelectFromPanel"
            @edge-delete="handleEdgeDelete"
            @asset-upload="handleAssetUpload"
            @asset-delete="handleAssetDelete"
            @asset-insert="handleAssetInsert"
            @snapshot-create="handleSnapshotCreate"
            @snapshot-restore="handleSnapshotRestore"
            @snapshot-delete="handleSnapshotDelete"
        />

        <!-- 底部状态栏 -->
        <StatusBar
            :zoom="zoom"
            :position="position"
            :selected-count="selectedCount"
            :is-syncing="isSyncing"
            :is-offline="isOffline"
            :unread-count="unreadCount"
            @toggle-chat="isChatPanelOpen = !isChatPanelOpen"
            @send-message="handleSendMessage"
        />

        <!-- 聊天面板 -->
        <ChatPanel
            v-model="isChatPanelOpen"
            :messages="chatMessages"
            @send="handleSendMessage"
        />

        <!-- 聊天气泡容器 -->
        <ChatBubbleContainer ref="bubbleContainerRef" />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, provide } from 'vue'
import { useI18n } from 'vue-i18n'
import * as Y from 'yjs'
import { useYjs } from '@/composables/useYjs'
import { useYjsNodes } from '@/composables/useYjsNodes'
import { useYjsEdges } from '@/composables/useYjsEdges'
import { useYjsChat } from '@/composables/useYjsChat'
import { useAwareness } from '@/composables/useAwareness'
import { registerPlugins } from '@/plugins/register'
import { pluginRegistry } from '@/plugins'
import { exportCanvas } from '@/utils/canvasExport'
import { useToast } from '@/utils/useToast'
import { apiService } from '@/services/api'
import WindowControls from '@/components/base/WindowControls.vue'
import CanvasTopBar from '@/components/canvas/CanvasTopBar.vue'
import Toolbox from '@/components/canvas/Toolbox.vue'
import RightPanel from '@/components/canvas/RightPanel.vue'
import StatusBar from '@/components/canvas/StatusBar.vue'
import CanvasStage from '@/components/canvas/CanvasStage.vue'
import NodeContentOverlay from '@/components/canvas/NodeContentOverlay.vue'
import NodeEditorModal from '@/components/canvas/NodeEditorModal.vue'
import MembersPanel from '@/components/canvas/MembersPanel.vue'
import InputDialog from '@/components/base/InputDialog.vue'
import ChatPanel from '@/components/canvas/ChatPanel.vue'
import ChatBubbleContainer from '@/components/canvas/ChatBubbleContainer.vue'

// 注册插件
registerPlugins()

const { t } = useI18n()
const toast = useToast()

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
const canvasStageRef = ref(null)

// 成员面板
const isMembersPanelOpen = ref(false)
const currentUsers = computed(() => {
    // 从 awareness 获取当前用户列表
    const users = [
        { id: localStorage.getItem('user_id') || 'current', name: getUserName(), isMe: true }
    ]
    // 加上远程用户 - 使用正确的属性路径
    remoteCursors.value.forEach(cursor => {
        users.push({
            id: String(cursor.clientId),
            name: cursor.user?.name || t('common.anonymous'),
            isMe: false
        })
    })
    return users
})

// 聊天功能
const isChatPanelOpen = ref(false)
const bubbleContainerRef = ref(null)

// 边标签编辑对话框
const isEdgeLabelDialogOpen = ref(false)
const editingEdgeId = ref(null)
const editingEdgeLabel = ref('')

// Stage 变换状态（用于内容叠加层定位）
const stageScale = ref(1)
const stagePosition = ref({ x: 0, y: 0 })
const editingNodeId = ref(null)

// 房间资源（暂存本地，后续对接 API）
const roomAssets = ref([])

// 房间快照（暂存本地，后续对接 API）
const roomSnapshots = ref([])

// 获取存储的 token
const getStoredToken = () => {
    return localStorage.getItem('accessToken') || ''
}

// 获取用户姓名（从 settings 中读取）
const getUserName = () => {
    const settings = JSON.parse(localStorage.getItem('settings') || '{}')
    if (settings.lastName && settings.firstName) {
        // 根据当前语言决定姓名顺序
        const currentLocale = localStorage.getItem('locale') || 'zh-CN'
        return currentLocale === 'zh-CN'
            ? `${settings.lastName}${settings.firstName}`
            : `${settings.firstName} ${settings.lastName}`
    }
    // 降级使用 username 或 userId
    return localStorage.getItem('username') || settings.userId || localStorage.getItem('user_id') || t('common.anonymous')
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
        
        // 连接后立即初始化节点和边管理（确保首次进入时能创建示例节点）
        if (yjs.doc) {
            yjsNodes.initialize()
            yjsEdges.initialize()
            // 初始化聊天
            yjsChat.initialize()
        }
    },
    onDisconnect: () => {
        console.log('[Canvas] Yjs disconnected')
        isOffline.value = true
    },
    onSync: (synced) => {
        console.log('[Canvas] Yjs synced:', synced)
        isSyncing.value = !synced
        
        // 同步完成后确保初始化已完成（防止连接回调未触发的情况）
        if (synced && yjs.doc) {
            yjsNodes.initialize()
            yjsEdges.initialize()
            yjsChat.initialize()
        }
    },
    onError: (error) => {
        console.error('[Canvas] Yjs error:', error)
        isOffline.value = true
    }
})

// Awareness 用户感知
const awareness = useAwareness({
    provider: yjs.provider,
    userName: getUserName()
})

// 为子组件提供 Awareness（用于编辑器协作光标）
provide('awareness', {
    otherUsers: awareness.otherUsers,
    updateTextCursor: awareness.updateTextCursor
})

// 其他用户光标
const remoteCursors = computed(() => awareness.otherUsers.value)

// Yjs 边（连接线）数据管理（先初始化，以便 yjsNodes 的 UndoManager 能跟踪）
const yjsEdges = useYjsEdges({
    getDoc: () => yjs.doc
})

// Yjs 节点数据管理（UndoManager 同时跟踪节点和连线）
const yjsNodes = useYjsNodes({
    getDoc: () => yjs.doc,
    additionalTrackedMaps: () => {
        const edgesMap = yjsEdges.edgesMap()
        return edgesMap ? [edgesMap] : []
    }
})

// Yjs 聊天数据管理
const userId = localStorage.getItem('user_id') || 'current'
const yjsChat = useYjsChat({
    getDoc: () => yjs.doc,
    userId,
    userName: getUserName()
})

const chatMessages = computed(() => yjsChat.messages.value)
const unreadCount = computed(() => yjsChat.unreadCount.value)

// 渲染用的节点数据（从 Yjs 同步）
const canvasNodes = computed(() => yjsNodes.nodes.value)

// 渲染用的边数据（从 Yjs 同步）
const canvasEdges = computed(() => yjsEdges.edges.value)

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

// 聊天功能
function handleSendMessage(content) {
    if (content.trim()) {
        yjsChat.sendMessage(content)
    }
}

// 监听新消息，显示气泡提示
watch(() => yjsChat.messages.value.length, (newLength, oldLength) => {
    if (newLength > oldLength) {
        const latestMessage = yjsChat.messages.value[newLength - 1]
        if (bubbleContainerRef.value) {
            bubbleContainerRef.value.addBubble(latestMessage)
        }
    }
})

// 监听聊天面板打开，标记为已读
watch(isChatPanelOpen, (isOpen) => {
    if (isOpen) {
        yjsChat.markAsRead()
    }
})


// 缩放变化
function handleZoomChange(newZoom) {
    zoom.value = newZoom
}

// 位置变化
function handlePositionChange(newPosition) {
    position.value = newPosition
}

// 选中节点的 IDs
const selectedNodeIdList = ref([])

// 计算选中的节点详情
const selectedNodes = computed(() => {
    return selectedNodeIdList.value
        .map(id => canvasNodes.value.find(n => n.id === id))
        .filter(Boolean)
})

// 节点选择
function handleNodeSelect(selectedNodeIds) {
    selectedCount.value = selectedNodeIds.length
    selectedNodeIdList.value = selectedNodeIds
    console.log('[Canvas] Nodes selected:', selectedNodeIds)
    
    // 同步选中状态到 Awareness，让其他用户看到
    awareness.updateSelection(selectedNodeIds)
}

// 节点更新（同步到 Yjs）
function handleNodeUpdate(updateData) {
    console.log('[Canvas] Node update:', updateData)
    yjsNodes.updateNode(updateData.id, updateData)
}

// 节点删除（同步到 Yjs）
function handleNodeDelete(nodeIds) {
    console.log('[Canvas] Node delete:', nodeIds)
    // 删除与这些节点相关的边
    nodeIds.forEach(nodeId => {
        yjsEdges.deleteEdgesByNode(nodeId)
    })
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
        width: 180,
        height: 120,
        fill: color.fill,
        stroke: color.stroke,
        content: { kind: 'markdown', data: t('canvas.node.defaultContent') }
    })
    
    console.log('[Canvas] Node created:', nodeId, createData)
    
    // 创建后切换回选择工具
    activeTool.value = 'select'
}

// 边选择
const selectedEdgeIdList = ref([])

// 计算选中的边详情
const selectedEdges = computed(() => {
    return selectedEdgeIdList.value
        .map(id => canvasEdges.value.find(e => e.id === id))
        .filter(Boolean)
})

function handleEdgeSelect(selectedEdgeIds) {
    selectedEdgeIdList.value = selectedEdgeIds
    console.log('[Canvas] Edges selected:', selectedEdgeIds)
}

// 边属性变更（从属性面板）
function handleEdgePropertyChange(edgeId, property, value) {
    yjsEdges.updateEdge(edgeId, { [property]: value })
    console.log('[Canvas] Edge property changed:', edgeId, property, '->', value)
}

// 从面板选择边
function handleEdgeSelectFromPanel(edgeId) {
    selectedEdgeIdList.value = [edgeId]
    console.log('[Canvas] Edge selected from panel:', edgeId)
}

// 边创建（同步到 Yjs）
function handleEdgeCreate(edgeData) {
    const edgeId = `edge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    
    yjsEdges.createEdge({
        id: edgeId,
        sourceId: edgeData.sourceId,
        targetId: edgeData.targetId,
        type: 'bezier',
        color: '#666666',
        strokeWidth: 2,
        startArrow: 'none',
        endArrow: 'arrow'
    })
    
    console.log('[Canvas] Edge created:', edgeId, edgeData)
    
    // 创建后切换回选择工具
    activeTool.value = 'select'
}

// 边删除（同步到 Yjs）
function handleEdgeDelete(edgeIds) {
    console.log('[Canvas] Edge delete:', edgeIds)
    yjsEdges.deleteEdges(edgeIds)
}

// 边双击（编辑标签）
function handleEdgeDblClick(edgeId) {
    const edge = canvasEdges.value.find(e => e.id === edgeId)
    if (!edge) return
    
    // 打开边标签编辑对话框
    editingEdgeId.value = edgeId
    editingEdgeLabel.value = edge.label || ''
    isEdgeLabelDialogOpen.value = true
    
    console.log('[Canvas] Edge dblclick:', edgeId)
}

// 边标签确认
function handleEdgeLabelConfirm(newLabel) {
    if (editingEdgeId.value) {
        yjsEdges.updateEdge(editingEdgeId.value, { label: newLabel })
        toast.success(t('canvas.toast.edgeLabelUpdated'))
    }
    editingEdgeId.value = null
    editingEdgeLabel.value = ''
}

// 资源上传
async function handleAssetUpload(uploadData) {
    console.log('[Canvas] Asset upload:', uploadData)
    // 如果上传组件已完成上传并返回结果，直接使用它
    if (uploadData && uploadData.success === true && uploadData.asset) {
        const serverAsset = uploadData.asset

        const baseUrl = apiService.getBaseUrl()
        const fullUrl = serverAsset.url && serverAsset.url.startsWith('http')
            ? serverAsset.url
            : `${baseUrl}${serverAsset.url.replace(/^constella:\/\//, '/')}`

        const asset = {
            id: serverAsset.id,
            name: serverAsset.name,
            type: serverAsset.type,
            size: serverAsset.size,
            url: fullUrl,
            uploadedAt: serverAsset.uploadedAt
        }

        roomAssets.value.push(asset)
        console.log('[Canvas] Asset added:', asset.id)
        toast.success(t('canvas.toast.uploadSuccess'))
        return
    }

    const file = uploadData.file

    // 上传到服务器（回退逻辑）
    const response = await apiService.uploadAsset(props.roomId, file)

    if (!response.success) {
        console.error('[Canvas] Asset upload failed:', response.message)
        toast.error(t('canvas.toast.uploadFailed'))
        return
    }

    const serverAsset = response.data
    
    // 构建完整的资源 URL
    const baseUrl = apiService.getBaseUrl()
    const fullUrl = serverAsset.url.startsWith('http') 
        ? serverAsset.url 
        : `${baseUrl}${serverAsset.url}`
    
    const asset = {
        id: serverAsset.id,
        name: serverAsset.name,
        type: serverAsset.type,
        size: serverAsset.size,
        url: fullUrl,
        uploadedAt: serverAsset.uploadedAt
    }
    
    roomAssets.value.push(asset)
    console.log('[Canvas] Asset added:', asset.id)
    toast.success(t('canvas.toast.uploadSuccess'))
}

// 资源删除
async function handleAssetDelete(assetId) {
    const index = roomAssets.value.findIndex(a => a.id === assetId)
    if (index !== -1) {
        const asset = roomAssets.value[index]
        
        // 如果是服务器资源，调用 API 删除
        if (!asset.url.startsWith('blob:')) {
            const response = await apiService.deleteAsset(props.roomId, assetId)
            if (!response.success) {
                console.error('[Canvas] Asset delete failed:', response.message)
                toast.error(t('canvas.toast.deleteFailed'))
                return
            }
        } else {
            // 释放本地 URL
            URL.revokeObjectURL(asset.url)
        }
        
        roomAssets.value.splice(index, 1)
        console.log('[Canvas] Asset deleted:', assetId)
    }
}

// 资源插入到画布（创建图片节点）
function handleAssetInsert(asset) {
    console.log('[Canvas] Insert asset:', asset)
    
    // 创建图片节点
    const nodeId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    
    yjsNodes.createNode({
        id: nodeId,
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        width: 200,
        height: 150,
        fill: '#ffffff',
        stroke: '#e0e0e0',
        content: { 
            kind: 'image', 
            data: asset.url,
            metadata: {
                assetId: asset.id,
                name: asset.name,
                type: asset.type
            }
        }
    })
    
    console.log('[Canvas] Image node created:', nodeId)
}

// 创建快照
function handleSnapshotCreate(snapshotData) {
    console.log('[Canvas] Creating snapshot:', snapshotData)
    
    // 获取当前状态
    const currentNodes = JSON.parse(JSON.stringify(canvasNodes.value))
    const currentEdges = JSON.parse(JSON.stringify(canvasEdges.value))
    
    const snapshot = {
        ...snapshotData,
        state: {
            nodes: currentNodes,
            edges: currentEdges
        }
    }
    
    roomSnapshots.value.push(snapshot)
    
    // 限制快照数量（最多保存 50 个）
    if (roomSnapshots.value.length > 50) {
        // 删除最旧的自动快照
        const autoSnapshots = roomSnapshots.value.filter(s => s.auto)
        if (autoSnapshots.length > 0) {
            const oldestAuto = autoSnapshots[0]
            const index = roomSnapshots.value.findIndex(s => s.id === oldestAuto.id)
            if (index !== -1) {
                roomSnapshots.value.splice(index, 1)
            }
        }
    }
    
    // Toast 提示
    if (!snapshotData.auto) {
        toast.success(t('canvas.toast.snapshotCreated'))
    }
    
    console.log('[Canvas] Snapshot created:', snapshot.id, 'Total:', roomSnapshots.value.length)
}

// 恢复快照
function handleSnapshotRestore(snapshot) {
    console.log('[Canvas] Restoring snapshot:', snapshot.id)
    
    if (!snapshot.state) {
        console.warn('[Canvas] Snapshot has no state data')
        return
    }
    
    const { nodes, edges } = snapshot.state
    
    // 获取 doc
    const doc = yjs.doc
    if (!doc) {
        console.warn('[Canvas] Doc not available')
        return
    }
    
    // 使用事务批量更新
    doc.transact(() => {
        // 获取 Yjs Maps
        const nodesMap = doc.getMap('nodes')
        const edgesMap = doc.getMap('edges')
        
        // 清除现有节点
        nodesMap.forEach((_, id) => nodesMap.delete(id))
        
        // 清除现有连线
        edgesMap.forEach((_, id) => edgesMap.delete(id))
        
        // 恢复节点
        nodes.forEach(node => {
            const yNode = new Y.Map()
            yNode.set('x', node.x)
            yNode.set('y', node.y)
            yNode.set('width', node.width)
            yNode.set('height', node.height)
            yNode.set('fill', node.rectConfig?.fill || '#667eea')
            yNode.set('stroke', node.rectConfig?.stroke || '#5568d3')
            yNode.set('zIndex', node.zIndex ?? 0)
            
            // 恢复内容
            if (node.content) {
                const yContent = new Y.Map()
                yContent.set('kind', node.content.kind || 'blank')
                yContent.set('data', node.content.data || '')
                if (node.content.displayMode) {
                    yContent.set('displayMode', node.content.displayMode)
                }
                if (node.content.metadata) {
                    yContent.set('metadata', node.content.metadata)
                }
                yNode.set('content', yContent)
            }
            
            nodesMap.set(node.id, yNode)
        })
        
        // 恢复连线
        edges.forEach(edge => {
            const yEdge = new Y.Map()
            yEdge.set('sourceId', edge.sourceId)
            yEdge.set('targetId', edge.targetId)
            yEdge.set('sourceAnchor', edge.sourceAnchor || 'center')
            yEdge.set('targetAnchor', edge.targetAnchor || 'center')
            yEdge.set('type', edge.type || 'bezier')
            yEdge.set('color', edge.color || '#667eea')
            yEdge.set('strokeWidth', edge.strokeWidth || 2)
            if (edge.dashArray) yEdge.set('dashArray', edge.dashArray)
            yEdge.set('startArrow', edge.startArrow || 'none')
            yEdge.set('endArrow', edge.endArrow || 'arrow')
            if (edge.label) yEdge.set('label', edge.label)
            yEdge.set('labelPosition', edge.labelPosition ?? 0.5)
            yEdge.set('zIndex', edge.zIndex ?? 0)
            
            edgesMap.set(edge.id, yEdge)
        })
    })
    
    console.log('[Canvas] Restored', nodes.length, 'nodes and', edges.length, 'edges')
    toast.success(t('canvas.toast.snapshotRestored'))
}

// 删除快照
function handleSnapshotDelete(snapshotId) {
    const index = roomSnapshots.value.findIndex(s => s.id === snapshotId)
    if (index !== -1) {
        roomSnapshots.value.splice(index, 1)
        console.log('[Canvas] Snapshot deleted:', snapshotId)
    }
}

// 从顶部栏创建快照
function handleTopBarSnapshot() {
    handleSnapshotCreate({
        id: `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: `快照 ${new Date().toLocaleTimeString('zh-CN')}`,
        createdAt: new Date().toISOString(),
        auto: false
    })
}

// 导出画布
async function handleExport(options) {
    console.log('[Canvas] Exporting canvas:', options)
    
    try {
        // JSON 导出 - 导出画布数据
        if (options.format === 'json') {
            const exportData = {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                roomName: roomName.value,
                nodes: canvasNodes.value.map(node => ({
                    id: node.id,
                    x: node.x,
                    y: node.y,
                    width: node.width,
                    height: node.height,
                    content: node.content,
                    zIndex: node.zIndex || 0
                })),
                edges: canvasEdges.value.map(edge => ({
                    id: edge.id,
                    sourceId: edge.sourceId,
                    targetId: edge.targetId,
                    sourceAnchor: edge.sourceAnchor,
                    targetAnchor: edge.targetAnchor,
                    type: edge.type,
                    color: edge.color,
                    strokeWidth: edge.strokeWidth,
                    dashArray: edge.dashArray,
                    startArrow: edge.startArrow,
                    endArrow: edge.endArrow,
                    label: edge.label,
                    labelPosition: edge.labelPosition,
                    zIndex: edge.zIndex
                }))
            }
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${roomName.value}-${Date.now()}.constella.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            
            toast.success(t('canvas.toast.exportSuccess', { format: 'JSON' }))
            console.log('[Canvas] JSON export completed')
            return
        }
        
        // 图片导出 - PNG/SVG
        // 获取 Konva Stage
        const stage = canvasStageRef.value?.getStage?.()
        
        await exportCanvas(
            stage,
            canvasNodes.value,
            canvasEdges.value,
            {
                format: options.format,
                filename: `${roomName.value}-${Date.now()}`,
                scale: options.format === 'png' ? 2 : 1,
                backgroundColor: '#ffffff',
                padding: 40
            }
        )
        
        toast.success(t('canvas.toast.exportSuccess', { format: options.format.toUpperCase() }))
        console.log('[Canvas] Export completed')
    } catch (error) {
        console.error('[Canvas] Export failed:', error)
        toast.error(t('canvas.toast.exportFailed'))
    }
}

// 导入画布数据
function handleImport(data) {
    console.log('[Canvas] Importing canvas data:', data)
    
    try {
        // 验证数据格式 - 只检查基本结构，nodes 可以为空
        if (!data || typeof data !== 'object') {
            console.error('[Canvas] Import validation failed: data is not an object')
            toast.error(t('canvas.topBar.importError'))
            return
        }
        
        // 兼容不同版本的数据格式
        const nodes = data.nodes || []
        const edges = data.edges || []
        
        if (!Array.isArray(nodes)) {
            console.error('[Canvas] Import validation failed: nodes is not an array')
            toast.error(t('canvas.topBar.importError'))
            return
        }
        
        // 如果没有节点，直接返回成功
        if (nodes.length === 0) {
            toast.success(t('canvas.topBar.importSuccess'))
            return
        }
        
        // 生成新的 ID 映射，避免和现有节点冲突
        const idMap = new Map()
        
        // 计算偏移量，将导入的节点放在画布中心附近
        let minX = Infinity, minY = Infinity
        nodes.forEach(node => {
            minX = Math.min(minX, node.x)
            minY = Math.min(minY, node.y)
        })
        
        // 获取当前视口中心
        const viewportCenter = {
            x: (window.innerWidth / 2 - stagePosition.value.x) / stageScale.value,
            y: (window.innerHeight / 2 - stagePosition.value.y) / stageScale.value
        }
        
        // 计算偏移
        const offsetX = viewportCenter.x - minX
        const offsetY = viewportCenter.y - minY
        
        // 导入节点
        nodes.forEach(node => {
            const newId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            idMap.set(node.id, newId)
            
            yjsNodes.createNode({
                id: newId,
                x: node.x + offsetX,
                y: node.y + offsetY,
                width: node.width || 200,
                height: node.height || 120,
                content: node.content || { kind: 'blank' },
                zIndex: node.zIndex || 0
            })
        })
        
        // 导入连线（更新节点 ID 引用）
        edges.forEach(edge => {
            const newSourceId = idMap.get(edge.sourceId)
            const newTargetId = idMap.get(edge.targetId)
            
            // 只有当源节点和目标节点都存在时才创建连线
            if (newSourceId && newTargetId) {
                yjsEdges.createEdge({
                    sourceId: newSourceId,
                    targetId: newTargetId,
                    sourceAnchor: edge.sourceAnchor,
                    targetAnchor: edge.targetAnchor,
                    type: edge.type || 'bezier',
                    color: edge.color || '#667eea',
                    strokeWidth: edge.strokeWidth || 2,
                    dashArray: edge.dashArray,
                    startArrow: edge.startArrow || 'none',
                    endArrow: edge.endArrow || 'arrow',
                    label: edge.label,
                    labelPosition: edge.labelPosition,
                    zIndex: edge.zIndex
                })
            }
        })
        
        toast.success(t('canvas.topBar.importSuccess'))
        console.log('[Canvas] Import completed, nodes:', nodes.length, 'edges:', edges.length)
    } catch (error) {
        console.error('[Canvas] Import failed:', error)
        toast.error(t('canvas.topBar.importError'))
    }
}

// 光标移动（同步到 Awareness）
function handleCursorMove(cursorData) {
    awareness.updateCursor(cursorData.x, cursorData.y)
}

// 光标离开画布
function handleCursorLeave() {
    awareness.clearCursor()
}

// Stage 变换（缩放/平移）
function handleStageTransform(transform) {
    stageScale.value = transform.scale
    stagePosition.value = { x: transform.x, y: transform.y }
}

// 节点内容更新
function handleContentUpdate(nodeId, data) {
    yjsNodes.updateNodeContent(nodeId, data)
}

// 计算当前正在编辑的节点
const editingNode = computed(() => {
    if (!editingNodeId.value) return null
    return canvasNodes.value.find(n => n.id === editingNodeId.value)
})

// 节点双击 - 打开编辑器弹窗
function handleNodeDblClick(nodeId) {
    const node = canvasNodes.value.find(n => n.id === nodeId)
    if (!node) return

    const kind = node.content?.kind || 'blank'
    
    // blank 类型不支持双击编辑
    if (kind === 'blank') {
        console.log('[Canvas] Blank node, select type in properties panel first')
        return
    }
    
    // 检查插件是否支持编辑
    const meta = pluginRegistry.getMeta(kind)
    if (meta?.editable) {
        editingNodeId.value = nodeId
        console.log('[Canvas] Opened editor for:', nodeId)
    }
}

// 关闭编辑器
function handleCloseEditor() {
    editingNodeId.value = null
}

// 节点类型变更（从属性面板）
function handleNodeKindChange(nodeId, kind) {
    yjsNodes.updateNodeKind(nodeId, kind)
    console.log('[Canvas] Node kind changed:', nodeId, '->', kind)
}

// 节点属性变更（从属性面板）
function handleNodePropertyChange(nodeId, property, value) {
    yjsNodes.updateNode(nodeId, { [property]: value })
    console.log('[Canvas] Node property changed:', nodeId, property, '->', value)
}

// 节点显示模式变更
function handleNodeDisplayModeChange(nodeId, displayMode) {
    yjsNodes.updateNodeDisplayMode(nodeId, displayMode)
    console.log('[Canvas] Node display mode changed:', nodeId, '->', displayMode)
}

// 从图层面板选择节点
function handleNodeSelectFromPanel(nodeId) {
    selectedNodeIds.value = [nodeId]
    // 通知 CanvasStage 选中该节点
    if (canvasStageRef.value) {
        canvasStageRef.value.selectNode(nodeId)
    }
    console.log('[Canvas] Node selected from panel:', nodeId)
}

// 节点图层（zIndex）变更
function handleNodeZIndexChange(nodeId, action) {
    const allZIndexes = canvasNodes.value.map(n => n.zIndex || 0)
    const currentNode = canvasNodes.value.find(n => n.id === nodeId)
    if (!currentNode) return
    
    const currentZ = currentNode.zIndex || 0
    let newZ = currentZ
    
    switch (action) {
        case 'top':
            // 置于顶层：找到最大 zIndex + 1
            newZ = Math.max(...allZIndexes) + 1
            break
        case 'bottom':
            // 置于底层：找到最小 zIndex - 1
            newZ = Math.min(...allZIndexes) - 1
            break
        case 'up':
            // 上移一层：找到比当前大的最小值
            const higherZs = allZIndexes.filter(z => z > currentZ)
            if (higherZs.length > 0) {
                const nextHigher = Math.min(...higherZs)
                newZ = nextHigher + 1
            } else {
                newZ = currentZ + 1
            }
            break
        case 'down':
            // 下移一层：找到比当前小的最大值
            const lowerZs = allZIndexes.filter(z => z < currentZ)
            if (lowerZs.length > 0) {
                const nextLower = Math.max(...lowerZs)
                newZ = nextLower - 1
            } else {
                newZ = currentZ - 1
            }
            break
    }
    
    yjsNodes.updateNode(nodeId, { zIndex: newZ })
    console.log('[Canvas] Node zIndex changed:', nodeId, action, '->', newZ)
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

function getMimeTypeFromUrl(url) {
    const extension = url.split('.').pop().toLowerCase()
    switch (extension) {
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'bmp':
        case 'webp':
            return 'image'
        case 'mp4':
        case 'webm':
        case 'ogg':
            return 'video'
        case 'mp3':
        case 'wav':
        case 'ogg':
            return 'audio'
        case 'pdf':
            return 'pdf'
        default:
            return 'file'
    }
}

// 加载房间资源列表
async function loadRoomAssets() {
    try {
        console.log('[Canvas] Loading assets for room:', props.roomId)
        const response = await apiService.getAssets(props.roomId)
        
        if (response.success && response.data) {
            const baseUrl = apiService.getBaseUrl()
            roomAssets.value = response.data.map(asset => ({
                ...asset,
                url: asset.url.startsWith('http') ? asset.url : `${baseUrl}${asset.url}`,
                type: asset.type || getMimeTypeFromUrl(asset.url)
            }))
            console.log('[Canvas] Loaded', roomAssets.value.length, 'assets')
        }
    } catch (error) {
        console.error('[Canvas] Failed to load assets:', error)
    }
}

// 组件挂载
onMounted(() => {
    updateTheme()
    loadRoomData()
    loadRoomAssets()
    
    // 记录访问历史
    recordVisit(props.roomId)
    
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

// 记录房间访问历史
function recordVisit(roomId) {
    try {
        const visits = localStorage.getItem('recentVisits')
        let visitList = visits ? JSON.parse(visits) : []
        
        // 移除旧的相同房间记录
        visitList = visitList.filter(v => v.roomId !== roomId)
        
        // 添加新记录到开头
        visitList.unshift({
            roomId,
            lastVisit: Date.now()
        })
        
        // 最多保留 50 条记录
        visitList = visitList.slice(0, 50)
        
        localStorage.setItem('recentVisits', JSON.stringify(visitList))
    } catch (e) {
        console.error('Failed to record visit:', e)
    }
}

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
    /* 创建层叠上下文，确保子元素的 z-index 正确工作 */
    isolation: isolate;
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 768px) {
    /* 移动端适配 */
}
</style>
