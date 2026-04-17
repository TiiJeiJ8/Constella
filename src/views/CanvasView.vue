<template>
    <div class="canvas-view" :data-room-id="roomId">
        <WindowControls />

        <div v-if="isRoomLoading" class="canvas-state">
            <div class="canvas-state-card">
                <div class="canvas-state-title">{{ t('canvas.loading') }}</div>
            </div>
        </div>

        <div v-else-if="roomLoadError" class="canvas-state">
            <div class="canvas-state-card">
                <div class="canvas-state-title">{{ roomLoadError }}</div>
                <div class="canvas-state-actions">
                    <button class="canvas-state-btn secondary" @click="handleExit">
                        {{ t('common.close') }}
                    </button>
                    <button class="canvas-state-btn" @click="retryRoomLoad">
                        {{ t('common.retry') }}
                    </button>
                </div>
            </div>
        </div>

        <CanvasTopBar
            v-if="isRoomReady"
            :room-id="roomId"
            :room-name="roomName"
            :room-role="roomRole"
            :is-syncing="isSyncing"
            :online-count="currentUsers.length"
            :can-edit-canvas="canEditCanvas"
            :can-manage-snapshots="canManageSnapshots"
            :can-manage-room="roomCapabilities.can_manage_room"
            @exit="handleExit"
            @export="handleExport"
            @import="handleImport"
            @create-snapshot="handleTopBarSnapshot"
            @members-click="isMembersPanelOpen = true"
            @room-settings-click="isRoomSettingsPanelOpen = true"
            style="margin-top: 10px"
        />

        <Toolbox
            v-if="isRoomReady"
            :active-tool="activeTool"
            :can-edit="canEditCanvas"
            :can-undo="canEditCanvas && canUndo"
            :can-redo="canEditCanvas && canRedo"
            :shortcuts="userShortcuts"
            @tool-change="handleToolChange"
            @undo="handleUndo"
            @redo="handleRedo"
            style="user-select: none;"
        />

        <div
            v-if="isRoomReady"
            class="canvas-area"
            ref="canvasAreaRef"
            @dragover.prevent="handleCanvasDragOver"
            @drop.prevent="handleCanvasDrop"
        >
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
                :is-read-only="!canEditCanvas"
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
                @render-stats="handleRenderStats"
            />

            <NodeContentOverlay
                v-for="(node, overlayOrder) in visibleOverlayNodes"
                :key="`content-${node.id}`"
                :node-id="node.id"
                :content="node.content"
                :x="node.x"
                :y="node.y"
                :width="node.width"
                :height="node.height"
                :z-index="node.zIndex || 0"
                :rotation="node.rotation || 0"
                :render-order="overlayOrder"
                :fill="node.rectConfig.fill"
                :stroke="node.rectConfig.stroke"
                :corner-radius="node.rectConfig.cornerRadius"
                :stage-scale="stageScale"
                :stage-position="stagePosition"
                :markdown-lod-scale-threshold="markdownLodScaleThreshold"
            />

            <PerformancePanel
                v-if="isDevPerformancePanelVisible"
                :total-nodes="canvasNodes.length"
                :visible-nodes="visibleNodeCount"
                :visible-edges="visibleEdgeCount"
                :syncs-per-second="syncsPerSecond"
                :frame-cost-ms="frameCostMs"
                :fps="fps"
                :long-frame-count="longFrameCount"
                :long-frame-threshold-ms="longFrameThresholdMs"
            />
        </div>

        <NodeEditorModal
            v-if="isRoomReady && editingNode"
            :node-id="editingNode.id"
            :content="editingNode.content"
            :all-nodes="canvasNodes"
            :read-only="!canEditCanvas"
            @update="handleContentUpdate"
            @jump-to-node="handleJumpToNode"
            @close="handleCloseEditor"
        />

        <component
            v-if="isRoomReady && editingCustomNode && editingCustomPlugin?.editor"
            :is="editingCustomPlugin.editor"
            :node-id="editingCustomNode.id"
            :content="editingCustomNode.content"
            :read-only="!canEditCanvas"
            @update="handleCustomEditorUpdate"
            @close="editingCustomNodeId = null"
        />

        <MembersPanel
            v-if="isRoomReady"
            v-model="isMembersPanelOpen"
            :room-id="roomId"
            :current-users="currentUsers"
            :room-role="roomRole"
            :can-manage-members="roomCapabilities.can_manage_members"
            :can-edit-canvas="canEditCanvas"
            :can-manage-snapshots="canManageSnapshots"
        />

        <RoomSettingsPanel
            v-if="isRoomReady"
            v-model="isRoomSettingsPanelOpen"
            :room-id="roomId"
            :can-manage-room="roomCapabilities.can_manage_room"
            :can-manage-security="roomRole === 'owner'"
            @updated="handleRoomSettingsUpdated"
        />

        <InputDialog
            v-if="isRoomReady"
            v-model="isEdgeLabelDialogOpen"
            :title="t('canvas.edge.labelTitle')"
            :placeholder="t('canvas.edge.labelPlaceholder')"
            :default-value="editingEdgeLabel"
            @confirm="handleEdgeLabelConfirm"
        />

        <RightPanel
            v-if="isRoomReady"
            :active-panel="activePanel"
            :is-collapsed="isPanelCollapsed"
            :room-id="roomId"
            :can-edit-canvas="canEditCanvas"
            :can-upload-assets="canUploadAssets"
            :can-manage-snapshots="canManageSnapshots"
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
            @node-content-metadata-change="handleNodeContentMetadataChange"
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

        <StatusBar
            v-if="isRoomReady"
            :zoom="zoom"
            :position="position"
            :selected-count="selectedCount"
            :is-syncing="isSyncing"
            :is-offline="isOffline"
            :unread-count="unreadCount"
            @toggle-chat="isChatPanelOpen = !isChatPanelOpen"
            @send-message="handleSendMessage"
        />

        <ChatPanel
            v-if="isRoomReady"
            v-model="isChatPanelOpen"
            :messages="chatMessages"
            @send="handleSendMessage"
        />

        <ChatBubbleContainer v-if="isRoomReady" ref="bubbleContainerRef" />
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { pluginCatalogVersion, pluginRegistry } from '@/plugins'
import { useCanvasAssets } from '@/composables/useCanvasAssets'
import { useCanvasImportExport } from '@/composables/useCanvasImportExport'
import { useCanvasPerformance } from '@/composables/useCanvasPerformance'
import { useCanvasRoom } from '@/composables/useCanvasRoom'
import { useCanvasSelection } from '@/composables/useCanvasSelection'
import { useCanvasShortcuts } from '@/composables/useCanvasShortcuts'
import { useToast } from '@/utils/useToast'
import WindowControls from '@/components/base/WindowControls.vue'
import CanvasTopBar from '@/components/canvas/CanvasTopBar.vue'
import Toolbox from '@/components/canvas/Toolbox.vue'
import RightPanel from '@/components/canvas/RightPanel.vue'
import StatusBar from '@/components/canvas/StatusBar.vue'
import CanvasStage from '@/components/canvas/CanvasStage.vue'
import NodeContentOverlay from '@/components/canvas/NodeContentOverlay.vue'
import PerformancePanel from '@/components/canvas/PerformancePanel.vue'
import NodeEditorModal from '@/components/canvas/NodeEditorModal.vue'
import MembersPanel from '@/components/canvas/MembersPanel.vue'
import RoomSettingsPanel from '@/components/canvas/RoomSettingsPanel.vue'
import InputDialog from '@/components/base/InputDialog.vue'
import ChatPanel from '@/components/canvas/ChatPanel.vue'
import ChatBubbleContainer from '@/components/canvas/ChatBubbleContainer.vue'

