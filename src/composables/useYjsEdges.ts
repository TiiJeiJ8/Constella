import { ref, onUnmounted } from 'vue'
import * as Y from 'yjs'

/**
 * 连线类型
 */
export type EdgeType = 'straight' | 'bezier' | 'step'

/**
 * 箭头类型
 */
export type ArrowType = 'none' | 'arrow' | 'diamond' | 'circle'

/**
 * 连线数据结构
 */
export interface CanvasEdge {
    id: string
    sourceId: string           // 起始节点 ID
    targetId: string           // 目标节点 ID
    sourceAnchor?: string      // 起始锚点 (top, right, bottom, left, center)
    targetAnchor?: string      // 目标锚点
    type: EdgeType             // 连线类型
    color: string              // 颜色
    strokeWidth: number        // 线宽
    dashArray?: number[]       // 虚线数组 [线长, 间隔]
    startArrow: ArrowType      // 起始箭头
    endArrow: ArrowType        // 结束箭头
    label?: string             // 标签文本
    labelPosition?: number     // 标签位置 (0-1)
    zIndex?: number            // 层级
}

/**
 * 渲染用的连线数据
 */
export interface RenderEdge extends CanvasEdge {
    // 计算后的坐标点
    points: number[]
    // 贝塞尔控制点
    controlPoints?: number[]
}

interface UseYjsEdgesOptions {
    getDoc: () => Y.Doc | null
    onEdgesChange?: (edges: RenderEdge[]) => void
}

/**
 * Yjs 连线同步 Composable
 */
