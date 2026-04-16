import * as Y from 'yjs'
import { ref, type ComputedRef, type Ref } from 'vue'
import { exportCanvas } from '@/utils/canvasExport'

interface PointLike {
    x: number
    y: number
}

interface NodeLike {
    id: string
    x: number
    y: number
    width: number
    height: number
    content?: any
    zIndex?: number
    rectConfig?: {
        fill?: string
        stroke?: string
    }
}

interface EdgeLike {
    id?: string
    sourceId: string
    targetId: string
    sourceAnchor?: string
    targetAnchor?: string
    type?: string
    color?: string
    strokeWidth?: number
    dashArray?: number[]
    startArrow?: string
    endArrow?: string
    label?: string
    labelPosition?: number
    zIndex?: number
}

interface UseCanvasImportExportOptions {
    roomName: Ref<string>
    canvasNodes: ComputedRef<NodeLike[]>
    canvasEdges: ComputedRef<EdgeLike[]>
    canvasStageRef: Ref<any>
    stagePosition: Ref<PointLike>
    stageScale: Ref<number>
    yjs: { doc: Y.Doc | null }
    yjsNodes: any
    yjsEdges: any
    canEditCanvas?: Ref<boolean>
    canManageSnapshots?: Ref<boolean>
    t: (key: string, params?: Record<string, unknown>) => string
    toast: { success: (message: string) => void; error: (message: string) => void }
}