const props = defineProps({
    roomId: {
        type: String,
        required: true
    }
})

const emit = defineEmits(['navigate'])
const { t } = useI18n()
const toast = useToast()

const activePanel = ref('properties')
const zoom = ref(100)
const position = ref({ x: 0, y: 0 })
const isDark = ref(false)
const isPanelCollapsed = ref(false)
const isEdgeLabelDialogOpen = ref(false)
const editingEdgeId = ref<string | null>(null)
const editingEdgeLabel = ref('')
const stageScale = ref(1)
const stagePosition = ref({ x: 0, y: 0 })
const canvasStageRef = ref<any>(null)
const canvasAreaRef = ref<HTMLElement | null>(null)
const canvasAreaSize = ref({ width: 0, height: 0 })
const bubbleContainerRef = ref<{ addBubble?: (message: unknown) => void } | null>(null)
const editingNodeId = ref<string | null>(null)
const editingCustomNodeId = ref<string | null>(null)
const isRoomSettingsPanelOpen = ref(false)

const {
    roomName,
    roomRole,
    roomCapabilities,
    roomLoadError,
    isRoomLoading,
    isRoomReady,
    isSyncing,
    isOffline,
    isMembersPanelOpen,
    isChatPanelOpen,
    currentUsers,
    remoteCursors,
    yjs,
    awareness,
    yjsNodes,
    yjsEdges,
    chatMessages,
    unreadCount,
    refreshRoomPermissions,
    handleExit,
    handleSendMessage,
    retryRoomLoad
} = useCanvasRoom({
    roomId: props.roomId,
    t,
    toast,
    bubbleContainerRef,
    emitNavigate: (view) => emit('navigate', view)
})