export function useYjsEdges(options: UseYjsEdgesOptions) {
    const { getDoc, onEdgesChange } = options

    const edges = ref<RenderEdge[]>([])
    let edgesMap: Y.Map<Y.Map<any>> | null = null
    let observer: ((event: any) => void) | null = null
    let doc: Y.Doc | null = null

    /**
     * 初始化
     */
    function initialize() {
        doc = getDoc()
        if (!doc) {
            console.warn('[useYjsEdges] Doc not available')
            return
        }

        edgesMap = doc.getMap('edges')

        // 监听变化
        observer = () => syncFromYjs()
        edgesMap.observeDeep(observer)

        // 初始同步
        syncFromYjs()

        console.log('[useYjsEdges] Initialized with', edges.value.length, 'edges')
    }

    /**
     * 从 Yjs 同步连线数据
     */
    function syncFromYjs() {
        if (!edgesMap) return

        const newEdges: RenderEdge[] = []

        edgesMap.forEach((yEdge, edgeId) => {
            if (yEdge instanceof Y.Map) {
                const edge: CanvasEdge = {
                    id: edgeId,
                    sourceId: yEdge.get('sourceId') || '',
                    targetId: yEdge.get('targetId') || '',
                    sourceAnchor: yEdge.get('sourceAnchor') || 'center',
                    targetAnchor: yEdge.get('targetAnchor') || 'center',
                    type: yEdge.get('type') || 'bezier',
                    color: yEdge.get('color') || '#667eea',
                    strokeWidth: yEdge.get('strokeWidth') || 2,
                    dashArray: yEdge.get('dashArray'),
                    startArrow: yEdge.get('startArrow') || 'none',
                    endArrow: yEdge.get('endArrow') || 'arrow',
                    label: yEdge.get('label'),
                    labelPosition: yEdge.get('labelPosition') ?? 0.5,
                    zIndex: yEdge.get('zIndex') ?? 0
                }

                newEdges.push({
                    ...edge,
                    points: [],  // 将在渲染时计算
                    controlPoints: []
                })
            }
        })

        edges.value = newEdges

        if (onEdgesChange) {
            onEdgesChange(newEdges)
        }
    }

    /**
     * 创建连线
     */
    function createEdge(edge: Omit<CanvasEdge, 'id'> & { id?: string }): string {
        if (!doc || !edgesMap) {
            console.warn('[useYjsEdges] Cannot create edge: not initialized')
            return ''
        }

        const edgeId = edge.id || `edge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

        doc.transact(() => {
            const yEdge = new Y.Map()
            yEdge.set('sourceId', edge.sourceId)
            yEdge.set('targetId', edge.targetId)
            yEdge.set('sourceAnchor', edge.sourceAnchor || 'center')
            yEdge.set('targetAnchor', edge.targetAnchor || 'center')
            yEdge.set('type', edge.type)
            yEdge.set('color', edge.color)
            yEdge.set('strokeWidth', edge.strokeWidth)
            if (edge.dashArray) yEdge.set('dashArray', edge.dashArray)
            yEdge.set('startArrow', edge.startArrow)
            yEdge.set('endArrow', edge.endArrow)
            if (edge.label) yEdge.set('label', edge.label)
            yEdge.set('labelPosition', edge.labelPosition ?? 0.5)
            yEdge.set('zIndex', edge.zIndex ?? 0)

            edgesMap!.set(edgeId, yEdge)
        })

        console.log('[useYjsEdges] Created edge:', edgeId)
        return edgeId
    }

    /**
     * 更新连线
     */
    function updateEdge(edgeId: string, updates: Partial<CanvasEdge>) {
        if (!doc || !edgesMap) return

        const yEdge = edgesMap.get(edgeId)
        if (yEdge && yEdge instanceof Y.Map) {
            doc.transact(() => {
                Object.entries(updates).forEach(([key, value]) => {
                    if (key !== 'id' && value !== undefined) {
                        yEdge.set(key, value)
                    }
                })
            })
            console.log('[useYjsEdges] Updated edge:', edgeId, updates)
        }
    }

    /**
     * 删除连线
     */
    function deleteEdge(edgeId: string) {
        if (!edgesMap) return

        if (edgesMap.has(edgeId)) {
            edgesMap.delete(edgeId)
            console.log('[useYjsEdges] Deleted edge:', edgeId)
        }
    }

    /**
     * 删除多条连线
     */
    function deleteEdges(edgeIds: string[]) {
        if (!doc || !edgesMap) return

        doc.transact(() => {
            edgeIds.forEach(id => {
                if (edgesMap!.has(id)) {
                    edgesMap!.delete(id)
                }
            })
        })
        console.log('[useYjsEdges] Deleted edges:', edgeIds)
    }

    /**
     * 删除与节点相关的所有连线
     */
    function deleteEdgesByNode(nodeId: string) {
        if (!doc || !edgesMap) return

        const idsToDelete: string[] = []

        edgesMap.forEach((yEdge, edgeId) => {
            if (yEdge instanceof Y.Map) {
                if (yEdge.get('sourceId') === nodeId || yEdge.get('targetId') === nodeId) {
                    idsToDelete.push(edgeId)
                }
            }
        })

        if (idsToDelete.length > 0) {
            deleteEdges(idsToDelete)
        }
    }

    /**
     * 获取连线
     */
    function getEdge(edgeId: string): RenderEdge | undefined {
        return edges.value.find(e => e.id === edgeId)
    }

    /**
     * 获取节点的所有连线
     */
    function getEdgesByNode(nodeId: string): RenderEdge[] {
        return edges.value.filter(e => e.sourceId === nodeId || e.targetId === nodeId)
    }

    /**
     * 销毁
     */
    function destroy() {
        if (edgesMap && observer) {
            edgesMap.unobserveDeep(observer)
        }
        edgesMap = null
        observer = null
        doc = null
        edges.value = []
    }

    onUnmounted(() => {
        destroy()
    })

    return {
        edges,
        edgesMap: () => edgesMap,
        initialize,
        createEdge,
        updateEdge,
        deleteEdge,
        deleteEdges,
        deleteEdgesByNode,
        getEdge,
        getEdgesByNode,
        destroy
    }
}