export function useCanvasImportExport(options: UseCanvasImportExportOptions) {
    const {
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
    } = options

    const roomSnapshots = ref<any[]>([])

    function handleSnapshotCreate(snapshotData: any) {
        if (canEditCanvas && !canEditCanvas.value) {
            toast.error(t('canvas.permissionDenied'))
            return
        }
        const snapshot = {
            ...snapshotData,
            state: {
                nodes: JSON.parse(JSON.stringify(canvasNodes.value)),
                edges: JSON.parse(JSON.stringify(canvasEdges.value))
            }
        }

        roomSnapshots.value.push(snapshot)

        if (roomSnapshots.value.length > 50) {
            const autoSnapshots = roomSnapshots.value.filter(item => item.auto)
            if (autoSnapshots.length > 0) {
                const oldestAuto = autoSnapshots[0]
                const index = roomSnapshots.value.findIndex(item => item.id === oldestAuto.id)
                if (index !== -1) {
                    roomSnapshots.value.splice(index, 1)
                }
            }
        }

        if (!snapshotData.auto && snapshotData.silentToast !== true) {
            toast.success(t('canvas.toast.snapshotCreated'))
        }
    }

    function handleSnapshotRestore(snapshot: any) {
        if (canManageSnapshots && !canManageSnapshots.value) {
            toast.error(t('canvas.permissionDenied'))
            return
        }
        if (!snapshot.state) {
            console.warn('[Canvas] Snapshot has no state data')
            return
        }

        const doc = yjs.doc
        if (!doc) {
            console.warn('[Canvas] Doc not available')
            return
        }

        const { nodes, edges } = snapshot.state

        doc.transact(() => {
            const nodesMap = doc.getMap('nodes')
            const edgesMap = doc.getMap('edges')

            nodesMap.forEach((_, id) => nodesMap.delete(id))
            edgesMap.forEach((_, id) => edgesMap.delete(id))

            nodes.forEach((node: NodeLike) => {
                const yNode = new Y.Map()
                yNode.set('x', node.x)
                yNode.set('y', node.y)
                yNode.set('width', node.width)
                yNode.set('height', node.height)
                yNode.set('fill', node.rectConfig?.fill || '#667eea')
                yNode.set('stroke', node.rectConfig?.stroke || '#5568d3')
                yNode.set('zIndex', node.zIndex ?? 0)

                if (node.content) {
                    const yContent = new Y.Map()
                    yContent.set('kind', node.content.kind || 'blank')
                    yContent.set('data', node.content.data || '')
                    if (node.content.displayMode) yContent.set('displayMode', node.content.displayMode)
                    if (node.content.metadata) yContent.set('metadata', node.content.metadata)
                    yNode.set('content', yContent)
                }

                nodesMap.set(node.id, yNode)
            })

            edges.forEach((edge: EdgeLike) => {
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

                edgesMap.set(edge.id || `edge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, yEdge)
            })
        })

        toast.success(t('canvas.toast.snapshotRestored'))
    }

    function handleSnapshotDelete(snapshotId: string) {
        if (canManageSnapshots && !canManageSnapshots.value) {
            toast.error(t('canvas.permissionDenied'))
            return
        }
        const index = roomSnapshots.value.findIndex(snapshot => snapshot.id === snapshotId)
        if (index !== -1) {
            roomSnapshots.value.splice(index, 1)
        }
    }

    function handleTopBarSnapshot() {
        handleSnapshotCreate({
            id: `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: `${t('canvas.history.snapshot')} ${new Date().toLocaleTimeString(localStorage.getItem('locale') === 'zh-CN' ? 'zh-CN' : 'en-US')}`,
            createdAt: new Date().toISOString(),
            auto: false,
            silentToast: true
        })
    }

    async function handleExport(options: { format: 'json' | 'png' | 'svg' }) {
        try {
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
                const link = document.createElement('a')
                link.href = url
                link.download = `${roomName.value}-${Date.now()}.constella.json`
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                URL.revokeObjectURL(url)

                toast.success(t('canvas.toast.exportSuccess', { format: 'JSON' }))
                return
            }

            const stage = canvasStageRef.value?.getStage?.()
            await exportCanvas(stage, canvasNodes.value, canvasEdges.value, {
                format: options.format,
                filename: `${roomName.value}-${Date.now()}`,
                scale: options.format === 'png' ? 2 : 1,
                backgroundColor: '#ffffff',
                padding: 40
            })

            toast.success(t('canvas.toast.exportSuccess', { format: options.format.toUpperCase() }))
        } catch (error) {
            console.error('[Canvas] Export failed:', error)
            toast.error(t('canvas.toast.exportFailed'))
        }
    }

    function handleImport(data: any) {
        try {
            if (canEditCanvas && !canEditCanvas.value) {
                toast.error(t('canvas.permissionDenied'))
                return
            }
            if (!data || typeof data !== 'object') {
                toast.error(t('canvas.topBar.importError'))
                return
            }

            const nodes = data.nodes || []
            const edges = data.edges || []
            if (!Array.isArray(nodes)) {
                toast.error(t('canvas.topBar.importError'))
                return
            }

            if (nodes.length === 0) {
                toast.success(t('canvas.topBar.importSuccess'))
                return
            }

            const idMap = new Map<string, string>()
            let minX = Infinity
            let minY = Infinity

            nodes.forEach((node: NodeLike) => {
                minX = Math.min(minX, node.x)
                minY = Math.min(minY, node.y)
            })

            const viewportCenter = {
                x: (window.innerWidth / 2 - stagePosition.value.x) / stageScale.value,
                y: (window.innerHeight / 2 - stagePosition.value.y) / stageScale.value
            }

            const offsetX = viewportCenter.x - minX
            const offsetY = viewportCenter.y - minY

            nodes.forEach((node: NodeLike) => {
                const newId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
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

            edges.forEach((edge: EdgeLike) => {
                const newSourceId = idMap.get(edge.sourceId)
                const newTargetId = idMap.get(edge.targetId)

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
        } catch (error) {
            console.error('[Canvas] Import failed:', error)
            toast.error(t('canvas.topBar.importError'))
        }
    }

    return {
        roomSnapshots,
        handleSnapshotCreate,
        handleSnapshotRestore,
        handleSnapshotDelete,
        handleTopBarSnapshot,
        handleExport,
        handleImport
    }
}