const canEditCanvas = computed(() => roomCapabilities.value.can_edit)
const canUploadAssets = computed(() => roomCapabilities.value.can_upload_assets)
const canManageSnapshots = computed(() => roomCapabilities.value.can_manage_snapshots)

const canvasNodes = computed(() => yjsNodes.nodes.value)
const canvasEdges = computed(() => yjsEdges.edges.value)
const canUndo = computed(() => yjsNodes.canUndo.value)
const canRedo = computed(() => yjsNodes.canRedo.value)

const editingCustomNode = computed(() => {
    if (!editingCustomNodeId.value) return null
    return canvasNodes.value.find(node => node.id === editingCustomNodeId.value) || null
})

const editingCustomPlugin = computed(() => {
    pluginCatalogVersion.value
    if (!editingCustomNode.value) return null
    return pluginRegistry.get(editingCustomNode.value.content?.kind)
})

const {
    markdownLodScaleThreshold,
    isDevPerformancePanelVisible,
    visibleNodeCount,
    visibleEdgeCount,
    syncsPerSecond,
    frameCostMs,
    fps,
    longFrameCount,
    longFrameThresholdMs,
    handleRenderStats: updatePerformanceRenderStats,
    applyPerformanceSettings
} = useCanvasPerformance({
    getVisibleNodeCount: () => visibleOverlayNodes.value.length,
    getCurrentSyncTick: () => (yjsNodes.syncTick?.value || 0) + (yjsEdges.syncTick?.value || 0)
})

const {
    activeTool,
    userShortcuts,
    handleToolChange
} = useCanvasShortcuts({
    editingNodeId,
    canEditCanvas,
    applyPerformanceSettings
})

const {
    roomAssets,
    handleAssetUpload,
    handleAssetDelete,
    handleAssetInsert,
    handleCanvasDragOver,
    handleCanvasDrop
} = useCanvasAssets({
    roomId: props.roomId,
    t,
    toast,
    canUploadAssets,
    canEditCanvas,
    yjsNodes,
    canvasAreaRef,
    stagePosition,
    stageScale
})

const {
    roomSnapshots,
    handleSnapshotCreate,
    handleSnapshotRestore,
    handleSnapshotDelete,
    handleTopBarSnapshot: handleTopBarSnapshotInternal,
    handleExport,
    handleImport
} = useCanvasImportExport({
    roomName,
    canvasNodes,
    canvasEdges,
    canvasStageRef,
    stagePosition,
    stageScale,
    yjs,
    yjsNodes,
    yjsEdges,
    canEditCanvas,
    canManageSnapshots,
    t,
    toast
})

function handleTopBarSnapshot() {
    const previousCount = roomSnapshots.value.length
    handleTopBarSnapshotInternal()
    if (roomSnapshots.value.length > previousCount) {
        toast.success(t('canvas.toast.snapshotCreated'))
    }
}

function handleRoomSettingsUpdated() {
    void refreshRoomPermissions()
}

