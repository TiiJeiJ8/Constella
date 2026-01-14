import { ref } from 'vue'
import * as Y from 'yjs'
import type { ContentKind, NodeContent, DisplayMode } from '../plugins'

// 重新导出类型
export type { NodeContent, ContentKind, DisplayMode }

/**
 * 节点数据结构（与 Yjs 同步）
 */
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
    zIndex?: number  // 图层（数字越大越在上面）
}

/**
 * 渲染用的节点结构（包含 Konva 配置）
 */
export interface RenderNode {
    id: string
    x: number
    y: number
    width: number
    height: number
    content: NodeContent
    zIndex: number  // 图层
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
    /**
     * 额外需要 UndoManager 跟踪的 Y.Map（如 edges）
     */
    additionalTrackedMaps?: () => Y.Map<any>[]
}

/**
 * Yjs 节点同步 Composable
 * 管理节点数据与 Yjs Y.Map 的双向绑定
 */
export function useYjsNodes(options: UseYjsNodesOptions) {
    const { getDoc, onNodesChange, additionalTrackedMaps } = options

    // 本地节点状态（用于渲染）
    const nodes = ref<RenderNode[]>([])

    // 是否已初始化
    const isInitialized = ref(false)

    // Undo/Redo 状态
    const canUndo = ref(false)
    const canRedo = ref(false)

    // 缓存的 doc 和 nodesMap
    let doc: Y.Doc | null = null
    let nodesMap: Y.Map<any> | null = null
    let undoManager: Y.UndoManager | null = null

    /**
     * 将 CanvasNode 转换为 RenderNode
     */
    function toRenderNode(node: CanvasNode): RenderNode {
        return {
            id: node.id,
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height,
            content: node.content,
            zIndex: node.zIndex ?? 0,
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

    /**
     * 将 Y.Map 格式的 content 转换为普通对象
     */
    function convertYMapContent(yContent: Y.Map<any>): NodeContent {
        const kind = yContent.get('kind') || 'blank'
        const data = yContent.get('data') || ''
        const displayMode = yContent.get('displayMode')
        const metadata = yContent.get('metadata')
        
        const content: NodeContent = { kind, data }
        if (displayMode) content.displayMode = displayMode
        if (metadata) content.metadata = metadata
        
        return content
    }

    /**
     * 从 Y.Map 读取节点并转换为渲染格式
     */
    function syncFromYjs() {
        if (!nodesMap) return

        const newNodes: RenderNode[] = []

        nodesMap.forEach((yNode, nodeId) => {
            if (yNode instanceof Y.Map) {
                // 读取 content，兼容多种格式
                let content: NodeContent
                const rawContent = yNode.get('content')
                
                if (!rawContent) {
                    // 兼容旧的 text 字段，转为 markdown
                    const text = yNode.get('text')
                    if (text) {
                        content = { kind: 'markdown', data: text }
                    } else {
                        content = { kind: 'blank', data: '' }
                    }
                } else if (rawContent instanceof Y.Map) {
                    // content 是 Y.Map（快照恢复后的格式）
                    content = convertYMapContent(rawContent)
                } else if (typeof rawContent === 'object' && rawContent !== null) {
                    // content 是普通对象
                    content = {
                        kind: rawContent.kind || 'blank',
                        data: rawContent.data || ''
                    }
                    if (rawContent.displayMode) content.displayMode = rawContent.displayMode
                    if (rawContent.metadata) content.metadata = rawContent.metadata
                } else {
                    // 兜底处理
                    content = { kind: 'blank', data: '' }
                }

                const node: CanvasNode = {
                    id: nodeId,
                    x: yNode.get('x') || 0,
                    y: yNode.get('y') || 0,
                    width: yNode.get('width') || 150,
                    height: yNode.get('height') || 100,
                    fill: yNode.get('fill') || '#667eea',
                    stroke: yNode.get('stroke') || '#5568d3',
                    content: content,
                    rotation: yNode.get('rotation'),
                    scaleX: yNode.get('scaleX'),
                    scaleY: yNode.get('scaleY'),
                    zIndex: yNode.get('zIndex') ?? 0
                }
                newNodes.push(toRenderNode(node))
            }
        })

        nodes.value = newNodes
        console.log('[useYjsNodes] Synced from Yjs:', newNodes.length, 'nodes')

        if (onNodesChange) {
            onNodesChange(newNodes)
        }
    }

    /**
     * 监听 Yjs 变化
     */
    function observeYjs() {
        if (!nodesMap) return

        nodesMap.observeDeep((events) => {
            console.log('[useYjsNodes] Y.Map changed:', events.length, 'events')
            syncFromYjs()
        })
    }

    /**
     * 初始化：如果没有节点，创建示例节点
     */
    function initialize() {
        if (isInitialized.value) {
            // 已初始化,但仍需同步一次(防止初始化时数据未就绪)
            syncFromYjs()
            return
        }

        // 获取 doc
        doc = getDoc()
        if (!doc) {
            console.warn('[useYjsNodes] Doc not available, skipping initialization')
            return
        }

        nodesMap = doc.getMap<Y.Map<any>>('nodes')
        isInitialized.value = true

        // 获取额外需要跟踪的 Y.Map
        const trackedMaps: Y.Map<any>[] = [nodesMap]
        if (additionalTrackedMaps) {
            const additional = additionalTrackedMaps()
            trackedMaps.push(...additional)
        }

        // 创建 UndoManager，跟踪所有 Map（节点和连线）
        undoManager = new Y.UndoManager(trackedMaps, {
            // 500ms 内的操作合并为一个 undo 步骤
            captureTimeout: 500
        })

        // 监听 UndoManager 状态变化
        undoManager.on('stack-item-added', updateUndoRedoState)
        undoManager.on('stack-item-popped', updateUndoRedoState)
        undoManager.on('stack-cleared', updateUndoRedoState)

        // 监听 Yjs 变化
        observeYjs()

        // 如果 Y.Map 为空，创建示例节点
        if (nodesMap.size === 0) {
            console.log('[useYjsNodes] Initializing with sample nodes')
            doc.transact(() => {
                // 创建示例空白节点
                createNode({
                    id: 'node-1',
                    x: 100,
                    y: 100,
                    width: 180,
                    height: 120,
                    fill: '#667eea',
                    stroke: '#5568d3',
                    content: { kind: 'blank', data: '' }
                })
                createNode({
                    id: 'node-2',
                    x: 350,
                    y: 200,
                    width: 180,
                    height: 120,
                    fill: '#48bb78',
                    stroke: '#38a169',
                    content: { kind: 'blank', data: '' }
                })
            })
        } else {
            // 从 Yjs 同步现有节点
            syncFromYjs()
        }
    }

    /**
     * 创建新节点
     */
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

        nodesMap.set(node.id, yNode)
        console.log('[useYjsNodes] Created node:', node.id)
    }

    /**
     * 更新节点位置
     */
    function updateNodePosition(nodeId: string, x: number, y: number) {
        if (!doc || !nodesMap) return

        const yNode = nodesMap.get(nodeId)
        if (yNode && yNode instanceof Y.Map) {
            doc.transact(() => {
                yNode.set('x', x)
                yNode.set('y', y)
            })
            console.log('[useYjsNodes] Updated position:', nodeId, { x, y })
        }
    }

    /**
     * 更新节点属性
     */
    function updateNode(nodeId: string, updates: Partial<CanvasNode>) {
        if (!doc || !nodesMap) return

        const yNode = nodesMap.get(nodeId)
        if (yNode && yNode instanceof Y.Map) {
            doc.transact(() => {
                Object.entries(updates).forEach(([key, value]) => {
                    if (key !== 'id' && value !== undefined) {
                        yNode.set(key, value)
                    }
                })
            })
            console.log('[useYjsNodes] Updated node:', nodeId, updates)
        }
    }

    /**
     * 删除节点
     */
    function deleteNode(nodeId: string) {
        if (!nodesMap) return

        if (nodesMap.has(nodeId)) {
            nodesMap.delete(nodeId)
            console.log('[useYjsNodes] Deleted node:', nodeId)
        }
    }

    /**
     * 删除多个节点
     */
    function deleteNodes(nodeIds: string[]) {
        if (!doc || !nodesMap) return

        doc.transact(() => {
            nodeIds.forEach(id => {
                if (nodesMap!.has(id)) {
                    nodesMap!.delete(id)
                }
            })
        })
        console.log('[useYjsNodes] Deleted nodes:', nodeIds)
    }

    /**
     * 获取节点
     */
    function getNode(nodeId: string): RenderNode | undefined {
        return nodes.value.find(n => n.id === nodeId)
    }

    /**
     * 更新节点内容
     */
    function updateNodeContent(nodeId: string, data: string) {
        if (!doc || !nodesMap) return

        const yNode = nodesMap.get(nodeId)
        if (yNode && yNode instanceof Y.Map) {
            const content = yNode.get('content') || { kind: 'blank', data: '' }
            doc.transact(() => {
                yNode.set('content', { ...content, data })
            })
            console.log('[useYjsNodes] Updated content:', nodeId)
        }
    }

    /**
     * 更新节点类型（更改 content.kind）
     */
    function updateNodeKind(nodeId: string, kind: ContentKind) {
        if (!doc || !nodesMap) return

        const yNode = nodesMap.get(nodeId)
        if (yNode && yNode instanceof Y.Map) {
            const content = yNode.get('content') || { kind: 'blank', data: '' }
            doc.transact(() => {
                yNode.set('content', { ...content, kind })
            })
            console.log('[useYjsNodes] Updated kind:', nodeId, '->', kind)
        }
    }

    /**
     * 更新节点显示模式（全文/卡片）
     */
    function updateNodeDisplayMode(nodeId: string, displayMode: DisplayMode) {
        if (!doc || !nodesMap) return

        const yNode = nodesMap.get(nodeId)
        if (yNode && yNode instanceof Y.Map) {
            const content = yNode.get('content') || { kind: 'blank', data: '' }
            doc.transact(() => {
                yNode.set('content', { ...content, displayMode })
            })
            console.log('[useYjsNodes] Updated displayMode:', nodeId, '->', displayMode)
        }
    }

    /**
     * 更新 Undo/Redo 状态
     */
    function updateUndoRedoState() {
        if (undoManager) {
            canUndo.value = undoManager.undoStack.length > 0
            canRedo.value = undoManager.redoStack.length > 0
        }
    }

    /**
     * 撤销
     */
    function undo() {
        if (undoManager && canUndo.value) {
            undoManager.undo()
            console.log('[useYjsNodes] Undo')
        }
    }

    /**
     * 重做
     */
    function redo() {
        if (undoManager && canRedo.value) {
            undoManager.redo()
            console.log('[useYjsNodes] Redo')
        }
    }

    return {
        nodes,
        nodesMap,
        isInitialized,
        canUndo,
        canRedo,
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
        undo,
        redo
    }
}
