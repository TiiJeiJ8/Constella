import { ref, onUnmounted } from 'vue'
import * as Y from 'yjs'
import type { ContentKind, NodeContent, DisplayMode } from '../plugins'

export type { NodeContent, ContentKind, DisplayMode }

export interface CanvasNode {
    id: string
    x: number
    y: number
    width: number
    height: number
    fill: string
    stroke: string
    content: NodeContent
    rotation?: number
    scaleX?: number
    scaleY?: number
    zIndex?: number
}

export interface RenderNode {
    id: string
    x: number
    y: number
    width: number
    height: number
    content: NodeContent
    zIndex: number
    rotation: number
    rectConfig: {
        x: number
        y: number
        width: number
        height: number
        fill: string
        stroke: string
        strokeWidth: number
        cornerRadius: number
        shadowColor: string
        shadowBlur: number
        shadowOffset: { x: number; y: number }
    }
}

interface UseYjsNodesOptions {
    getDoc: () => Y.Doc | null
    onNodesChange?: (nodes: RenderNode[]) => void
    additionalTrackedMaps?: () => Y.Map<any>[]
}

export function useYjsNodes(options: UseYjsNodesOptions) {
    const { getDoc, onNodesChange, additionalTrackedMaps } = options

    const nodes = ref<RenderNode[]>([])
    const isInitialized = ref(false)
    const canUndo = ref(false)
    const canRedo = ref(false)
    const syncTick = ref(0)

    let doc: Y.Doc | null = null
    let nodesMap: Y.Map<Y.Map<any>> | null = null
    let undoManager: Y.UndoManager | null = null
    let observer: (() => void) | null = null
    let syncRafId: number | null = null
    let isSyncScheduled = false

    function scheduleSyncFromYjs() {
        if (isSyncScheduled) return
        isSyncScheduled = true

        const run = () => {
            isSyncScheduled = false
            syncRafId = null
            syncFromYjs()
        }

        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
            syncRafId = window.requestAnimationFrame(run)
        } else {
            Promise.resolve().then(run)
        }
    }

    function toRenderNode(node: CanvasNode): RenderNode {
        return {
            id: node.id,
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height,
            content: node.content,
            zIndex: node.zIndex ?? 0,
            rotation: node.rotation ?? 0,
            rectConfig: {
                x: 0,
                y: 0,
                width: node.width,
                height: node.height,
                fill: node.fill,
                stroke: node.stroke,
                strokeWidth: 2,
                cornerRadius: 8,
                shadowColor: 'rgba(0,0,0,0.2)',
                shadowBlur: 10,
                shadowOffset: { x: 0, y: 2 }
            }
        }
    }

    function normalizeContent(rawContent: unknown, yNode: Y.Map<any>): NodeContent {
        if (!rawContent) {
            const text = yNode.get('text')
            return text ? { kind: 'markdown', data: text } : { kind: 'blank', data: '' }
        }

        if (rawContent instanceof Y.Map) {
            const content: NodeContent = {
                kind: rawContent.get('kind') || 'blank',
                data: rawContent.get('data') || ''
            }

            const displayMode = rawContent.get('displayMode')
            const metadata = rawContent.get('metadata')
            if (displayMode) content.displayMode = displayMode
            if (metadata) content.metadata = metadata
            return content
        }

        if (typeof rawContent === 'object' && rawContent !== null) {
            const plain = rawContent as NodeContent
            return {
                kind: plain.kind || 'blank',
                data: plain.data || '',
                ...(plain.displayMode ? { displayMode: plain.displayMode } : {}),
                ...(plain.metadata ? { metadata: plain.metadata } : {})
            }
        }

        return { kind: 'blank', data: '' }
    }

    function createTrackedMaps(): Y.Map<any>[] {
        const trackedMaps: Y.Map<any>[] = []

        if (nodesMap) {
            trackedMaps.push(nodesMap)
        }

        if (additionalTrackedMaps) {
            const additional = additionalTrackedMaps().filter(Boolean)
            trackedMaps.push(...additional)
        }

        return trackedMaps
    }

    function updateUndoRedoState() {
        if (!undoManager) {
            canUndo.value = false
            canRedo.value = false
            return
        }

        canUndo.value = undoManager.undoStack.length > 0
        canRedo.value = undoManager.redoStack.length > 0
    }

    function setupUndoManager() {
        const trackedMaps = createTrackedMaps()
        if (trackedMaps.length === 0) return

        if (undoManager) {
            undoManager.destroy()
        }

        undoManager = new Y.UndoManager(trackedMaps, {
            captureTimeout: 500
        })

        undoManager.on('stack-item-added', updateUndoRedoState)
        undoManager.on('stack-item-popped', updateUndoRedoState)
        undoManager.on('stack-cleared', updateUndoRedoState)
        updateUndoRedoState()
    }

    function syncFromYjs() {
        if (!nodesMap) return

        const nextNodes: RenderNode[] = []

        nodesMap.forEach((yNode, nodeId) => {
            if (!(yNode instanceof Y.Map)) return

            const node: CanvasNode = {
                id: nodeId,
                x: yNode.get('x') || 0,
                y: yNode.get('y') || 0,
                width: yNode.get('width') || 150,
                height: yNode.get('height') || 100,
                fill: yNode.get('fill') || '#667eea',
                stroke: yNode.get('stroke') || '#5568d3',
                content: normalizeContent(yNode.get('content'), yNode),
                rotation: yNode.get('rotation'),
                scaleX: yNode.get('scaleX'),
                scaleY: yNode.get('scaleY'),
                zIndex: yNode.get('zIndex') ?? 0
            }

            nextNodes.push(toRenderNode(node))
        })

        nodes.value = nextNodes
        syncTick.value += 1
        onNodesChange?.(nextNodes)
    }

    function observeYjs() {
        if (!nodesMap) return

        observer = () => {
            scheduleSyncFromYjs()
        }

        nodesMap.observeDeep(observer)
    }

    function initialize() {
        if (isInitialized.value) {
            setupUndoManager()
            syncFromYjs()
            return
        }

        doc = getDoc()
        if (!doc) {
            console.warn('[useYjsNodes] Doc not available, skipping initialization')
            return
        }

        nodesMap = doc.getMap<Y.Map<any>>('nodes')
        isInitialized.value = true

        setupUndoManager()
        observeYjs()
        syncFromYjs()
    }

    function createNode(node: CanvasNode) {
        if (!nodesMap) return

        const yNode = new Y.Map()
        yNode.set('x', node.x)
        yNode.set('y', node.y)
        yNode.set('width', node.width)
        yNode.set('height', node.height)
        yNode.set('fill', node.fill)
        yNode.set('stroke', node.stroke)
        yNode.set('content', node.content)
        if (node.rotation !== undefined) yNode.set('rotation', node.rotation)
        if (node.scaleX !== undefined) yNode.set('scaleX', node.scaleX)
        if (node.scaleY !== undefined) yNode.set('scaleY', node.scaleY)
        if (node.zIndex !== undefined) yNode.set('zIndex', node.zIndex)

        nodesMap.set(node.id, yNode)
    }

    function updateNodePosition(nodeId: string, x: number, y: number) {
        if (!doc || !nodesMap) return

        const yNode = nodesMap.get(nodeId)
        if (!(yNode instanceof Y.Map)) return

        doc.transact(() => {
            yNode.set('x', x)
            yNode.set('y', y)
        })
    }

    function updateNode(nodeId: string, updates: Partial<CanvasNode>) {
        if (!doc || !nodesMap) return

        const yNode = nodesMap.get(nodeId)
        if (!(yNode instanceof Y.Map)) return

        doc.transact(() => {
            Object.entries(updates).forEach(([key, value]) => {
                if (key !== 'id' && !key.startsWith('_') && value !== undefined) {
                    yNode.set(key, value)
                }
            })
        })
    }

    function updateNodeContent(nodeId: string, data: string) {
        if (!doc || !nodesMap) return

        const yNode = nodesMap.get(nodeId)
        if (!(yNode instanceof Y.Map)) return

        const content = normalizeContent(yNode.get('content'), yNode)
        doc.transact(() => {
            yNode.set('content', { ...content, data })
        })
    }

    function updateNodeKind(nodeId: string, kind: ContentKind) {
        if (!doc || !nodesMap) return

        const yNode = nodesMap.get(nodeId)
        if (!(yNode instanceof Y.Map)) return

        const content = normalizeContent(yNode.get('content'), yNode)
        doc.transact(() => {
            yNode.set('content', { ...content, kind })
        })
    }

    function updateNodeDisplayMode(nodeId: string, displayMode: DisplayMode) {
        if (!doc || !nodesMap) return

        const yNode = nodesMap.get(nodeId)
        if (!(yNode instanceof Y.Map)) return

        const content = normalizeContent(yNode.get('content'), yNode)
        doc.transact(() => {
            yNode.set('content', { ...content, displayMode })
        })
    }

    function deleteNode(nodeId: string) {
        if (!nodesMap) return
        if (nodesMap.has(nodeId)) {
            nodesMap.delete(nodeId)
        }
    }

    function deleteNodes(nodeIds: string[]) {
        if (!doc || !nodesMap) return

        doc.transact(() => {
            nodeIds.forEach((id) => {
                if (nodesMap!.has(id)) {
                    nodesMap!.delete(id)
                }
            })
        })
    }

    function getNode(nodeId: string): RenderNode | undefined {
        return nodes.value.find((node) => node.id === nodeId)
    }

    function undo() {
        if (undoManager && canUndo.value) {
            undoManager.undo()
            updateUndoRedoState()
        }
    }

    function redo() {
        if (undoManager && canRedo.value) {
            undoManager.redo()
            updateUndoRedoState()
        }
    }

    function destroy() {
        if (nodesMap && observer) {
            nodesMap.unobserveDeep(observer)
        }

        if (syncRafId !== null && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
            window.cancelAnimationFrame(syncRafId)
        }

        if (undoManager) {
            undoManager.destroy()
        }

        observer = null
        syncRafId = null
        isSyncScheduled = false
        undoManager = null
        nodesMap = null
        doc = null
    }

    onUnmounted(() => {
        destroy()
    })

    return {
        nodes,
        nodesMap,
        isInitialized,
        canUndo,
        canRedo,
        syncTick,
        initialize,
        createNode,
        updateNodePosition,
        updateNode,
        updateNodeContent,
        updateNodeKind,
        updateNodeDisplayMode,
        deleteNode,
        deleteNodes,
        getNode,
        syncFromYjs,
        destroy,
        undo,
        redo
    }
}