const {
    selectedCount,
    selectedNodes,
    selectedEdges,
    handleNodeSelect,
    handleNodeSelectFromPanel,
    handleEdgeSelect,
    handleEdgeSelectFromPanel,
    handleEdgePropertyChange
} = useCanvasSelection({
    canvasNodes,
    canvasEdges,
    awareness,
    canvasStageRef,
    yjsEdges
})

const OVERLAY_VIEWPORT_BUFFER = 240

const overlayViewportRect = computed(() => {
    const width = canvasAreaSize.value.width
    const height = canvasAreaSize.value.height
    const scale = Math.max(0.01, stageScale.value || 1)
    const buffer = OVERLAY_VIEWPORT_BUFFER / scale

    return {
        left: -stagePosition.value.x / scale - buffer,
        top: -stagePosition.value.y / scale - buffer,
        right: (-stagePosition.value.x + width) / scale + buffer,
        bottom: (-stagePosition.value.y + height) / scale + buffer
    }
})

function isNodeInOverlayViewport(node: any, viewport: { left: number; top: number; right: number; bottom: number }) {
    const nodeRight = node.x + node.width
    const nodeBottom = node.y + node.height

    return (
        nodeRight >= viewport.left &&
        node.x <= viewport.right &&
        nodeBottom >= viewport.top &&
        node.y <= viewport.bottom
    )
}

const visibleOverlayNodes = computed(() => {
    const nodes = canvasNodes.value
    if (!canvasAreaSize.value.width || !canvasAreaSize.value.height) {
        return [...nodes].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
    }

    return nodes
        .filter(node => isNodeInOverlayViewport(node, overlayViewportRect.value))
        .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
})

const editingNode = computed(() => {
    if (!editingNodeId.value) return null
    return canvasNodes.value.find(node => node.id === editingNodeId.value) || null
})

function updateTheme() {
    isDark.value = document.documentElement.getAttribute('data-theme') === 'dark'
}

function handlePanelChange(panel: string) {
    activePanel.value = panel
}

function handleZoomChange(newZoom: number) {
    zoom.value = newZoom
}

function handlePositionChange(newPosition: { x: number; y: number }) {
    position.value = newPosition
}

function handleNodeUpdate(updateData: any) {
    if (!canEditCanvas.value) {
        return
    }
    if (!updateData?.id) return
    if (updateData._realtime) {
        yjsNodes.updateNodePosition(updateData.id, updateData.x, updateData.y)
        return
    }
    yjsNodes.updateNode(updateData.id, updateData)
}

function handleNodeDelete(nodeIds: string[]) {
    if (!canEditCanvas.value) {
        return
    }
    nodeIds.forEach(nodeId => {
        yjsEdges.deleteEdgesByNode(nodeId)
    })
    yjsNodes.deleteNodes(nodeIds)
}

function handleNodeCreate(createData: { x: number; y: number }) {
    if (!canEditCanvas.value) {
        return
    }
    const nodeId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const colors = isDark.value
        ? [
            { fill: '#47558f', stroke: '#6f82d6' },
            { fill: '#2f6a55', stroke: '#49a37f' },
            { fill: '#7a4b55', stroke: '#d97588' },
            { fill: '#7b5a33', stroke: '#d39a4a' },
            { fill: '#5d4e7f', stroke: '#a78bde' },
            { fill: '#2f6770', stroke: '#4fb5c3' }
        ]
        : [
            { fill: '#667eea', stroke: '#5568d3' },
            { fill: '#48bb78', stroke: '#38a169' },
            { fill: '#f56565', stroke: '#e53e3e' },
            { fill: '#ed8936', stroke: '#dd6b20' },
            { fill: '#9f7aea', stroke: '#805ad5' },
            { fill: '#38b2ac', stroke: '#319795' }
        ]
    const fallbackColor = isDark.value
        ? { fill: '#47558f', stroke: '#6f82d6' }
        : { fill: '#667eea', stroke: '#5568d3' }
    const color = colors[Math.floor(Math.random() * colors.length)] || fallbackColor

    yjsNodes.createNode({
        id: nodeId,
        x: createData.x - 75,
        y: createData.y - 50,
        width: 180,
        height: 120,
        fill: color.fill,
        stroke: color.stroke,
        content: { kind: 'markdown', data: t('canvas.node.defaultContent') }
    })
}

function handleEdgeCreate(edgeData: { sourceId: string; targetId: string }) {
    if (!canEditCanvas.value) {
        return
    }
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
}

function handleEdgeDelete(edgeIds: string[]) {
    if (!canEditCanvas.value) {
        return
    }
    yjsEdges.deleteEdges(edgeIds)
}

function handleEdgeDblClick(edgeId: string) {
    if (!canEditCanvas.value) {
        return
    }
    const edge = canvasEdges.value.find(item => item.id === edgeId)
    if (!edge) return
    editingEdgeId.value = edgeId
    editingEdgeLabel.value = edge.label || ''
    isEdgeLabelDialogOpen.value = true
}

function handleEdgeLabelConfirm(newLabel: string) {
    if (!canEditCanvas.value) {
        editingEdgeId.value = null
        editingEdgeLabel.value = ''
        return
    }
    if (editingEdgeId.value) {
        yjsEdges.updateEdge(editingEdgeId.value, { label: newLabel })
        toast.success(t('canvas.toast.edgeLabelUpdated'))
    }
    editingEdgeId.value = null
    editingEdgeLabel.value = ''
}

function handleCursorMove(cursorData: { x: number; y: number }) {
    awareness.updateCursor(cursorData.x, cursorData.y)
}

function handleCursorLeave() {
    awareness.clearCursor()
}

function handleStageTransform(transform: { scale: number; x: number; y: number }) {
    stageScale.value = transform.scale
    stagePosition.value = { x: transform.x, y: transform.y }
}

function handleRenderStats(stats: { visibleNodes?: number; visibleEdges?: number }) {
    updatePerformanceRenderStats(stats)
}

function handleContentUpdate(nodeId: string, data: string) {
    if (!canEditCanvas.value) {
        return
    }
    yjsNodes.updateNodeContent(nodeId, data)
}

function openNodeEditor(nodeId: string) {
    const node = canvasNodes.value.find(item => item.id === nodeId)
    if (!node) return false

    const kind = node.content?.kind || 'blank'
    if (kind === 'blank') return false

    const plugin = pluginRegistry.get(kind)
    if (!plugin?.meta?.editable) return false
    if (plugin.onDblClick?.(node.content)) return false

    editingNodeId.value = null
    editingCustomNodeId.value = null

    if (plugin.editor) {
        editingCustomNodeId.value = nodeId
    } else {
        editingNodeId.value = nodeId
    }

    return true
}

function handleNodeDblClick(nodeId: string) {
    openNodeEditor(nodeId)
}

function handleJumpToNode(nodeId: string) {
    const node = canvasNodes.value.find(item => item.id === nodeId)
    if (!node) return

    openNodeEditor(nodeId)
    nextTick(() => {
        canvasStageRef.value?.focusNode?.(nodeId)
    })
}

function handleCustomEditorUpdate(nodeId: string, contentPatch: Record<string, unknown>) {
    if (!canEditCanvas.value) {
        editingCustomNodeId.value = null
        return
    }
    yjsNodes.updateNode(nodeId, { content: contentPatch } as any)
    editingCustomNodeId.value = null
}

function handleCloseEditor() {
    editingNodeId.value = null
}

function handleNodeKindChange(nodeId: string, kind: string) {
    if (!canEditCanvas.value) {
        return
    }
    yjsNodes.updateNodeKind(nodeId, kind)
}

function handleNodePropertyChange(nodeId: string, property: string, value: unknown) {
    if (!canEditCanvas.value) {
        return
    }
    yjsNodes.updateNode(nodeId, { [property]: value } as any)
}

function handleNodeDisplayModeChange(nodeId: string, displayMode: string) {
    if (!canEditCanvas.value) {
        return
    }
    yjsNodes.updateNodeDisplayMode(nodeId, displayMode as any)
}

function handleNodeContentMetadataChange(nodeId: string, key: string, value: unknown) {
    if (!canEditCanvas.value) {
        return
    }
    const node = canvasNodes.value.find(item => item.id === nodeId)
    if (!node?.content) return

    const nextValue = key === 'fontSize'
        ? Math.max(10, Math.min(48, Number(value) || 14))
        : value

    yjsNodes.updateNode(nodeId, {
        content: {
            ...node.content,
            metadata: {
                ...(node.content.metadata || {}),
                [key]: nextValue
            }
        }
    } as any)
}

function handleNodeZIndexChange(nodeId: string, action: 'top' | 'bottom' | 'up' | 'down') {
    if (!canEditCanvas.value) {
        return
    }
    const allZIndexes = canvasNodes.value.map(node => node.zIndex || 0)
    const currentNode = canvasNodes.value.find(node => node.id === nodeId)
    if (!currentNode) return

    const currentZ = currentNode.zIndex || 0
    let newZ = currentZ

    switch (action) {
        case 'top':
            newZ = Math.max(...allZIndexes, currentZ) + 1
            break
        case 'bottom':
            newZ = Math.min(...allZIndexes, currentZ) - 1
            break
        case 'up': {
            const higherZs = allZIndexes.filter(z => z > currentZ)
            newZ = higherZs.length > 0 ? Math.min(...higherZs) + 1 : currentZ + 1
            break
        }
        case 'down': {
            const lowerZs = allZIndexes.filter(z => z < currentZ)
            newZ = lowerZs.length > 0 ? Math.max(...lowerZs) - 1 : currentZ - 1
            break
        }
    }

    yjsNodes.updateNode(nodeId, { zIndex: newZ } as any)
}

function handleUndo() {
    if (!canEditCanvas.value) {
        return
    }
    yjsNodes.undo()
}

function handleRedo() {
    if (!canEditCanvas.value) {
        return
    }
    yjsNodes.redo()
}

function togglePanel() {
    isPanelCollapsed.value = !isPanelCollapsed.value
}

function updateCanvasAreaSize() {
    if (!canvasAreaRef.value) return
    canvasAreaSize.value = {
        width: canvasAreaRef.value.clientWidth || 0,
        height: canvasAreaRef.value.clientHeight || 0
    }
}

let canvasAreaResizeObserver: ResizeObserver | null = null
let themeObserver: MutationObserver | null = null

onMounted(() => {
    updateTheme()
    updateCanvasAreaSize()

    if (typeof ResizeObserver !== 'undefined' && canvasAreaRef.value) {
        canvasAreaResizeObserver = new ResizeObserver(() => {
            updateCanvasAreaSize()
        })
        canvasAreaResizeObserver.observe(canvasAreaRef.value)
    } else {
        window.addEventListener('resize', updateCanvasAreaSize)
    }

    themeObserver = new MutationObserver(updateTheme)
    themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    })
})

onUnmounted(() => {
    if (canvasAreaResizeObserver) {
        canvasAreaResizeObserver.disconnect()
        canvasAreaResizeObserver = null
    } else {
        window.removeEventListener('resize', updateCanvasAreaSize)
    }

    themeObserver?.disconnect()
    themeObserver = null
})
</script>

<style scoped>
.canvas-view {
    width: 100%;
    height: 100%;
    background: var(--canvas-bg);
    position: relative;
    overflow: hidden;
    transition: background-color 0.3s ease;
}

.canvas-area {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
    background: var(--canvas-bg);
    isolation: isolate;
}

.canvas-state {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    z-index: 200;
}

.canvas-state-card {
    min-width: 280px;
    max-width: 420px;
    padding: 24px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-lg);
    text-align: center;
}

html[data-theme='dark'] .canvas-state-card {
    background: rgba(24, 24, 24, 0.92);
}

.canvas-state-title {
    color: var(--text-primary);
    font-size: 16px;
    font-weight: 600;
}

.canvas-state-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-top: 16px;
}

.canvas-state-btn {
    padding: 10px 18px;
    border: none;
    border-radius: 10px;
    background: var(--color-primary);
    color: #fff;
    cursor: pointer;
}

.canvas-state-btn.secondary {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
}

@media (max-width: 768px) {
}
</style>
